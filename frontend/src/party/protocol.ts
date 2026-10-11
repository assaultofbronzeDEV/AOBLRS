// Wire protocol for Party rooms. The GM and players all connect to a room
// Durable Object (see /worker/index.ts) over a WebSocket and exchange one JSON
// message per frame. This file is shared by the app and the Worker, so it must
// only contain runtime-safe code (no React Native imports).

import type { Character } from "@/src/types";

export const PARTY_PROTOCOL_VERSION = 2;
export const PARTY_HEARTBEAT_INTERVAL_MS = 5000;
export const PARTY_HEARTBEAT_TIMEOUT_MS = 15000;
export const PARTY_MAX_MESSAGE_CHARS = 900_000;
export const PARTY_MAX_PLAYERS = 16;
export const PARTY_MAX_HEROES_PER_PEER = 12;
export const PARTY_MAX_HERO_CHARS = 200_000;
export const PARTY_MAX_PORTRAIT_CHARS = 60_000;
export const PARTY_PORTRAIT_PATTERN = /^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/;
export const PARTY_ROOM_CODE_LENGTH = 6;

// A-Z 2-9 without lookalikes (no I, L, O, 0, 1).
const ROOM_CODE_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
const ROOM_CODE_PATTERN = /^[A-HJKMNP-Z2-9]{6}$/;

export type PeerInfo = {
  id: string;
  name: string;
  role: "gm" | "player";
  joinedAt: string;
};

export type PartyMessage =
  | {
      t: "HELLO";
      v: number;
      name: string;
      role: "player" | "gm";
      gmToken?: string;
      peerId?: string;
      secret?: string;
    }
  | {
      t: "WELCOME";
      you: PeerInfo;
      secret: string;
      peers: PeerInfo[];
      sharedHeroes: Character[];
      rollNotes: Record<string, string>;
    }
  | { t: "ERROR"; message: string; fatal?: boolean }
  | { t: "PING"; ts: number }
  | { t: "PONG"; ts: number }
  | { t: "PLAYER_JOINED"; peer: PeerInfo }
  | { t: "PLAYER_LEFT"; peerId: string }
  | { t: "PARTY_STATE"; sharedHeroes: Character[]; rollNotes: Record<string, string> }
  // Owner -> room: the heroes this connection shares. Only the owner can ever
  // publish or change a hero; the room just relays the latest snapshot.
  | { t: "CHARACTER_UPDATE"; characters: Character[] }
  // GM -> room only.
  | { t: "ROLL_NOTES_UPDATE"; notes: Record<string, string> }
  | { t: "LEAVE" }
  | { t: "END_PARTY" };

export function isValidRoomCode(code: unknown): code is string {
  return typeof code === "string" && ROOM_CODE_PATTERN.test(code);
}

export function randomHex(byteCount: number): string {
  const bytes = new Uint8Array(byteCount);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

export function generateRoomCode(): string {
  const limit = 256 - (256 % ROOM_CODE_ALPHABET.length);
  let out = "";
  while (out.length < PARTY_ROOM_CODE_LENGTH) {
    const bytes = new Uint8Array(PARTY_ROOM_CODE_LENGTH);
    crypto.getRandomValues(bytes);
    for (const b of bytes) {
      // Reject the biased tail so every symbol is equally likely.
      if (b < limit && out.length < PARTY_ROOM_CODE_LENGTH) out += ROOM_CODE_ALPHABET[b % ROOM_CODE_ALPHABET.length];
    }
  }
  return out;
}
