// PartyManager — a single facade over the host and client roles so the UI
// never touches sockets directly.
//
// Host role (GM device):
//   • TCP server accepting player connections
//   • UDP broadcaster announcing room code + TCP port on the LAN
//   • Merges every connected peer's characters (+ its own) into sharedHeroes
//   • Broadcasts PARTY_STATE whenever anything changes
//
// Client role (Player device):
//   • UDP scan for the matching room code (5s window)
//   • TCP connect to the discovered host
//   • Sends CHARACTER_UPDATE on join and whenever local heroes change
//   • Auto-reconnects up to N times if the socket drops
//
// The manager also exposes sharedHeroes and rollNotes as always-current state
// so the UI is a pure subscriber.

import type { Character } from "@/src/types";
import {
  DiscoveryPacket,
  PARTY_DEFAULT_TCP_PORT_MAX,
  PARTY_DEFAULT_TCP_PORT_MIN,
  PARTY_DISCOVERY_BROADCAST_INTERVAL_MS,
  PARTY_DISCOVERY_UDP_PORT,
  PARTY_HEARTBEAT_INTERVAL_MS,
  PARTY_HEARTBEAT_TIMEOUT_MS,
  PartyMessage,
  PeerInfo,
  decodeMessages,
  encodeMessage,
  generatePeerId,
  generateRoomCode,
} from "./protocol";
import {
  TcpServerInstance,
  TcpSocket,
  UdpSocketInstance,
  isPartySupported,
  loadNative,
} from "./nativeSupport";

// ---------- Public state ----------
export type PartyRole = "idle" | "host" | "client";

export type PartyState = {
  role: PartyRole;
  connecting: boolean;
  connected: boolean;
  error: string | null;
  roomCode: string | null;
  hostIp: string | null;
  hostPort: number | null;
  peers: PeerInfo[]; // includes self
  sharedHeroes: Character[];
  rollNotes: Record<string, string>;
};

const initialState: PartyState = {
  role: "idle",
  connecting: false,
  connected: false,
  error: null,
  roomCode: null,
  hostIp: null,
  hostPort: null,
  peers: [],
  sharedHeroes: [],
  rollNotes: {},
};

type Listener = (state: PartyState) => void;

// ---------- Manager singleton ----------
class PartyManager {
  private state: PartyState = { ...initialState };
  private listeners = new Set<Listener>();
  private myPeerId = generatePeerId();
  private myName = "Player";
  private myCharacters: Character[] = [];

  // Host-side
  private tcpServer: TcpServerInstance | null = null;
  private udpBroadcaster: UdpSocketInstance | null = null;
  private udpBroadcastTimer: ReturnType<typeof setInterval> | null = null;
  private hostClients = new Map<
    string,
    {
      socket: TcpSocket;
      peer: PeerInfo;
      lastSeen: number;
      buffer: string;
      characters: Character[];
    }
  >();

  // Client-side
  private clientSocket: TcpSocket | null = null;
  private clientBuffer = "";
  private udpScanner: UdpSocketInstance | null = null;
  private clientHeartbeat: ReturnType<typeof setInterval> | null = null;
  private reconnectAttempt = 0;
  private lastServerBeatAt = 0;

  isSupported(): boolean {
    return isPartySupported();
  }

  getState(): PartyState {
    return this.state;
  }

  subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    // deliver initial state on subscribe
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
    if (!this.isSupported()) {
      this.setState({ error: "Party is not supported in this build." });
      return;
    }
    this.myName = gmName;
    this.myCharacters = myCharacters ?? [];
    const { tcp, udp } = loadNative();
    if (!tcp || !udp) return;

    this.setState({
      role: "host",
      connecting: true,
      error: null,
      peers: [],
      sharedHeroes: [],
      rollNotes: {},
    });

    // Pick a random port in the party range.
    const port =
      PARTY_DEFAULT_TCP_PORT_MIN +
      Math.floor(Math.random() * (PARTY_DEFAULT_TCP_PORT_MAX - PARTY_DEFAULT_TCP_PORT_MIN));

