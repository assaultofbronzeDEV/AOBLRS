// Client for Party rooms hosted by the Cloudflare Worker (see /worker/index.ts).
//
// The GM creates a temporary room and gets a 6-character code. Players join
// with that code. Everyone connects over a WebSocket; the room relays each
// owner's hero snapshot to the rest of the party. The mini sheets other people
// see are always the owner's real hero sheet - nobody else can change them.

import AsyncStorage from "@react-native-async-storage/async-storage";
import { Platform } from "react-native";
import { onCharacterSaved } from "@/src/storage/characters";
import { migrateCharacter, type Character } from "@/src/types";
import {
  PARTY_HEARTBEAT_INTERVAL_MS,
  PARTY_HEARTBEAT_TIMEOUT_MS,
  PARTY_MAX_PORTRAIT_CHARS,
  PARTY_PORTRAIT_PATTERN,
  PARTY_PROTOCOL_VERSION,
  isValidRoomCode,
  type PartyMessage,
  type PeerInfo,
} from "./protocol";

export type PartyRole = "idle" | "host" | "client";

export type PartyState = {
  role: PartyRole;
  connecting: boolean;
  connected: boolean;
  reconnecting: boolean;
  error: string | null;
  roomCode: string | null;
  peers: PeerInfo[]; // includes self
  sharedHeroes: Character[];
  selectedCharacterIds: string[];
  rollNotes: Record<string, string>;
};

const initialState: PartyState = {
  role: "idle",
  connecting: false,
  connected: false,
  reconnecting: false,
  error: null,
  roomCode: null,
  peers: [],
  sharedHeroes: [],
  selectedCharacterIds: [],
  rollNotes: {},
};

type Listener = (state: PartyState) => void;

type StoredSession = {
  role: "host" | "client";
  code: string;
  name: string;
  gmToken?: string;
  peerId?: string;
  secret?: string;
  selectedCharacterIds?: string[];
};

const SESSION_KEY = "aob:party:session:v1";
const PUBLISH_DEBOUNCE_MS = 150;
const RECONNECT_DELAYS_MS = [500, 1000, 2000, 4000, 8000, 15000];
const MAX_RECONNECT_ATTEMPTS = 12;

function partyBaseUrl(): string | null {
  const configured = process.env.EXPO_PUBLIC_PARTY_URL;
  if (configured) return configured.replace(/\/+$/, "");
  if (Platform.OS === "web" && typeof window !== "undefined") return window.location.origin;
  return null;
}

function toWebSocketUrl(httpUrl: string): string {
  return httpUrl.replace(/^http/i, "ws");
}

const PORTRAIT_THUMB_PX = 256;
const thumbCache = new Map<string, string | null>();
const thumbPending = new Set<string>();

// Party portraits are small thumbnails so every HP update stays cheap.
function shrinkOnWeb(uri: string): Promise<string | null> {
  if (Platform.OS !== "web" || typeof document === "undefined") return Promise.resolve(null);
  return new Promise((resolve) => {
    const img = new (globalThis as any).Image() as HTMLImageElement;
    img.onload = () => {
      try {
        const scale = Math.min(1, PORTRAIT_THUMB_PX / Math.max(img.width, img.height));
        const canvas = document.createElement("canvas");
        canvas.width = Math.max(1, Math.round(img.width * scale));
        canvas.height = Math.max(1, Math.round(img.height * scale));
        canvas.getContext("2d")?.drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL("image/jpeg", 0.75));
      } catch {
        resolve(null);
      }
    };
    img.onerror = () => resolve(null);
    img.src = uri;
  });
}

function acceptablePortrait(uri: string): boolean {
  return uri.length <= PARTY_MAX_PORTRAIT_CHARS && PARTY_PORTRAIT_PATTERN.test(uri);
}

class PartyManager {
  private state: PartyState = { ...initialState };
  private listeners = new Set<Listener>();
  private myName = "Player";
  private myCharacters: Character[] = [];

  private socket: WebSocket | null = null;
  private session: StoredSession | null = null;
  private welcomed = false;
  private intentionalClose = false;
  private reconnectAttempt = 0;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private heartbeat: ReturnType<typeof setInterval> | null = null;
  private publishTimer: ReturnType<typeof setTimeout> | null = null;
  private lastServerBeatAt = 0;
  private restoreStarted = false;

  constructor() {
    onCharacterSaved((character) => this.handleCharacterSaved(character));
  }

  isSupported(): boolean {
    return typeof WebSocket !== "undefined" && partyBaseUrl() != null;
  }

