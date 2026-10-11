// Cloudflare Worker: serves the Party room API and the static Expo web export.
//
//   POST /api/party              -> creates a room, returns { code, gmToken }
//   GET  /api/party/<CODE>/ws    -> WebSocket into that room (GM or player)
//   everything else              -> static assets (single page app)
//
// Each room is one PartyRoom Durable Object keyed by its room code. Rooms are
// temporary: they end when the GM ends the party, when the GM stays away too
// long, or when nobody is connected for a while.

import { DurableObject } from "cloudflare:workers";
import {
  PARTY_HEARTBEAT_TIMEOUT_MS,
  PARTY_MAX_HERO_CHARS,
  PARTY_MAX_HEROES_PER_PEER,
  PARTY_MAX_MESSAGE_CHARS,
  PARTY_MAX_PLAYERS,
  PARTY_PROTOCOL_VERSION,
  generateRoomCode,
  isValidRoomCode,
  randomHex,
  type PartyMessage,
  type PeerInfo,
} from "../src/party/protocol";
import type { Character } from "@/src/types";

interface Env {
  PARTY_ROOM: DurableObjectNamespace;
  ASSETS: { fetch(request: Request): Promise<Response> };
}

const GM_ID = "gm";
const HELLO_TIMEOUT_MS = 10_000;
const PLAYER_GRACE_MS = 60_000;
const GM_ABSENT_END_MS = 30 * 60_000;
const EMPTY_ROOM_TTL_MS = 10 * 60_000;
const SWEEP_INTERVAL_MS = 5_000;
const MAX_NOTE_ENTRIES = 200;
const MAX_NOTE_KEY_CHARS = 100;
const MAX_NOTE_VALUE_CHARS = 2_000;

const json = (body: unknown, status = 200): Response =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json", "cache-control": "no-store" },
  });

// Browsers always send Origin on WebSocket and cross-site POSTs. Native apps
// send none. Reject anything that is clearly another website.
function originAllowed(request: Request): boolean {
  const origin = request.headers.get("Origin");
  if (!origin) return true;
  return origin === new URL(request.url).origin;
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname === "/api/party" && request.method === "POST") {
      if (!originAllowed(request)) return json({ error: "Forbidden" }, 403);
      return createRoom(env);
    }

    const wsMatch = /^\/api\/party\/([^/]+)\/ws$/.exec(url.pathname);
    if (wsMatch) {
      if (!originAllowed(request)) return json({ error: "Forbidden" }, 403);
      if (request.headers.get("Upgrade") !== "websocket") return json({ error: "Expected WebSocket" }, 426);
      const code = wsMatch[1].toUpperCase();
      if (!isValidRoomCode(code)) return json({ error: "Invalid room code" }, 400);
      return env.PARTY_ROOM.get(env.PARTY_ROOM.idFromName(code)).fetch(request);
    }

    if (url.pathname.startsWith("/api/")) return json({ error: "Not found" }, 404);
    return env.ASSETS.fetch(request);
  },
};

async function createRoom(env: Env): Promise<Response> {
  const gmToken = randomHex(24);
  for (let attempt = 0; attempt < 8; attempt++) {
    const code = generateRoomCode();
    const stub = env.PARTY_ROOM.get(env.PARTY_ROOM.idFromName(code));
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const created: boolean = await (stub as any).init(gmToken);
    if (created) return json({ code, gmToken }, 201);
  }
  return json({ error: "Could not allocate a room code. Try again." }, 503);
}

type Peer = {
  id: string;
  secret: string;
  name: string;
  role: "gm" | "player";
  joinedAt: string;
  socket: WebSocket | null;
  lastSeen: number;
  disconnectedAt: number | null;
  heroes: Character[];
};

function cleanName(value: unknown, fallback: string): string {
  if (typeof value !== "string") return fallback;
  const name = value.replace(/[\u0000-\u001f\u007f]/g, "").trim().slice(0, 40);
  return name || fallback;
}

