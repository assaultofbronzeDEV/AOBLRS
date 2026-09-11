// Assault of Bronze — starter inventory library.
// Prices are baked into the label. Players may edit them freely after adding.

export type ItemCategory = "General Goods" | "Tools" | "Medical" | "Consumables" | "Misc";

export type ItemPreset = {
  id: string;
  name: string;
  price: string; // human-facing, e.g. "1g", "5s"
  category: ItemCategory;
  notes?: string;
};

export const ITEM_PRESETS: ItemPreset[] = [
  // ── General Goods ─────────────────────────────────
  { id: "backpack", name: "Backpack", price: "2g", category: "General Goods", notes: "Room for a small life." },
  { id: "rope-50ft", name: "Rope (50 ft)", price: "1g", category: "General Goods", notes: "Hemp. Worth its weight." },
  { id: "torch", name: "Torch", price: "1s", category: "General Goods", notes: "Burns ~1 hour." },
  { id: "lantern", name: "Lantern", price: "5g", category: "General Goods", notes: "Steadier than a torch, needs oil." },
  { id: "oil-flask", name: "Oil Flask", price: "1s", category: "General Goods", notes: "Fills a lantern. Also flammable." },
  { id: "bedroll", name: "Bedroll", price: "1g", category: "General Goods", notes: "Sleep on rocks with dignity." },
  { id: "blanket", name: "Blanket", price: "5s", category: "General Goods", notes: "Old and warm." },
  { id: "waterskin", name: "Waterskin", price: "2s", category: "General Goods", notes: "Holds a day's water." },
  { id: "rations", name: "Rations (1 day)", price: "5s", category: "General Goods", notes: "Dry. Filling. Tasteless." },
  { id: "tinderbox", name: "Tinderbox", price: "5s", category: "General Goods", notes: "Flint, steel, tinder." },
  { id: "candles", name: "Candles (×5)", price: "1s", category: "General Goods" },
  { id: "sack", name: "Sack", price: "5b", category: "General Goods", notes: "Holds ~30 lb." },

  // ── Tools ─────────────────────────────────────────
  { id: "thieves-tools", name: "Thieves' Tools", price: "25g", category: "Tools", notes: "Picks, tension bars, a lucky charm." },
  { id: "climbing-kit", name: "Climbing Kit", price: "25g", category: "Tools", notes: "Pitons, hammer, harness." },
  { id: "crowbar", name: "Crowbar", price: "2g", category: "Tools", notes: "Doors, crates, teeth." },
  { id: "grappling-hook", name: "Grappling Hook", price: "2g", category: "Tools" },
  { id: "hammer", name: "Hammer", price: "1g", category: "Tools" },
  { id: "shovel", name: "Shovel", price: "2g", category: "Tools" },
  { id: "fishing-kit", name: "Fishing Kit", price: "1g", category: "Tools", notes: "Line, hooks, patience." },
  { id: "chalk-10", name: "Chalk (×10)", price: "1s", category: "Tools", notes: "Mark your path. Or don't." },
  { id: "spyglass", name: "Spyglass", price: "1000g", category: "Tools", notes: "See trouble a mile off." },
  { id: "manacles", name: "Manacles", price: "2g", category: "Tools" },

  // ── Medical ───────────────────────────────────────
  { id: "bandages", name: "Bandages", price: "5s", category: "Medical", notes: "Roll of clean linen." },
  { id: "healing-salve", name: "Healing Salve", price: "10g", category: "Medical", notes: "Restores 1d4 HP on use." },
  { id: "antidote", name: "Antidote", price: "25g", category: "Medical", notes: "Neutralises common poisons." },
  { id: "herb-bundle", name: "Herb Bundle", price: "3g", category: "Medical", notes: "For poultices and steeping." },
  { id: "bloodmoss-poultice", name: "Bloodmoss Poultice", price: "5g", category: "Medical", notes: "Stops the bleeding. Smells foul." },
  { id: "healers-kit", name: "Healer's Kit (10 uses)", price: "5g", category: "Medical" },

  // ── Consumables ──────────────────────────────────
  { id: "potion-healing", name: "Potion of Healing", price: "50g", category: "Consumables", notes: "Heals 2d4+2 HP." },
  { id: "potion-vigor", name: "Potion of Vigour", price: "75g", category: "Consumables", notes: "Advantage on next Vitality roll." },
  { id: "smoke-bomb", name: "Smoke Bomb", price: "10g", category: "Consumables", notes: "Fills a 10 ft cube. One escape." },
  { id: "alchemist-fire", name: "Alchemist's Fire", price: "50g", category: "Consumables", notes: "Thrown flask. 1d6 fire, burns on." },
  { id: "acid-vial", name: "Vial of Acid", price: "25g", category: "Consumables", notes: "Eats through most locks. Slowly." },
  { id: "holy-water", name: "Holy Water", price: "25g", category: "Consumables", notes: "Blessed. Damages the unholy." },

  // ── Misc ─────────────────────────────────────────
  { id: "playing-cards", name: "Playing Cards", price: "5s", category: "Misc", notes: "Loaded, obviously." },
  { id: "dice-set", name: "Dice Set", price: "5s", category: "Misc" },
  { id: "lucky-charm", name: "Lucky Charm", price: "1g", category: "Misc", notes: "It's working, isn't it?" },
  { id: "signet-ring", name: "Signet Ring", price: "5g", category: "Misc", notes: "Marks correspondence — and enemies." },
  { id: "perfume", name: "Perfume Vial", price: "5g", category: "Misc" },
  { id: "coin-pouch", name: "Coin Pouch", price: "5s", category: "Misc" },
  { id: "journal", name: "Journal & Quill", price: "3g", category: "Misc", notes: "Blank pages. Ink and worries." },
  { id: "holy-symbol", name: "Holy Symbol", price: "25g", category: "Misc" },
  { id: "small-mirror", name: "Small Mirror", price: "5g", category: "Misc", notes: "For signaling. Or vanity." },
  { id: "map-case", name: "Map Case", price: "1g", category: "Misc" },
];

// Order for section rendering.
export const ITEM_CATEGORY_ORDER: ItemCategory[] = [
  "General Goods",
  "Tools",
  "Medical",
  "Consumables",
  "Misc",
];
