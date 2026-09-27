import { StatKey, StatRef } from "@/src/types";

// Sub-skill order must match defaultHeroStats() in src/types.ts.
const SUB_NAMES: Record<StatKey, string[]> = {
  STR: ["Lifting", "Climbing", "Intimidation", "Vitality"],
  DEX: ["Melee Attack", "Ranged Attack", "Sleight of Hand", "Stealth"],
  INT: ["Perception", "Investigation", "History", "First Aid"],
  CHA: ["Persuasion", "Deception", "Haggling", "Creature Handling"],
};

const STAT_KEYWORDS: { pattern: RegExp; ref: StatRef }[] = [
  { pattern: /intelligence|concentration/i, ref: { kind: "main", statKey: "INT" } },
  { pattern: /dexterity|agility|reflex/i, ref: { kind: "main", statKey: "DEX" } },
  { pattern: /strength/i, ref: { kind: "main", statKey: "STR" } },
  { pattern: /charisma/i, ref: { kind: "main", statKey: "CHA" } },
  { pattern: /melee/i, ref: { kind: "sub", statKey: "DEX", subIndex: 0 } },
  { pattern: /ranged/i, ref: { kind: "sub", statKey: "DEX", subIndex: 1 } },
  { pattern: /sleight/i, ref: { kind: "sub", statKey: "DEX", subIndex: 2 } },
  { pattern: /stealth/i, ref: { kind: "sub", statKey: "DEX", subIndex: 3 } },
  { pattern: /perception/i, ref: { kind: "sub", statKey: "INT", subIndex: 0 } },
  { pattern: /investigation/i, ref: { kind: "sub", statKey: "INT", subIndex: 1 } },
  { pattern: /history/i, ref: { kind: "sub", statKey: "INT", subIndex: 2 } },
  { pattern: /first aid/i, ref: { kind: "sub", statKey: "INT", subIndex: 3 } },
  { pattern: /persuasion/i, ref: { kind: "sub", statKey: "CHA", subIndex: 0 } },
  { pattern: /deception/i, ref: { kind: "sub", statKey: "CHA", subIndex: 1 } },
  { pattern: /haggling/i, ref: { kind: "sub", statKey: "CHA", subIndex: 2 } },
  { pattern: /creature handling/i, ref: { kind: "sub", statKey: "CHA", subIndex: 3 } },
  { pattern: /lifting/i, ref: { kind: "sub", statKey: "STR", subIndex: 0 } },
  { pattern: /climbing/i, ref: { kind: "sub", statKey: "STR", subIndex: 1 } },
  { pattern: /intimidation/i, ref: { kind: "sub", statKey: "STR", subIndex: 2 } },
  { pattern: /swimming|defensive|vitality/i, ref: { kind: "sub", statKey: "STR", subIndex: 3 } },
];

function resolveStatFromPhrase(phrase: string): StatRef | undefined {
  const found = STAT_KEYWORDS.find((entry) => entry.pattern.test(phrase));
  return found?.ref;
}

export function labelForStatRef(statRef: StatRef): string {
  if (statRef.kind === "main") return statRef.statKey;
  return SUB_NAMES[statRef.statKey][statRef.subIndex ?? 0] ?? statRef.statKey;
}

// Matches wording like "+1d4 to your next Intelligence roll" or "-1d6 to defensive rolls".
const NEXT_ROLL_RE = /([+-]\d+d\d+(?:[+-]\d+)?)\s+to\s+(?:your\s+)?(?:next\s+)?([a-z][a-z\s-]*?)\s*rolls?\b/gi;

// Matches wording like "Gain advantage on your next Stealth roll" or "disadvantage on next Strength rolls".
const NEXT_ROLL_MODE_RE = /\b(advantage|disadvantage)\b(?:\s+on)?\s+(?:your\s+)?(?:next\s+)?([a-z][a-z\s-]*?)\s*rolls?\b/gi;

export type QueuedRollEffect = { notation: string; mode?: "advantage" | "disadvantage"; statRef: StatRef };

export function parseNextRollBonus(description: string): QueuedRollEffect | null {
  if (!description) return null;
  NEXT_ROLL_RE.lastIndex = 0;
  let match: RegExpExecArray | null;
  while ((match = NEXT_ROLL_RE.exec(description))) {
    const statRef = resolveStatFromPhrase(match[2]);
    if (statRef) return { notation: match[1], statRef };
  }
  NEXT_ROLL_MODE_RE.lastIndex = 0;
  while ((match = NEXT_ROLL_MODE_RE.exec(description))) {
    const statRef = resolveStatFromPhrase(match[2]);
    if (statRef) return { notation: "", mode: match[1].toLowerCase() as "advantage" | "disadvantage", statRef };
  }
  return null;
}

export function statRefsMatch(a: StatRef, b: StatRef): boolean {
  return a.kind === b.kind && a.statKey === b.statKey && (a.subIndex ?? null) === (b.subIndex ?? null);
}
