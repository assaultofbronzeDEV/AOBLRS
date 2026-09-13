// Unit test for the Party wire protocol. Runs in plain Node — no native
// modules required. Use: npx ts-node src/party/__tests__/protocol.test.ts
//
// This proves that character updates round-trip correctly across the framing
// layer, which is the only piece we can exercise inside the sandbox.

import {
  decodeMessages,
  encodeMessage,
  generatePeerId,
  generateRoomCode,
  PartyMessage,
} from "../protocol";
import type { Character } from "@/src/types";

let passed = 0;
let failed = 0;
const check = (name: string, cond: boolean) => {
  if (cond) {
    passed++;
    console.log(`  ✓ ${name}`);
  } else {
    failed++;
    console.log(`  ✗ ${name}`);
  }
};

console.log("Party protocol tests");
console.log("--------------------");

// 1. Encode/decode round-trip.
const hello: PartyMessage = {
  t: "HELLO",
  from: "abc123",
  name: "Alice",
  role: "player",
  code: "TESTCD",
};
const encoded = encodeMessage(hello);
const { messages, rest } = decodeMessages(encoded);
check("single message decodes", messages.length === 1);
check("no trailing bytes", rest === "");
check("payload preserved", JSON.stringify(messages[0]) === JSON.stringify(hello));

// 2. Multiple messages on one stream.
const a = encodeMessage({ t: "PING", ts: 1 });
const b = encodeMessage({ t: "PONG", ts: 2 });
const c = encodeMessage({ t: "PLAYER_LEFT", peerId: "x" });
const combo = decodeMessages(a + b + c);
check("three messages decode together", combo.messages.length === 3);
check(
  "messages in order",
  combo.messages[0].t === "PING" &&
    combo.messages[1].t === "PONG" &&
    combo.messages[2].t === "PLAYER_LEFT",
);

// 3. Partial frame — half a message shouldn't be returned.
const half = encoded.slice(0, 5);
const partial = decodeMessages(half);
check("partial frame returns no messages", partial.messages.length === 0);
check("partial frame preserves rest", partial.rest === half);

// 4. Character update payload survives round-trip with typical Character fields.
const character = {
  id: "abc",
  kind: "hero" as const,
  name: "Grimjaw",
  className: "Warrior",
  level: "1",
  hp: 12,
  maxHp: 20,
  armour: "14",
  meleeDmg: "1d6",
  stats: [{ key: "STR", name: "STR", value: 6, subs: [] }],
  oncePerTurn: [],
  oncePerRest: [],
  heroAbilities: [],
  heroPoints: 0,
  currency: { gold: 5, silver: 0, bronze: 3 },
  backstory: "",
  inventory: "",
  inventoryItems: [],
  notes: "",
  customSections: [],
  weapons: [],
  rollHistory: [],
  createdAt: "",
  updatedAt: "",
} as unknown as Character;
const update: PartyMessage = {
  t: "CHARACTER_UPDATE",
  from: "peer1",
  characters: [character],
};
const roundTrip = decodeMessages(encodeMessage(update));
check("character update round-trips", roundTrip.messages.length === 1);
const back = roundTrip.messages[0] as Extract<PartyMessage, { t: "CHARACTER_UPDATE" }>;
check("hp preserved", back.characters[0].hp === 12);
check("currency preserved", (back.characters[0] as any).currency.gold === 5);

// 5. Corrupt header resyncs cleanly.
const corrupt = decodeMessages("not-a-number\nignored" + encoded);
check("corrupt frame resets buffer", corrupt.messages.length === 0);

// 6. Room codes are 6 chars from safe alphabet.
const code = generateRoomCode();
check("room code length is 6", code.length === 6);
check("room code no lookalikes", !/[01OIL]/.test(code));

// 7. Peer ids look random.
const id1 = generatePeerId();
const id2 = generatePeerId();
check("peer ids differ", id1 !== id2);
check("peer id hex", /^[0-9a-f]{16}$/.test(id1));

console.log("--------------------");
console.log(`${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
