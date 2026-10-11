// End-to-end tests for the Party room Worker. Run against a local worker:
//
//   (in /frontend)   npx wrangler dev --port 8787
//   (in another)     PARTY_URL=http://localhost:8787 node --test worker/party.e2e.test.mjs

import test from "node:test";
import assert from "node:assert/strict";

const BASE = process.env.PARTY_URL ?? "http://localhost:8787";
const WS_BASE = BASE.replace(/^http/, "ws");
const V = 2;

async function createRoom() {
  const res = await fetch(`${BASE}/api/party`, { method: "POST" });
  assert.equal(res.status, 201);
  const body = await res.json();
  assert.match(body.code, /^[A-HJKMNP-Z2-9]{6}$/);
  assert.ok(body.gmToken.length >= 32);
  return body;
}

function hero(id, name, hp = 10) {
  return { id, kind: "hero", name, hp, maxHp: 10, stats: [], rollHistory: [], portraitUri: "data:image/png;base64,AAAA" };
}

function connect(code) {
  const ws = new WebSocket(`${WS_BASE}/api/party/${code}/ws`);
  const inbox = [];
  const waiters = [];
  ws.addEventListener("message", (e) => {
    const msg = JSON.parse(e.data);
    inbox.push(msg);
    waiters.slice().forEach((w) => w());
  });
  const client = {
    ws,
    inbox,
    open: new Promise((resolve, reject) => {
      ws.addEventListener("open", resolve);
      ws.addEventListener("error", () => reject(new Error("ws error")));
    }),
    send: (msg) => ws.send(JSON.stringify(msg)),
    // Resolves with the first matching message (including ones already received).
    waitFor(predicate, timeoutMs = 4000) {
      return new Promise((resolve, reject) => {
        const check = () => {
          const found = inbox.find(predicate);
          if (found) {
            const i = waiters.indexOf(check);
            if (i >= 0) waiters.splice(i, 1);
            clearTimeout(timer);
            resolve(found);
            return true;
          }
          return false;
        };
        const timer = setTimeout(() => {
          const i = waiters.indexOf(check);
          if (i >= 0) waiters.splice(i, 1);
          reject(new Error("timed out waiting for message"));
        }, timeoutMs);
        if (!check()) waiters.push(check);
      });
    },
    // Latest PARTY_STATE satisfying the predicate (checked against new states).
    async waitForState(predicate, timeoutMs = 4000) {
      const start = Date.now();
      while (Date.now() - start < timeoutMs) {
        const states = inbox.filter((m) => m.t === "PARTY_STATE" || m.t === "WELCOME");
        const latest = states[states.length - 1];
        if (latest && predicate(latest)) return latest;
        await new Promise((r) => setTimeout(r, 25));
      }
      throw new Error("timed out waiting for state");
    },
    close: () => ws.close(),
  };
  return client;
}

async function joinGm(room, name = "GM") {
  const c = connect(room.code);
  await c.open;
  c.send({ t: "HELLO", v: V, name, role: "gm", gmToken: room.gmToken });
  const welcome = await c.waitFor((m) => m.t === "WELCOME");
  return Object.assign(c, { welcome });
}

async function joinPlayer(code, name, extra = {}) {
  const c = connect(code);
  await c.open;
  c.send({ t: "HELLO", v: V, name, role: "player", ...extra });
  const welcome = await c.waitFor((m) => m.t === "WELCOME");
  return Object.assign(c, { welcome });
}

test("room codes are unique-ish and the GM gets a token", async () => {
  const a = await createRoom();
  const b = await createRoom();
  assert.notEqual(a.code, b.code);
  assert.notEqual(a.gmToken, b.gmToken);
});

test("joining a room that does not exist is rejected", async () => {
  const c = connect("ABCDEF");
  await c.open;
  const err = await c.waitFor((m) => m.t === "ERROR");
  assert.equal(err.fatal, true);
  c.close();
});

test("invalid room code never opens a socket", async () => {
  const ws = new WebSocket(`${WS_BASE}/api/party/NOPE/ws`);
  const outcome = await new Promise((resolve) => {
    ws.addEventListener("open", () => resolve("open"));
    ws.addEventListener("error", () => resolve("error"));
    ws.addEventListener("close", () => resolve("close"));
  });
  assert.notEqual(outcome, "open");
});

test("cross-site origin is rejected", async () => {
  const res = await fetch(`${BASE}/api/party`, { method: "POST", headers: { Origin: "https://evil.example" } });
  assert.equal(res.status, 403);
});

test("a wrong GM token cannot take over the room", async () => {
  const room = await createRoom();
  const c = connect(room.code);
  await c.open;
  c.send({ t: "HELLO", v: V, name: "Mallory", role: "gm", gmToken: "0".repeat(48) });
  const err = await c.waitFor((m) => m.t === "ERROR");
  assert.equal(err.fatal, true);
  c.close();
});