  getState(): PartyState {
    return this.state;
  }

  subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    listener(this.state);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private setState(patch: Partial<PartyState>): void {
    this.state = { ...this.state, ...patch };
    this.listeners.forEach((l) => l(this.state));
  }

  // ---------- Public API ----------

  setDisplayName(name: string): void {
    this.myName = name.trim() || (this.state.role === "host" ? "Game Master" : "Player");
  }

  async createParty(myCharacters: Character[], gmName = "Game Master"): Promise<void> {
    if (!this.beginSession("host", myCharacters, gmName)) return;
    const base = partyBaseUrl()!;
    try {
      const res = await fetch(`${base}/api/party`, { method: "POST" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const body = (await res.json()) as { code?: string; gmToken?: string };
      if (!isValidRoomCode(body.code) || typeof body.gmToken !== "string") throw new Error("Bad response");
      this.session = { role: "host", code: body.code, name: gmName, gmToken: body.gmToken };
      this.setState({ roomCode: body.code });
      await this.saveSession();
      this.connect();
    } catch {
      this.failToIdle("Could not create a party room. Check your connection and try again.");
    }
  }

  async joinParty(code: string, myCharacters: Character[], playerName = "Player"): Promise<void> {
    const cleanCode = code.trim().toUpperCase();
    if (!cleanCode) return;
    if (!isValidRoomCode(cleanCode)) {
      this.setState({ error: "Room codes are 6 letters and numbers." });
      return;
    }
    if (!this.beginSession("client", myCharacters, playerName)) return;
    this.session = { role: "client", code: cleanCode, name: playerName };
    this.setState({ roomCode: cleanCode });
    this.connect();
  }

  async leaveParty(): Promise<void> {
    this.intentionalClose = true;
    this.clearTimers();
    const socket = this.socket;
    this.socket = null;
    if (socket) {
      // The GM leaving ends the temporary room; a player leaving just exits it.
      this.sendOn(socket, this.state.role === "host" ? { t: "END_PARTY" } : { t: "LEAVE" });
      try {
        socket.close(1000, "Left the party");
      } catch {}
    }
    this.session = null;
    this.welcomed = false;
    await this.clearSession();
    this.setState({ ...initialState });
  }

  // Called by the UI whenever the device's local characters change.
  updateMyCharacters(chars: Character[]): void {
    this.myCharacters = chars ?? [];
    void this.restoreSession();
    this.schedulePublish();
  }

  toggleCharacterForParty(characterId: string): void {
    if (this.state.role !== "client") return;
    const character = this.myCharacters.find((item) => item.id === characterId && item.kind !== "monster");
    if (!character) return;
    const selected = new Set(this.state.selectedCharacterIds);
    if (selected.has(characterId)) selected.delete(characterId);
    else selected.add(characterId);
    const selectedCharacterIds = Array.from(selected);
    this.setState({ selectedCharacterIds });
    if (this.session) {
      this.session = { ...this.session, selectedCharacterIds };
      void this.saveSession();
    }
    this.schedulePublish();
  }

  // Roll notes belong to the GM. Players can type locally but nothing is sent.
  updateRollNotes(notes: Record<string, string>): void {
    if (this.state.role !== "host") return;
    this.setState({ rollNotes: { ...notes } });
    if (this.socket) this.sendOn(this.socket, { t: "ROLL_NOTES_UPDATE", notes });
  }

  // ---------- Session lifecycle ----------

  private beginSession(role: "host" | "client", myCharacters: Character[], name: string): boolean {
    if (!this.isSupported()) {
      this.setState({ error: "Party is not available in this build." });
      return false;
    }
    this.intentionalClose = false;
    this.clearTimers();
    this.myName = name;
    this.myCharacters = myCharacters ?? [];
    this.reconnectAttempt = 0;
    this.welcomed = false;
    this.setState({
      ...initialState,
      role,
      connecting: true,
      selectedCharacterIds: role === "host" ? this.heroesOnly(this.myCharacters).map((c) => c.id) : [],
    });
    return true;
  }

  // Rejoin after a page refresh or app restart.
  private async restoreSession(): Promise<void> {
    if (this.restoreStarted) return;
    this.restoreStarted = true;
    if (this.state.role !== "idle" || !this.isSupported()) return;
    try {
      const raw = await AsyncStorage.getItem(SESSION_KEY);
      if (!raw) return;
      const stored = JSON.parse(raw) as StoredSession;
      if (!stored || !isValidRoomCode(stored.code) || (stored.role !== "host" && stored.role !== "client")) {
        await this.clearSession();
        return;
      }
      if (this.state.role !== "idle") return;
      this.session = stored;
      this.intentionalClose = false;
      this.myName = stored.name;
      this.setState({
        ...initialState,
        role: stored.role,
        connecting: true,
        roomCode: stored.code,
        selectedCharacterIds:
          stored.role === "host"
            ? this.heroesOnly(this.myCharacters).map((c) => c.id)
            : Array.isArray(stored.selectedCharacterIds)
              ? stored.selectedCharacterIds.filter((id) => typeof id === "string")
              : [],
      });
      this.connect();
    } catch {
      await this.clearSession();
    }
  }

  private async saveSession(): Promise<void> {
    if (!this.session) return;
    try {
      await AsyncStorage.setItem(SESSION_KEY, JSON.stringify(this.session));
    } catch {}
  }

  private async clearSession(): Promise<void> {
    try {
      await AsyncStorage.removeItem(SESSION_KEY);
    } catch {}
  }

  private failToIdle(message: string): void {
    this.intentionalClose = true;
    this.clearTimers();
    const socket = this.socket;
    this.socket = null;
    if (socket) {
      try {
        socket.close();
      } catch {}
    }
    this.session = null;
    this.welcomed = false;
    void this.clearSession();
    this.setState({ ...initialState, error: message });
  }

  // ---------- Connection ----------

  private connect(): void {
    const session = this.session;
    const base = partyBaseUrl();
    if (!session || !base) return;
    let socket: WebSocket;
    try {
      socket = new WebSocket(`${toWebSocketUrl(base)}/api/party/${session.code}/ws`);
    } catch {
      this.handleSocketClosed(null);
      return;
    }
    this.socket = socket;
    this.welcomed = false;

    socket.onopen = () => {
      if (this.socket !== socket) return;
      this.lastServerBeatAt = Date.now();
      this.sendOn(socket, {
        t: "HELLO",
        v: PARTY_PROTOCOL_VERSION,
        name: session.name,
        role: session.role === "host" ? "gm" : "player",
        gmToken: session.gmToken,
        peerId: session.peerId,
        secret: session.secret,
      });
      this.publishNow();
      this.startHeartbeat(socket);
    };
    socket.onmessage = (event: { data: unknown }) => {
      if (this.socket !== socket || typeof event.data !== "string") return;
      this.lastServerBeatAt = Date.now();
      let msg: PartyMessage;
      try {
        msg = JSON.parse(event.data) as PartyMessage;
      } catch {
        return;
      }
      this.handleMessage(msg);
    };
    socket.onclose = () => this.handleSocketClosed(socket);
    socket.onerror = () => {
      // onclose follows and drives reconnects.
    };
  }

  private handleSocketClosed(socket: WebSocket | null): void {
    if (socket && this.socket !== socket) return;
    this.socket = null;
    this.stopHeartbeat();
    if (this.intentionalClose || this.state.role === "idle") return;

    if (!this.welcomed && this.state.role === "client" && !this.state.connected && this.reconnectAttempt === 0 && !this.session?.peerId) {
      this.failToIdle("Could not reach the party. Check the room code and your connection.");
      return;
    }
    if (this.reconnectAttempt >= MAX_RECONNECT_ATTEMPTS) {
      this.failToIdle("Lost connection to the party.");
      return;
    }
    const delay = RECONNECT_DELAYS_MS[Math.min(this.reconnectAttempt, RECONNECT_DELAYS_MS.length - 1)];
    this.reconnectAttempt += 1;
    this.setState({ reconnecting: this.state.connected || this.state.reconnecting, connecting: !this.state.connected });
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      if (!this.intentionalClose && this.session) this.connect();
    }, delay);
  }

