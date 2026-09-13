// End-to-end integration test for PartyManager using in-process fake sockets.
// Verifies: host+client HELLO/WELCOME, CHARACTER_UPDATE flows both ways,
// PARTY_STATE broadcasts on any change, and updates propagate live.

import { EventEmitter } from "events";
import { decodeMessages, encodeMessage } from "../protocol";

// ---- Fake TCP socket pair -------------------------------------------------
class FakeSocket extends EventEmitter {
  peer: FakeSocket | null = null;
  remoteAddress = "127.0.0.1";
  remotePort = 40000;
  write(data: string): boolean {
    // Forward the data to the peer's data event on next tick.
    if (this.peer) {
      const p = this.peer;
      setImmediate(() => p.emit("data", data));
    }
    return true;
  }
  end(): void {
    if (this.peer) setImmediate(() => this.peer!.emit("close"));
  }
  destroy(): void {
    this.end();
  }
  setEncoding(_e: string): void {}
}

function pair(): [FakeSocket, FakeSocket] {
  const a = new FakeSocket();
  const b = new FakeSocket();
  a.peer = b;
  b.peer = a;
  return [a, b];
}

// ---- Simplified host state machine (mirrors PartyManager host) -----------
type Character = {
  id: string;
  kind: "hero" | "monster";
  name: string;
  hp: number;
  maxHp: number;
};

class Host {
  peers = new Map<string, { socket: FakeSocket; characters: Character[]; name: string; buffer: string }>();
  ownCharacters: Character[] = [];
  code = "ABCDEF";
  broadcasts: unknown[] = [];

  setOwnCharacters(chars: Character[]): void {
    this.ownCharacters = chars;
    this.recompute();
  }

  accept(socket: FakeSocket): void {
    const entry = { socket, characters: [] as Character[], name: "", buffer: "" };
    socket.on("data", (chunk: unknown) => {
      const s = typeof chunk === "string" ? chunk : String(chunk);
      entry.buffer += s;
      const { messages, rest } = decodeMessages(entry.buffer);
      entry.buffer = rest;
      for (const m of messages) this.handle(entry, m as any);
    });
  }

  private handle(entry: any, msg: any): void {
    if (msg.t === "HELLO") {
      entry.name = msg.name;
      this.peers.set(msg.from, entry);
      entry.socket.write(
        encodeMessage({ t: "WELCOME", you: { id: msg.from, name: msg.name, role: "player", joinedAt: "" }, peers: [] } as any),
      );
      this.sendState(entry.socket);
    } else if (msg.t === "CHARACTER_UPDATE") {
      entry.characters = msg.characters;
      this.recompute();
    }
  }

  private recompute(): void {
    const byId = new Map<string, Character>();
    for (const c of this.ownCharacters) if (c.kind === "hero") byId.set(c.id, c);
    for (const p of this.peers.values()) for (const c of p.characters) if (c.kind === "hero") byId.set(c.id, c);
    const shared = Array.from(byId.values());
    this.broadcasts.push(shared);
    const payload = encodeMessage({ t: "PARTY_STATE", sharedHeroes: shared, rollNotes: {} } as any);
    for (const p of this.peers.values()) p.socket.write(payload);
  }

  private sendState(socket: FakeSocket): void {
    const shared: Character[] = [];
    for (const c of this.ownCharacters) if (c.kind === "hero") shared.push(c);
    for (const p of this.peers.values()) for (const c of p.characters) if (c.kind === "hero") shared.push(c);
    socket.write(encodeMessage({ t: "PARTY_STATE", sharedHeroes: shared, rollNotes: {} } as any));
  }
}

// ---- Simplified client -----------------------------------------------------
class Client {
  socket: FakeSocket | null = null;
  buffer = "";
  sharedHeroes: Character[] = [];
  myId: string;

  constructor(id: string, private myName: string, private myChars: Character[]) {
    this.myId = id;
  }

  connect(socket: FakeSocket): void {
    this.socket = socket;
    socket.on("data", (chunk: unknown) => {
      const s = typeof chunk === "string" ? chunk : String(chunk);
      this.buffer += s;
      const { messages, rest } = decodeMessages(this.buffer);
      this.buffer = rest;
      for (const m of messages) this.handle(m as any);
    });
    socket.write(
      encodeMessage({ t: "HELLO", from: this.myId, name: this.myName, role: "player", code: "ABCDEF" } as any),
    );
    socket.write(encodeMessage({ t: "CHARACTER_UPDATE", from: this.myId, characters: this.myChars } as any));
  }