test("heroes published by players are shared live, read-only, without portraits", async () => {
  const room = await createRoom();
  const gm = await joinGm(room);
  const alice = await joinPlayer(room.code, "Alice");
  const bob = await joinPlayer(room.code, "Bob");

  alice.send({ t: "CHARACTER_UPDATE", characters: [hero("a1", "Alice Hero", 10)] });
  bob.send({ t: "CHARACTER_UPDATE", characters: [hero("b1", "Bob Hero", 9)] });

  const seen = await gm.waitForState((s) => s.sharedHeroes.length === 2);
  assert.deepEqual(seen.sharedHeroes.map((h) => h.id).sort(), ["a1", "b1"]);
  assert.ok(seen.sharedHeroes.every((h) => h.portraitUri === undefined));

  // Live HP edit by the owner reaches everyone.
  alice.send({ t: "CHARACTER_UPDATE", characters: [hero("a1", "Alice Hero", 4)] });
  const bobSees = await bob.waitForState((s) => s.sharedHeroes.find((h) => h.id === "a1")?.hp === 4);
  assert.equal(bobSees.sharedHeroes.find((h) => h.id === "a1").hp, 4);
  [gm, alice, bob].forEach((c) => c.close());
});

test("nobody can overwrite or hijack another player's hero", async () => {
  const room = await createRoom();
  const gm = await joinGm(room);
  const alice = await joinPlayer(room.code, "Alice");
  const mallory = await joinPlayer(room.code, "Mallory");

  alice.send({ t: "CHARACTER_UPDATE", characters: [hero("a1", "Alice Hero", 10)] });
  await gm.waitForState((s) => s.sharedHeroes.some((h) => h.id === "a1"));

  mallory.send({ t: "CHARACTER_UPDATE", characters: [hero("a1", "Pwned", 1), hero("m1", "Mallory Hero", 7)] });
  const state = await gm.waitForState((s) => s.sharedHeroes.some((h) => h.id === "m1"));
  const a1 = state.sharedHeroes.find((h) => h.id === "a1");
  assert.equal(a1.name, "Alice Hero");
  assert.equal(a1.hp, 10);

  // The GM has no way to edit a player's hero either.
  gm.send({ t: "CHARACTER_UPDATE", characters: [hero("a1", "GM Edit", 99)] });
  await new Promise((r) => setTimeout(r, 200));
  const after = await alice.waitForState((s) => s.sharedHeroes.some((h) => h.id === "a1"));
  assert.equal(after.sharedHeroes.find((h) => h.id === "a1").name, "Alice Hero");
  [gm, alice, mallory].forEach((c) => c.close());
});

test("monsters are never shared", async () => {
  const room = await createRoom();
  const gm = await joinGm(room);
  gm.send({ t: "CHARACTER_UPDATE", characters: [{ ...hero("m", "Goblin"), kind: "monster" }, hero("h", "Hero")] });
  const state = await gm.waitForState((s) => s.sharedHeroes.some((h) => h.id === "h"));
  assert.deepEqual(state.sharedHeroes.map((h) => h.id), ["h"]);
  gm.close();
});

test("only the GM can edit roll notes", async () => {
  const room = await createRoom();
  const gm = await joinGm(room);
  const alice = await joinPlayer(room.code, "Alice");

  alice.send({ t: "ROLL_NOTES_UPDATE", notes: { x: "player note" } });
  await alice.waitFor((m) => m.t === "ERROR" && !m.fatal);

  gm.send({ t: "ROLL_NOTES_UPDATE", notes: { x: "gm note" } });
  const state = await alice.waitForState((s) => s.rollNotes?.x === "gm note");
  assert.equal(state.rollNotes.x, "gm note");
  [gm, alice].forEach((c) => c.close());
});

test("a player can resume with their peer id and secret", async () => {
  const room = await createRoom();
  const gm = await joinGm(room);
  const alice = await joinPlayer(room.code, "Alice");
  alice.send({ t: "CHARACTER_UPDATE", characters: [hero("a1", "Alice Hero", 10)] });
  await gm.waitForState((s) => s.sharedHeroes.length === 1);

  const { you, secret } = alice.welcome;
  alice.close();
  await gm.waitForState((s) => s.sharedHeroes.length === 0);

  const again = await joinPlayer(room.code, "Alice", { peerId: you.id, secret });
  assert.equal(again.welcome.you.id, you.id);
  await gm.waitForState((s) => s.sharedHeroes.length === 1);

  // A wrong secret does not resume that identity.
  const imposter = await joinPlayer(room.code, "Imposter", { peerId: you.id, secret: "bad" });
  assert.notEqual(imposter.welcome.you.id, you.id);
  [gm, again, imposter].forEach((c) => c.close());
});

test("ending the party closes the room for good", async () => {
  const room = await createRoom();
  const gm = await joinGm(room);
  const alice = await joinPlayer(room.code, "Alice");
  gm.send({ t: "END_PARTY" });
  const err = await alice.waitFor((m) => m.t === "ERROR" && m.fatal);
  assert.match(err.message, /ended/i);

  await new Promise((r) => setTimeout(r, 200));
  const late = connect(room.code);
  await late.open;
  const lateErr = await late.waitFor((m) => m.t === "ERROR");
  assert.equal(lateErr.fatal, true);
  late.close();
});

test("old protocol versions are refused", async () => {
  const room = await createRoom();
  const c = connect(room.code);
  await c.open;
  c.send({ t: "HELLO", v: 1, name: "Old", role: "player" });
  const err = await c.waitFor((m) => m.t === "ERROR");
  assert.equal(err.fatal, true);
  c.close();
});