  private handleMessage(msg: PartyMessage): void {
    switch (msg.t) {
      case "WELCOME": {
        this.welcomed = true;
        this.reconnectAttempt = 0;
        if (this.session) {
          this.session = { ...this.session, peerId: msg.you.id, secret: msg.secret };
          void this.saveSession();
        }
        this.setState({
          connecting: false,
          connected: true,
          reconnecting: false,
          error: null,
          peers: msg.peers,
          sharedHeroes: this.sanitizeIncoming(msg.sharedHeroes),
          rollNotes: this.sanitizeNotes(msg.rollNotes),
        });
        break;
      }
      case "PLAYER_JOINED":
        this.setState({ peers: [...this.state.peers.filter((p) => p.id !== msg.peer.id), msg.peer] });
        break;
      case "PLAYER_LEFT":
        this.setState({ peers: this.state.peers.filter((p) => p.id !== msg.peerId) });
        break;
      case "PARTY_STATE":
        this.setState({
          sharedHeroes: this.sanitizeIncoming(msg.sharedHeroes),
          rollNotes: this.sanitizeNotes(msg.rollNotes),
        });
        break;
      case "ERROR":
        if (msg.fatal) this.failToIdle(msg.message);
        break;
      default:
        break;
    }
  }

  private startHeartbeat(socket: WebSocket): void {
    this.stopHeartbeat();
    this.heartbeat = setInterval(() => {
      if (this.socket !== socket) return;
      if (Date.now() - this.lastServerBeatAt > PARTY_HEARTBEAT_TIMEOUT_MS) {
        try {
          socket.close();
        } catch {}
        this.handleSocketClosed(socket);
        return;
      }
      this.sendOn(socket, { t: "PING", ts: Date.now() });
    }, PARTY_HEARTBEAT_INTERVAL_MS);
  }

