// Dice-notation roller. Accepts groups such as "1d6", "2d8+3", and
// "1d20+1d10", plus the tabletop shorthand "1xD6" / "1*d6".
export type DiceRollResult = {
  total: number;
  rolls: number[];
  count: number;
  sides: number;
  modifier: number;
  notation: string;
};

const TERM_RE = /([+-]?)(?:(\d+)[x*]?d(\d+)|(\d+))/gy;

export function normalizeDiceNotation(raw: string): string | null {
  const compact = raw.replace(/\s+/g, "").toLowerCase();
  if (!compact) return null;

  const terms: string[] = [];
  let position = 0;
  let isFirstTerm = true;
  let hasDice = false;
  while (position < compact.length) {
    TERM_RE.lastIndex = position;
    const match = TERM_RE.exec(compact);
    if (!match || match.index !== position) return null;
    if (isFirstTerm && match[1] === "+") return null;

    const sign = match[1] || "";
    const term = match[2] && match[3] ? `${match[2]}d${match[3]}` : match[4];
    if (match[2] && match[3]) hasDice = true;
    terms.push(`${sign}${term}`);
    position = TERM_RE.lastIndex;
    isFirstTerm = false;
  }
  return terms.length > 0 && hasDice ? terms.join("") : null;
}

export function rollDice(notation: string): DiceRollResult | null {
  if (!notation || typeof notation !== "string") return null;
  const normalized = normalizeDiceNotation(notation);
  if (!normalized) return null;

  const rolls: number[] = [];
  let total = 0;
  let modifier = 0;
  let count = 0;
  let sides = 0;
  let position = 0;
  while (position < normalized.length) {
    TERM_RE.lastIndex = position;
    const match = TERM_RE.exec(normalized);
    if (!match) return null;
    const sign = match[1] === "-" ? -1 : 1;
    if (match[2] && match[3]) {
      const groupCount = Math.max(1, Math.min(20, parseInt(match[2], 10)));
      const groupSides = Math.max(2, Math.min(100, parseInt(match[3], 10)));
      if (count + groupCount > 100) return null;
      count += groupCount;
      sides = groupSides;
      for (let index = 0; index < groupCount; index++) {
        const roll = 1 + Math.floor(Math.random() * groupSides);
        rolls.push(roll);
        total += sign * roll;
      }
    } else if (match[4]) {
      const value = parseInt(match[4], 10) * sign;
      modifier += value;
      total += value;
    }
    position = TERM_RE.lastIndex;
  }

  return {
    total,
    rolls,
    count,
    sides,
    modifier,
    notation: normalized,
  };
}