    try {
      const server = tcp.createServer({}, (socket) => this.hostOnConnection(socket));
      server.on("error", (err: unknown) => {
        console.warn("[Party.host] server error", err);
        const errMsg = err && typeof err === "object" && "message" in err ? String((err as any).message) : String(err);
        this.setState({ error: `Server error: ${errMsg}` });
      });
      server.listen({ port, host: "0.0.0.0" }, () => {
        console.log(`[Party.host] listening on 0.0.0.0:${port}`);
      });
      this.tcpServer = server;

      const roomCode = generateRoomCode();
      const selfPeer: PeerInfo = {
        id: this.myPeerId,
        name: this.myName,
        role: "gm",
        joinedAt: new Date().toISOString(),
      };

      this.setState({
        connecting: false,
        connected: true,
        roomCode,
        hostIp: "auto",
        hostPort: port,
        peers: [selfPeer],
      });
      this.recomputeSharedHeroes();

      // Start UDP broadcaster.
      this.startBroadcaster(udp, roomCode, port);

      // Start heartbeat monitor.
      this.startHostHeartbeat();
    } catch (err: unknown) {
      console.warn("[Party.host] create failed", err);
      const errMsg = err instanceof Error ? err.message : String(err);
      this.setState({ role: "idle", connecting: false, connected: false, error: `Could not start party server: ${errMsg}` });
    }
  }

  async joinParty(code: string, myCharacters: Character[], playerName = "Player"): Promise<void> {
    if (!this.isSupported()) {
      this.setState({ error: "Party is not supported in this build." });
      return;
    }
    const cleanCode = code.trim().toUpperCase();
    if (!cleanCode) return;
    this.myName = playerName;
    this.myCharacters = myCharacters ?? [];

    this.setState({
      role: "client",
      connecting: true,
      connected: false,
      error: null,
      roomCode: cleanCode,
      hostIp: null,
      hostPort: null,
      peers: [],
      sharedHeroes: [],
      rollNotes: {},
    });

    const { tcp, udp } = loadNative();
    if (!tcp || !udp) return;

    try {
      const target = await this.scanForHost(udp, cleanCode, 8000);
      if (!target) {
        this.setState({
          connecting: false,
          error: `No party with code ${cleanCode} found on this Wi-Fi. Make sure the GM has started the party and you're on the same network.`,
        });
        return;
      }
      this.setState({ hostIp: target.ip, hostPort: target.port });
      await this.clientConnect(tcp, target.ip, target.port);
    } catch (err) {
      console.warn("[Party.client] join failed", err);
      this.setState({ connecting: false, error: "Could not reach the party." });
    }
  }

  async leaveParty(): Promise<void> {
    // Both roles reset.
    if (this.state.role === "host") {
      // Notify each client, close everything.
      this.hostClients.forEach(({ socket }) => {
        try {
          socket.write(encodeMessage({ t: "ERROR", message: "Party ended by GM.", fatal: true }));
          socket.end();
        } catch {}
      });
      this.hostClients.clear();
      this.stopBroadcaster();
      if (this.tcpServer) {
        try {
          this.tcpServer.close();
        } catch {}
      }
      this.tcpServer = null;
    }
    if (this.state.role === "client") {
      if (this.clientHeartbeat) clearInterval(this.clientHeartbeat);
      this.clientHeartbeat = null;
      if (this.clientSocket) {
        try {
          this.clientSocket.end();
        } catch {}
      }
      this.clientSocket = null;
      if (this.udpScanner) {
        try {
          this.udpScanner.close();
        } catch {}
        this.udpScanner = null;
      }
    }
    this.setState({ ...initialState });
  }

  // Called by the UI whenever the device's local characters change.
  updateMyCharacters(chars: Character[]): void {
    this.myCharacters = chars ?? [];
    if (this.state.role === "host") {
      this.recomputeSharedHeroes();
    } else if (this.state.role === "client" && this.clientSocket) {
      this.send(this.clientSocket, {
        t: "CHARACTER_UPDATE",
        from: this.myPeerId,
        characters: this.heroesOnly(this.myCharacters),
      });
    }
  }

  updateRollNotes(notes: Record<string, string>): void {
    if (this.state.role === "host") {
      this.setState({ rollNotes: { ...notes } });
      this.broadcastState();
    } else if (this.state.role === "client" && this.clientSocket) {
      // Optimistic local update; host will confirm.
      this.setState({ rollNotes: { ...notes } });
      this.send(this.clientSocket, { t: "ROLL_NOTES_UPDATE", notes });
    }
  }

  // ---------- Host internals ----------

  private hostOnConnection(socket: TcpSocket): void {
    if (socket.setEncoding) socket.setEncoding("utf8");
    const remote = `${socket.remoteAddress ?? "?"}:${socket.remotePort ?? "?"}`;
    console.log(`[Party.host] incoming connection from ${remote}`);
    // Wait for HELLO before adding to the roster.
    const entry = {
      socket,
      peer: null as unknown as PeerInfo,
      lastSeen: Date.now(),
      buffer: "",
      characters: [] as Character[],
    };

    const onData = (chunk: unknown) => {
      const s = typeof chunk === "string" ? chunk : String(chunk);
      entry.buffer += s;
      const { messages, rest } = decodeMessages(entry.buffer);
      entry.buffer = rest;
      messages.forEach((msg) => this.hostHandleMessage(entry, msg));
    };

    const cleanup = () => {
      if (entry.peer) {
        this.hostClients.delete(entry.peer.id);
        this.broadcast(
          (peerId) =>
            peerId !== entry.peer.id
              ? ({ t: "PLAYER_LEFT", peerId: entry.peer.id } as PartyMessage)
              : null,
        );
        this.recomputePeersList();
        this.recomputeSharedHeroes();
        console.log(`[Party.host] client ${entry.peer.name} disconnected`);
      }
    };

    socket.on("data", onData);
    socket.on("close", cleanup);
    socket.on("error", (err: unknown) => {
      console.warn("[Party.host] socket error", err);
      cleanup();
    });
  }

  private hostHandleMessage(
    entry: {
      socket: TcpSocket;
      peer: PeerInfo;
      lastSeen: number;
      buffer: string;
      characters: Character[];
    },
    msg: PartyMessage,
  ): void {
    entry.lastSeen = Date.now();
    switch (msg.t) {
      case "HELLO": {
        if (msg.code !== this.state.roomCode) {
          try {
            entry.socket.write(
              encodeMessage({ t: "ERROR", message: "Wrong room code.", fatal: true }),
            );
            entry.socket.end();
          } catch {}
          return;
        }
        entry.peer = {
          id: msg.from,
          name: msg.name || "Player",
          role: "player",
          joinedAt: new Date().toISOString(),
        };
        this.hostClients.set(msg.from, entry);
        const peers = this.currentPeers();
        try {
          entry.socket.write(encodeMessage({ t: "WELCOME", you: entry.peer, peers }));
        } catch {}
        // Notify existing peers.
        this.broadcast((peerId) =>
          peerId === entry.peer.id
            ? null
            : ({ t: "PLAYER_JOINED", peer: entry.peer } as PartyMessage),
        );
        this.recomputePeersList();
        // Send current state immediately.
        this.sendState(entry.socket);
        console.log(`[Party.host] ${entry.peer.name} joined`);
        break;
      }
      case "CHARACTER_UPDATE": {
        entry.characters = msg.characters ?? [];
        this.recomputeSharedHeroes();
        break;
      }
      case "ROLL_NOTES_UPDATE": {
        this.setState({ rollNotes: { ...msg.notes } });
        this.broadcastState();
        break;
      }
      case "PING": {
        try {
          entry.socket.write(encodeMessage({ t: "PONG", ts: msg.ts }));
        } catch {}
        break;
      }
      default:
        break;
    }
  }

  private currentPeers(): PeerInfo[] {
    const self: PeerInfo = {
      id: this.myPeerId,
      name: this.myName,
      role: "gm",
      joinedAt: new Date().toISOString(),
    };
    return [self, ...Array.from(this.hostClients.values()).map((c) => c.peer).filter(Boolean)];
  }

  private recomputePeersList(): void {
    this.setState({ peers: this.currentPeers() });
  }

  private recomputeSharedHeroes(): void {
    // Merge GM heroes + every connected client's heroes by id.
    const byId = new Map<string, Character>();
    this.heroesOnly(this.myCharacters).forEach((c) => byId.set(c.id, c));
    this.hostClients.forEach((c) => {
      this.heroesOnly(c.characters).forEach((ch) => byId.set(ch.id, ch));
    });
    const shared = Array.from(byId.values());
    this.setState({ sharedHeroes: shared });
    this.broadcastState();
  }

  private heroesOnly(chars: Character[]): Character[] {
    return (chars ?? []).filter((c) => c && c.kind !== "monster");
  }

  private broadcastState(): void {
    const payload: PartyMessage = {
      t: "PARTY_STATE",
      sharedHeroes: this.state.sharedHeroes,
      rollNotes: this.state.rollNotes,
    };
    this.hostClients.forEach((entry) => {
      try {
        entry.socket.write(encodeMessage(payload));
      } catch {}
    });
  }

  private sendState(socket: TcpSocket): void {
    try {
      socket.write(
        encodeMessage({
          t: "PARTY_STATE",
          sharedHeroes: this.state.sharedHeroes,
          rollNotes: this.state.rollNotes,
        }),
      );
    } catch {}
  }

  private broadcast(build: (peerId: string) => PartyMessage | null): void {
    this.hostClients.forEach((entry, peerId) => {
      const msg = build(peerId);
      if (!msg) return;
      try {
        entry.socket.write(encodeMessage(msg));
      } catch {}
    });
  }

  private startBroadcaster(
    udp: ReturnType<typeof loadNative>["udp"],
    code: string,
    tcpPort: number,
  ): void {
    if (!udp) return;
    try {
      const socket = udp.createSocket({ type: "udp4", reusePort: true });
      socket.bind(0, () => {
        try {
          socket.setBroadcast(true);
        } catch (err) {
          console.warn("[Party.host] setBroadcast failed", err);
        }
      });
      socket.on("error", (err: unknown) => {
        console.warn("[Party.host] udp error", err);
      });
      this.udpBroadcaster = socket;
      const tick = () => {
        if (!this.udpBroadcaster || !this.state.roomCode) return;
        const packet: DiscoveryPacket = {
          aob: 1,
          code,
          tcpPort,
          gm: this.myName,
          ts: Date.now(),
        };
        const body = JSON.stringify(packet);
        try {
          this.udpBroadcaster.send(
            body,
            0,
            body.length,
            PARTY_DISCOVERY_UDP_PORT,
            "255.255.255.255",
            (err) => {
              if (err) console.warn("[Party.host] broadcast err", err);
            },
          );
        } catch (err) {
          console.warn("[Party.host] broadcast throw", err);
        }
      };
      tick();
      this.udpBroadcastTimer = setInterval(tick, PARTY_DISCOVERY_BROADCAST_INTERVAL_MS);
    } catch (err) {
      console.warn("[Party.host] failed to start udp broadcaster", err);
    }
  }

  private stopBroadcaster(): void {
    if (this.udpBroadcastTimer) clearInterval(this.udpBroadcastTimer);
    this.udpBroadcastTimer = null;
    if (this.udpBroadcaster) {
      try {
        this.udpBroadcaster.close();
      } catch {}
    }
    this.udpBroadcaster = null;
  }

  private startHostHeartbeat(): void {
    setInterval(() => {
      const now = Date.now();
      this.hostClients.forEach((entry, id) => {
        if (now - entry.lastSeen > PARTY_HEARTBEAT_TIMEOUT_MS) {
          console.log(`[Party.host] pruning stale peer ${entry.peer?.name ?? id}`);
          try {
            entry.socket.destroy();
          } catch {}
          this.hostClients.delete(id);
          this.recomputePeersList();
          this.recomputeSharedHeroes();
        } else {
          try {
            entry.socket.write(encodeMessage({ t: "PING", ts: now }));
          } catch {}
        }
      });
    }, PARTY_HEARTBEAT_INTERVAL_MS);
  }

  // ---------- Client internals ----------

  private scanForHost(
    udp: ReturnType<typeof loadNative>["udp"],
    code: string,
    timeoutMs: number,
  ): Promise<{ ip: string; port: number } | null> {
    return new Promise((resolve) => {
      if (!udp) return resolve(null);
      let done = false;
      const finish = (result: { ip: string; port: number } | null) => {
        if (done) return;
        done = true;
        if (socket) {
          try {
            socket.close();
          } catch {}
        }
        resolve(result);
      };
      let socket: UdpSocketInstance;
      try {
        socket = udp.createSocket({ type: "udp4", reusePort: true });
      } catch (err) {
        console.warn("[Party.client] udp create failed", err);
        return finish(null);
      }
      this.udpScanner = socket;
      socket.on("message", (data: unknown, rinfo: unknown) => {
        try {
          const info = rinfo as { address: string; port: number };
          const text = typeof data === "string" ? data : (data as { toString: (encoding: string) => string }).toString("utf8");
          const packet = JSON.parse(text) as DiscoveryPacket;
          if (packet?.aob === 1 && packet.code === code && typeof packet.tcpPort === "number") {
            console.log(`[Party.client] discovered host at ${info.address}:${packet.tcpPort}`);
            finish({ ip: info.address, port: packet.tcpPort });
          }
        } catch {}
      });
      socket.on("error", (err: unknown) => {
        console.warn("[Party.client] scan error", err);
      });
      try {
        socket.bind(PARTY_DISCOVERY_UDP_PORT);
      } catch (err) {
        console.warn("[Party.client] bind failed", err);
      }
      setTimeout(() => finish(null), timeoutMs);
    });
  }

  private async clientConnect(
    tcp: ReturnType<typeof loadNative>["tcp"],
    ip: string,
    port: number,
  ): Promise<void> {
    if (!tcp) return;
    return new Promise((resolve) => {
      const socket = tcp.createConnection({ host: ip, port }, () => {
        console.log(`[Party.client] connected to ${ip}:${port}`);
        this.clientSocket = socket;
        this.reconnectAttempt = 0;
        this.lastServerBeatAt = Date.now();
        this.setState({ connecting: false, connected: true, error: null });
        // Send HELLO immediately.
        this.send(socket, {
          t: "HELLO",
          from: this.myPeerId,
          name: this.myName,
          role: "player",
          code: this.state.roomCode ?? "",
        });
        // Push our characters up.
        this.send(socket, {
          t: "CHARACTER_UPDATE",
          from: this.myPeerId,
          characters: this.heroesOnly(this.myCharacters),
        });
        // Start heartbeat.
        if (this.clientHeartbeat) clearInterval(this.clientHeartbeat);
        this.clientHeartbeat = setInterval(() => {
          if (!this.clientSocket) return;
          if (Date.now() - this.lastServerBeatAt > PARTY_HEARTBEAT_TIMEOUT_MS) {
            console.log("[Party.client] host silent — attempting reconnect");
            this.clientRetry();
            return;
          }
          this.send(this.clientSocket, { t: "PING", ts: Date.now() });
        }, PARTY_HEARTBEAT_INTERVAL_MS);
        resolve();
      });
      if (socket.setEncoding) socket.setEncoding("utf8");
      socket.on("data", (chunk: unknown) => {
        const s = typeof chunk === "string" ? chunk : String(chunk);
        this.clientBuffer += s;
        const { messages, rest } = decodeMessages(this.clientBuffer);
        this.clientBuffer = rest;
        messages.forEach((msg) => this.clientHandleMessage(msg));
        this.lastServerBeatAt = Date.now();
      });
      socket.on("error", (err: unknown) => {
        console.warn("[Party.client] socket error", err);
      });
      socket.on("close", () => {
        console.log("[Party.client] socket closed");
        if (this.state.role === "client" && this.state.connected) {
          this.clientRetry();
        } else {
          resolve();
        }
      });
    });
  }

  private clientHandleMessage(msg: PartyMessage): void {
    switch (msg.t) {
      case "WELCOME":
        this.setState({ peers: msg.peers });
        break;
      case "PLAYER_JOINED":
        this.setState({ peers: [...this.state.peers.filter((p) => p.id !== msg.peer.id), msg.peer] });
        break;
      case "PLAYER_LEFT":
        this.setState({ peers: this.state.peers.filter((p) => p.id !== msg.peerId) });
        break;
      case "PARTY_STATE":
        this.setState({ sharedHeroes: msg.sharedHeroes, rollNotes: msg.rollNotes });
        break;
      case "ROLL_NOTES_UPDATE":
        this.setState({ rollNotes: msg.notes });
        break;
      case "ERROR":
        this.setState({ error: msg.message });
        if (msg.fatal) this.leaveParty();
        break;
      case "PING":
        if (this.clientSocket) this.send(this.clientSocket, { t: "PONG", ts: msg.ts });
        break;
      default:
        break;
    }
  }

  private clientRetry(): void {
    if (!this.state.roomCode || !this.state.hostIp || !this.state.hostPort) {
      this.setState({ connected: false, error: "Lost connection to the party." });
      return;
    }
    if (this.reconnectAttempt >= 5) {
      this.setState({ connected: false, error: "Lost connection to the party." });
      return;
    }
    this.reconnectAttempt++;
    console.log(`[Party.client] reconnect attempt ${this.reconnectAttempt}`);
    if (this.clientSocket) {
      try {
        this.clientSocket.destroy();
      } catch {}
    }
    this.clientSocket = null;
    this.clientBuffer = "";
    if (this.clientHeartbeat) clearInterval(this.clientHeartbeat);
    this.clientHeartbeat = null;

    const { tcp } = loadNative();
    if (!tcp) return;
    setTimeout(
      () => this.clientConnect(tcp, this.state.hostIp!, this.state.hostPort!),
      500 * this.reconnectAttempt,
    );
  }

  private send(socket: TcpSocket, msg: PartyMessage): void {
    try {
      socket.write(encodeMessage(msg));
    } catch (err) {
      console.warn("[Party] send failed", err);
    }
  }
}

// Singleton export.
export const partyManager = new PartyManager();