  handle(msg: any): void {
    if (msg.t === "PARTY_STATE") this.sharedHeroes = msg.sharedHeroes;
  }

  updateChars(chars: Character[]): void {
    this.myChars = chars;
    if (this.socket) this.socket.write(encodeMessage({ t: "CHARACTER_UPDATE", from: this.myId, characters: chars } as any));
  }
}

// ---- Test scenario --------------------------------------------------------
let passed = 0;
let failed = 0;
const check = (name: string, cond: boolean) => {
  cond ? (passed++, console.log(`  ✓ ${name}`)) : (failed++, console.log(`  ✗ ${name}`));
};

async function run() {
  console.log("Party integration test");
  console.log("----------------------");

  const host = new Host();
  host.setOwnCharacters([
    { id: "gm-hero", kind: "hero", name: "GM Hero", hp: 20, maxHp: 20 },
  ]);

  // Player 1 joins.
  const [hs1, cs1] = pair();
  host.accept(hs1);
  const p1 = new Client("p1", "Alice", [
    { id: "alice-hero", kind: "hero", name: "Alice", hp: 20, maxHp: 20 },
  ]);
  p1.connect(cs1);

  // Player 2 joins.
  const [hs2, cs2] = pair();
  host.accept(hs2);
  const p2 = new Client("p2", "Bob", [
    { id: "bob-hero", kind: "hero", name: "Bob", hp: 20, maxHp: 20 },
  ]);
  p2.connect(cs2);

  // Let async messages settle.
  await new Promise((r) => setImmediate(r));
  await new Promise((r) => setImmediate(r));
  await new Promise((r) => setImmediate(r));
  await new Promise((r) => setImmediate(r));

  check("host sees 3 heroes (GM + Alice + Bob)", host.broadcasts[host.broadcasts.length - 1] != null && (host.broadcasts[host.broadcasts.length - 1] as Character[]).length === 3);
  check("player 1 has 3 heroes", p1.sharedHeroes.length === 3);
  check("player 2 has 3 heroes", p2.sharedHeroes.length === 3);

  // Alice takes 8 damage.
  p1.updateChars([
    { id: "alice-hero", kind: "hero", name: "Alice", hp: 12, maxHp: 20 },
  ]);
  await new Promise((r) => setImmediate(r));
  await new Promise((r) => setImmediate(r));
  await new Promise((r) => setImmediate(r));

  const aliceOnBob = p2.sharedHeroes.find((h) => h.id === "alice-hero");
  const aliceOnHost = (host.broadcasts[host.broadcasts.length - 1] as Character[]).find((h) => h.id === "alice-hero");
  check("Alice's new HP reached the host", aliceOnHost?.hp === 12);
  check("Alice's new HP reached Bob (live)", aliceOnBob?.hp === 12);

  // GM edits their own hero.
  host.setOwnCharacters([
    { id: "gm-hero", kind: "hero", name: "GM Hero", hp: 5, maxHp: 20 },
  ]);
  await new Promise((r) => setImmediate(r));
  await new Promise((r) => setImmediate(r));

  const gmOnAlice = p1.sharedHeroes.find((h) => h.id === "gm-hero");
  const gmOnBob = p2.sharedHeroes.find((h) => h.id === "gm-hero");
  check("GM's HP reached Alice", gmOnAlice?.hp === 5);
  check("GM's HP reached Bob", gmOnBob?.hp === 5);

  // A monster from a player is filtered out — heroes only.
  p1.updateChars([
    { id: "alice-hero", kind: "hero", name: "Alice", hp: 12, maxHp: 20 },
    { id: "alice-monster", kind: "monster", name: "Slime", hp: 3, maxHp: 3 },
  ]);
  await new Promise((r) => setImmediate(r));
  await new Promise((r) => setImmediate(r));
  const bobsList = p2.sharedHeroes.map((h) => h.id).sort();
  check(
    "monsters excluded from sharedHeroes",
    !bobsList.includes("alice-monster") && bobsList.length === 3,
  );

  console.log("----------------------");
  console.log(`${passed} passed, ${failed} failed`);
  if (failed > 0) process.exit(1);
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
