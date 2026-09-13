// Wire protocol for Party host <-> client communication.
//
// Messages are framed as `<length>\n<json>` on the TCP stream, where <length>
// is the byte length of the JSON payload in ASCII. This is simpler and more
// portable than binary length prefixes and is trivial to debug with tcpdump.

import type { Character } from "@/src/types";

export const PARTY_PROTOCOL_VERSION = 1;
export const PARTY_DEFAULT_TCP_PORT_MIN = 47000;
export const PARTY_DEFAULT_TCP_PORT_MAX = 47999;
export const PARTY_DISCOVERY_UDP_PORT = 53317;
export const PARTY_DISCOVERY_BROADCAST_INTERVAL_MS = 1500;
export const PARTY_HEARTBEAT_INTERVAL_MS = 5000;
export const PARTY_HEARTBEAT_TIMEOUT_MS = 15000;

export type PeerInfo = {
  id: string;
  name: string;
  role: "gm" | "player";
  joinedAt: string;
};

// ---------- Message envelope ----------
export type PartyMessage =
  | { t: "HELLO"; from: string; name: string; role: "player" | "gm"; code: string }
  | { t: "WELCOME"; you: PeerInfo; peers: PeerInfo[] }
  | { t: "ERROR"; message: string; fatal?: boolean }
  | { t: "PING"; ts: number }
  | { t: "PONG"; ts: number }
  | { t: "PLAYER_JOINED"; peer: PeerInfo }
  | { t: "PLAYER_LEFT"; peerId: string }
  | { t: "PARTY_STATE"; sharedHeroes: Character[]; rollNotes: Record<string, string> }
  | { t: "CHARACTER_UPDATE"; from: string; characters: Character[] } // player -> host: my heroes
  | { t: "ROLL_NOTES_UPDATE"; notes: Record<string, string> }; // either direction

// ---------- UDP discovery packet ----------
// Broadcast periodically by the host so clients can find the host's TCP port
// by matching room code without needing to type an IP.
export type DiscoveryPacket = {
  aob: 1;
  code: string;
  tcpPort: number;
  gm: string;
  ts: number;
};

// ---------- Framing helpers ----------
export function encodeMessage(msg: PartyMessage): string {
  const body = JSON.stringify(msg);
  return `${body.length}\n${body}`;
}

// Parse framed messages from a rolling buffer. Returns any complete messages
// and the leftover unparsed tail.
export function decodeMessages(
  buffer: string,
): { messages: PartyMessage[]; rest: string } {
  const messages: PartyMessage[] = [];
  let rest = buffer;
  while (true) {
    const nl = rest.indexOf("\n");
    if (nl < 0) break;
    const header = rest.slice(0, nl);
    const len = parseInt(header, 10);
    if (!Number.isFinite(len) || len < 0 || len > 10 * 1024 * 1024) {
      // corrupt frame – drop the buffer to resync.
      rest = "";
      break;
    }
    if (rest.length < nl + 1 + len) break; // wait for more bytes
    const body = rest.slice(nl + 1, nl + 1 + len);
    try {
      const msg = JSON.parse(body) as PartyMessage;
      messages.push(msg);
    } catch {
      // malformed json – skip
    }
    rest = rest.slice(nl + 1 + len);
  }
  return { messages, rest };
}

// Short room code A-Z 2-9 (avoiding lookalikes) — 6 chars, ~1 billion combos.
export function generateRoomCode(): string {
  const alphabet = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
  let out = "";
  for (let i = 0; i < 6; i++) {
    out += alphabet[Math.floor(Math.random() * alphabet.length)];
  }
  return out;
}

// Random peer id.
export function generatePeerId(): string {
  const bytes = new Array(8)
    .fill(0)
    .map(() => Math.floor(Math.random() * 256).toString(16).padStart(2, "0"))
    .join("");
  return bytes;
}
