import { Currency } from "@/src/types";

const BRONZE_PER_SILVER = 10;
const BRONZE_PER_GOLD = 100;

// Parses baked-in price labels like "25g", "5s", "2b", or "Free" into bronze units.
export function parsePriceToBronze(price?: string): number {
  if (!price) return 0;
  const trimmed = price.trim().toLowerCase();
  if (!trimmed || trimmed === "free") return 0;
  const match = trimmed.match(/^(\d+(?:\.\d+)?)\s*(g|s|b)$/);
  if (!match) return 0;
  const amount = parseFloat(match[1]);
  if (match[2] === "g") return Math.round(amount * BRONZE_PER_GOLD);
  if (match[2] === "s") return Math.round(amount * BRONZE_PER_SILVER);
  return Math.round(amount);
}

export function formatBronze(total: number): string {
  if (total <= 0) return "Free";
  const gold = Math.floor(total / BRONZE_PER_GOLD);
  const silver = Math.floor((total % BRONZE_PER_GOLD) / BRONZE_PER_SILVER);
  const bronze = total % BRONZE_PER_SILVER;
  const parts: string[] = [];
  if (gold > 0) parts.push(`${gold}g`);
  if (silver > 0) parts.push(`${silver}s`);
  if (bronze > 0 || parts.length === 0) parts.push(`${bronze}b`);
  return parts.join(" ");
}

export function currencyToBronze(currency: Currency): number {
  return currency.gold * BRONZE_PER_GOLD + currency.silver * BRONZE_PER_SILVER + currency.bronze;
}

// Re-denominates the gold/silver/bronze purse after spending, keeping other currencies untouched.
export function bronzeToCurrency(total: number, currency: Currency): Currency {
  const clamped = Math.max(0, total);
  const gold = Math.floor(clamped / BRONZE_PER_GOLD);
  const silver = Math.floor((clamped % BRONZE_PER_GOLD) / BRONZE_PER_SILVER);
  const bronze = clamped % BRONZE_PER_SILVER;
  return { ...currency, gold, silver, bronze };
}
