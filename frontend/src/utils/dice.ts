// Minimal dice-notation roller. Supports patterns like "1d6", "2d8+3", "1d20-1".
// Returns null when the notation cannot be parsed.
export type DiceRollResult = {
  total: number;
  rolls: number[];
  count: number;
  sides: number;
  modifier: number;
  notation: string;
};

const RE = /^\s*(\d+)\s*[dD]\s*(\d+)\s*([+\-]\s*\d+)?\s*$/;

export function rollDice(notation: string): DiceRollResult | null {
  if (!notation || typeof notation !== "string") return null;
  const m = notation.match(RE);
  if (!m) return null;
  const count = Math.max(1, Math.min(20, parseInt(m[1], 10)));
  const sides = Math.max(2, Math.min(100, parseInt(m[2], 10)));
  const modifier = m[3] ? parseInt(m[3].replace(/\s+/g, ""), 10) : 0;
  const rolls: number[] = [];
  for (let i = 0; i < count; i++) {
    rolls.push(1 + Math.floor(Math.random() * sides));
  }
  const sum = rolls.reduce((a, b) => a + b, 0);
  return {
    total: sum + modifier,
    rolls,
    count,
    sides,
    modifier,
    notation: `${count}d${sides}${modifier ? (modifier > 0 ? `+${modifier}` : `${modifier}`) : ""}`,
  };
}
