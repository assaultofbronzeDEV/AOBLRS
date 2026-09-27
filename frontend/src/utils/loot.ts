// Pure random-loot helpers shared by the hero sheet's Loot button and GM Tools.
export type LootCandidate = { label: string; notes?: string };

export type LootCatalogInput = {
  weapons: { name: string; price?: string; notes?: string }[];
  armour: { name: string; price?: string; description?: string }[];
  potions: { name: string; description?: string }[];
  items: { name: string; price?: string; notes?: string }[];
};

export function buildLootCandidates(catalog: LootCatalogInput): LootCandidate[] {
  const weapons = catalog.weapons.map((w) => ({ label: w.price ? `${w.name} (${w.price})` : w.name, notes: w.notes }));
  const armour = catalog.armour.map((a) => ({ label: a.price ? `${a.name} (${a.price})` : a.name, notes: a.description }));
  const potions = catalog.potions.map((p) => ({ label: p.name, notes: p.description }));
  const items = catalog.items.map((i) => ({ label: i.price ? `${i.name} (${i.price})` : i.name, notes: i.notes }));
  return [...weapons, ...armour, ...potions, ...items];
}

export type LootResult = { items: LootCandidate[]; bonusBronze: number };

export function rollRandomLoot(candidates: LootCandidate[], countRange: [number, number] = [2, 4]): LootResult {
  if (candidates.length === 0) return { items: [], bonusBronze: 0 };
  const [min, max] = countRange;
  const count = min + Math.floor(Math.random() * (max - min + 1));
  const items: LootCandidate[] = [];
  for (let i = 0; i < count; i++) {
    items.push(candidates[Math.floor(Math.random() * candidates.length)]);
  }
  const bonusBronze = 5 + Math.floor(Math.random() * 46);
  return { items, bonusBronze };
}