function safeEqual(a: unknown, b: unknown): boolean {
  if (typeof a !== "string" || typeof b !== "string" || a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

function sanitizeNotes(raw: unknown): Record<string, string> | null {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const entries = Object.entries(raw as Record<string, unknown>);
  if (entries.length > MAX_NOTE_ENTRIES) return null;
  const out: Record<string, string> = {};
  for (const [key, value] of entries) {
    if (typeof value !== "string" || key.length > MAX_NOTE_KEY_CHARS) return null;
    out[key] = value.slice(0, MAX_NOTE_VALUE_CHARS);
  }
  return out;
}

export class PartyRoom extends DurableObject<Env> {
  private peers = new Map<string, Peer>();
  private rollNotes: Record<string, string> = {};
  private gmToken: string | null | undefined;
  private sweeper: ReturnType<typeof setInterval> | null = null;

  // Called through RPC by createRoom. Returns false if the code is taken.
  async init(gmToken: string): Promise<boolean> {
    if (await this.loadGmToken()) return false;
    await this.ctx.storage.put("gmToken", gmToken);
    this.gmToken = gmToken;
    await this.ctx.storage.setAlarm(Date.now() + EMPTY_ROOM_TTL_MS);
    return true;
  }

  private async loadGmToken(): Promise<string | null> {
    if (this.gmToken === undefined) {
      this.gmToken = (await this.ctx.storage.get<string>("gmToken")) ?? null;
    }
    return this.gmToken;
  }

  async fetch(_request: Request): Promise<Response> {
    const pair = new WebSocketPair();
    const [client, server] = Object.values(pair) as [WebSocket, WebSocket];
    server.accept();

    const gmToken = await this.loadGmToken();
    if (!gmToken) {
      this.sendTo(server, { t: "ERROR", message: "No party with that code. Check the code and try again.", fatal: true });
      server.close(1008, "No such party");
    } else {
      this.attach(server, gmToken);
    }
    return new Response(null, { status: 101, webSocket: client } as ResponseInit);
  }

  async alarm(): Promise<void> {
    if (this.connectedCount() === 0) await this.destroyRoom(null);
  }

  private attach(socket: WebSocket, gmToken: string): void {
    let peer: Peer | null = null;
    const helloTimer = setTimeout(() => {
      if (!peer) socket.close(1008, "HELLO required");
    }, HELLO_TIMEOUT_MS);

    socket.addEventListener("message", (event) => {
      const raw = event.data;
      if (typeof raw !== "string" || raw.length > PARTY_MAX_MESSAGE_CHARS) {
        socket.close(1009, "Message too large");
        return;
      }
      let msg: Record<string, unknown>;
      try {
        msg = JSON.parse(raw);
      } catch {
        return;
      }
      if (!msg || typeof msg !== "object" || typeof msg.t !== "string") return;

      if (!peer) {
        if (msg.t === "HELLO") {
          clearTimeout(helloTimer);
          peer = this.handleHello(socket, msg, gmToken);
        }
        return;
      }
      if (peer.socket !== socket) return;
      peer.lastSeen = Date.now();
      this.handleMessage(peer, msg);
    });

    const onGone = () => {
      clearTimeout(helloTimer);
      if (peer && peer.socket === socket) this.onDisconnect(peer);
    };
    socket.addEventListener("close", onGone);
    socket.addEventListener("error", onGone);
  }

  private handleHello(socket: WebSocket, msg: Record<string, unknown>, gmToken: string): Peer | null {
    const fatal = (message: string): null => {
      this.sendTo(socket, { t: "ERROR", message, fatal: true });
      socket.close(1008, "Rejected");
      return null;
    };
    if (msg.v !== PARTY_PROTOCOL_VERSION) return fatal("This app version is out of date. Refresh the page and try again.");

    let peer: Peer | undefined;
    let isNew = false;
    if (msg.role === "gm") {
      if (!safeEqual(msg.gmToken, gmToken)) return fatal("This party belongs to another GM.");
      peer = this.peers.get(GM_ID);
      if (!peer) {
        peer = this.newPeer(GM_ID, "gm", cleanName(msg.name, "Game Master"));
        isNew = true;
      }
    } else {
      const existing = typeof msg.peerId === "string" ? this.peers.get(msg.peerId) : undefined;
      if (existing && existing.role === "player" && safeEqual(msg.secret, existing.secret)) {
        peer = existing;
      } else {
        const players = [...this.peers.values()].filter((p) => p.role === "player").length;
        if (players >= PARTY_MAX_PLAYERS) return fatal("This party is full.");
        peer = this.newPeer(randomHex(8), "player", cleanName(msg.name, "Player"));
        isNew = true;
      }
    }
    peer.name = cleanName(msg.name, peer.name);

    const previous = peer.socket;
    peer.socket = socket;
    peer.lastSeen = Date.now();
    peer.disconnectedAt = null;
    if (previous && previous !== socket) {
      try {
        previous.close(1000, "Replaced by a newer connection");
      } catch {}
    }
    if (isNew) this.peers.set(peer.id, peer);

    void this.ctx.storage.deleteAlarm();
    this.startSweeper();
    this.sendTo(socket, {
      t: "WELCOME",
      you: this.info(peer),
      secret: peer.secret,
      peers: this.peerList(),
      sharedHeroes: this.sharedHeroes(),
      rollNotes: this.rollNotes,
    });
    this.broadcast({ t: "PLAYER_JOINED", peer: this.info(peer) }, peer.id);
    this.broadcastState(peer.id);
    return peer;
  }

  private handleMessage(peer: Peer, msg: Record<string, unknown>): void {
    switch (msg.t) {
      case "PING":
        this.sendTo(peer.socket, { t: "PONG", ts: typeof msg.ts === "number" ? msg.ts : Date.now() });
        break;
      case "CHARACTER_UPDATE":
        peer.heroes = this.sanitizeHeroes(peer, msg.characters);
        this.broadcastState();
        break;
      case "ROLL_NOTES_UPDATE": {
        if (peer.role !== "gm") {
          this.sendTo(peer.socket, { t: "ERROR", message: "Only the GM can edit roll notes." });
          break;
        }
        const notes = sanitizeNotes(msg.notes);
        if (!notes) break;
        this.rollNotes = notes;
        this.broadcastState();
        break;
      }
      case "LEAVE":
        if (peer.role === "gm") break;
        this.removePeer(peer);
        break;
      case "END_PARTY":
        if (peer.role === "gm") void this.destroyRoom("Party ended by GM.");
        break;
      default:
        break;
    }
  }

  // A peer can only publish heroes it owns. An id that is already owned by a
  // different peer is ignored, so nobody can overwrite or hijack another
  // player's mini sheet. Portraits are never shared.
  private sanitizeHeroes(peer: Peer, raw: unknown): Character[] {
    if (!Array.isArray(raw)) return peer.heroes;
    const claimedElsewhere = new Set<string>();
    this.peers.forEach((other) => {
      if (other.id !== peer.id) other.heroes.forEach((hero) => claimedElsewhere.add(hero.id));
    });
    const out: Character[] = [];
    const seen = new Set<string>();
    for (const item of raw.slice(0, PARTY_MAX_HEROES_PER_PEER)) {
      if (!item || typeof item !== "object") continue;
      const hero = item as Record<string, unknown>;
      if (typeof hero.id !== "string" || hero.id.length === 0 || hero.id.length > 64) continue;
      if (hero.kind === "monster" || claimedElsewhere.has(hero.id) || seen.has(hero.id)) continue;
      const { portraitUri: _portrait, ...rest } = hero;
      if (JSON.stringify(rest).length > PARTY_MAX_HERO_CHARS) continue;
      seen.add(hero.id);
      out.push(rest as unknown as Character);
    }
    return out;
  }

  private newPeer(id: string, role: "gm" | "player", name: string): Peer {
    return {
      id,
      secret: randomHex(16),
      name,
      role,
      joinedAt: new Date().toISOString(),
      socket: null,
      lastSeen: Date.now(),
      disconnectedAt: null,
      heroes: [],
    };
  }

  private info(peer: Peer): PeerInfo {
    return { id: peer.id, name: peer.name, role: peer.role, joinedAt: peer.joinedAt };
  }

  private peerList(): PeerInfo[] {
    return [...this.peers.values()].filter((p) => p.socket).map((p) => this.info(p));
  }

  private sharedHeroes(): Character[] {
    return [...this.peers.values()].filter((p) => p.socket).flatMap((p) => p.heroes);
  }

  private connectedCount(): number {
    return [...this.peers.values()].filter((p) => p.socket).length;
  }

  private sendTo(socket: WebSocket | null, msg: PartyMessage): void {
    if (!socket) return;
    try {
      socket.send(JSON.stringify(msg));
    } catch {}
  }

  private broadcast(msg: PartyMessage, exceptId?: string): void {
    const payload = JSON.stringify(msg);
    this.peers.forEach((p) => {
      if (!p.socket || p.id === exceptId) return;
      try {
        p.socket.send(payload);
      } catch {}
    });
  }

  private broadcastState(exceptId?: string): void {
    this.broadcast({ t: "PARTY_STATE", sharedHeroes: this.sharedHeroes(), rollNotes: this.rollNotes }, exceptId);
  }

  private onDisconnect(peer: Peer): void {
    peer.socket = null;
    peer.disconnectedAt = Date.now();
    this.broadcast({ t: "PLAYER_LEFT", peerId: peer.id });
    this.broadcastState();
    if (this.connectedCount() === 0) {
      void this.ctx.storage.setAlarm(Date.now() + EMPTY_ROOM_TTL_MS);
    }
  }

  private removePeer(peer: Peer): void {
    const socket = peer.socket;
    peer.socket = null;
    this.peers.delete(peer.id);
    if (socket) {
      try {
        socket.close(1000, "Left the party");
      } catch {}
    }
    this.broadcast({ t: "PLAYER_LEFT", peerId: peer.id });
    this.broadcastState();
  }

  private startSweeper(): void {
    if (this.sweeper) return;
    this.sweeper = setInterval(() => this.sweep(), SWEEP_INTERVAL_MS);
  }

  private sweep(): void {
    const now = Date.now();
    for (const peer of [...this.peers.values()]) {
      if (peer.socket && now - peer.lastSeen > PARTY_HEARTBEAT_TIMEOUT_MS) {
        const stale = peer.socket;
        this.onDisconnect(peer);
        try {
          stale.close(1001, "Heartbeat timeout");
        } catch {}
      } else if (!peer.socket && peer.disconnectedAt != null) {
        const away = now - peer.disconnectedAt;
        if (peer.role === "gm" && away > GM_ABSENT_END_MS) {
          void this.destroyRoom("Party ended: the GM disconnected.");
          return;
        }
        if (peer.role === "player" && away > PLAYER_GRACE_MS) this.peers.delete(peer.id);
      }
    }
    if (this.peers.size === 0 && this.sweeper) {
      clearInterval(this.sweeper);
      this.sweeper = null;
    }
  }

  private async destroyRoom(reason: string | null): Promise<void> {
    if (reason) this.broadcast({ t: "ERROR", message: reason, fatal: true });
    this.peers.forEach((p) => {
      try {
        p.socket?.close(1000, "Party ended");
      } catch {}
    });
    this.peers.clear();
    this.rollNotes = {};
    if (this.sweeper) clearInterval(this.sweeper);
    this.sweeper = null;
    this.gmToken = null;
    await this.ctx.storage.deleteAlarm();
    await this.ctx.storage.deleteAll();
  }
}