  private stopHeartbeat(): void {
    if (this.heartbeat) clearInterval(this.heartbeat);
    this.heartbeat = null;
  }

  private clearTimers(): void {
    this.stopHeartbeat();
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    this.reconnectTimer = null;
    if (this.publishTimer) clearTimeout(this.publishTimer);
    this.publishTimer = null;
  }

  private sendOn(socket: WebSocket, msg: PartyMessage): void {
    if (socket.readyState !== 1) return;
    try {
      socket.send(JSON.stringify(msg));
    } catch {}
  }

  // ---------- Publishing my heroes ----------

  private heroesOnly(chars: Character[]): Character[] {
    return (chars ?? []).filter((c) => c && c.kind !== "monster");
  }

  private withPartyPortrait(character: Character): Character {
    const uri = character.portraitUri;
    if (!uri) return character;
    if (acceptablePortrait(uri)) return character;
    const key = `${character.id}:${uri.length}:${uri.slice(-32)}`;
    if (thumbCache.has(key)) {
      return { ...character, portraitUri: thumbCache.get(key) ?? undefined };
    }
    if (!thumbPending.has(key)) {
      thumbPending.add(key);
      shrinkOnWeb(uri).then((small) => {
        thumbPending.delete(key);
        thumbCache.set(key, small && acceptablePortrait(small) ? small : null);
        this.schedulePublish();
      });
    }
    return { ...character, portraitUri: undefined };
  }

  private shareableHeroes(): Character[] {
    const heroes = this.heroesOnly(this.myCharacters);
    if (this.state.role === "host") return heroes.map((c) => this.withPartyPortrait(c));
    const selected = new Set(this.state.selectedCharacterIds);
    return heroes.filter((c) => selected.has(c.id)).map((c) => this.withPartyPortrait(c));
  }

  private schedulePublish(): void {
    if (this.state.role === "idle" || !this.socket) return;
    if (this.publishTimer) clearTimeout(this.publishTimer);
    this.publishTimer = setTimeout(() => {
      this.publishTimer = null;
      this.publishNow();
    }, PUBLISH_DEBOUNCE_MS);
  }

  private publishNow(): void {
    if (!this.socket || this.state.role === "idle") return;
    this.sendOn(this.socket, { t: "CHARACTER_UPDATE", characters: this.shareableHeroes() });
  }

  // Any hero-sheet save (e.g. HP edits on the sheet screen) goes live without
  // waiting for the list screen to reload.
  private handleCharacterSaved(character: Character): void {
    if (this.state.role === "idle") return;
    const index = this.myCharacters.findIndex((c) => c.id === character.id);
    if (index < 0) return;
    const next = [...this.myCharacters];
    next[index] = character;
    this.myCharacters = next;
    this.schedulePublish();
  }

  // ---------- Incoming data hygiene ----------

  private sanitizeIncoming(list: unknown): Character[] {
    if (!Array.isArray(list)) return [];
    const out: Character[] = [];
    for (const raw of list) {
      try {
        const hero = migrateCharacter(raw);
        if (hero.id && hero.kind !== "monster") out.push(hero);
      } catch {}
    }
    return out;
  }

  private sanitizeNotes(notes: unknown): Record<string, string> {
    if (!notes || typeof notes !== "object" || Array.isArray(notes)) return {};
    const out: Record<string, string> = {};
    Object.entries(notes as Record<string, unknown>).forEach(([key, value]) => {
      if (typeof value === "string") out[key] = value;
    });
    return out;
  }
}

export const partyManager = new PartyManager();
