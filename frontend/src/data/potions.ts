export type PotionPreset = {
  id: string;
  name: string;
  description: string;
  ingredients: number;
  requiredLevel: number;
  effectRoll?: string;
};

export const POTION_PRESETS: PotionPreset[] = [
  {
    id: "healing-potion",
    name: "Healing Potion",
    description: "Restore a small amount of health.",
    ingredients: 1,
    requiredLevel: 1,
    effectRoll: "1d6+2 healing",
  },
  {
    id: "swiftness-potion",
    name: "Potion of Swiftness",
    description: "Gain advantage on your next movement or agility check.",
    ingredients: 2,
    requiredLevel: 2,
  },
  {
    id: "stoneskin-potion",
    name: "Stoneskin Draught",
    description: "Reduce incoming damage by 2 for the next three hits.",
    ingredients: 3,
    requiredLevel: 3,
  },
  {
    id: "greater-healing-potion",
    name: "Greater Healing Potion",
    description: "Restore a substantial amount of health.",
    ingredients: 4,
    requiredLevel: 4,
    effectRoll: "2d8+4 healing",
  },
  {
    id: "elixir-of-might",
    name: "Elixir of Might",
    description: "Gain advantage on your next attack and deal +2 damage on a hit.",
    ingredients: 5,
    requiredLevel: 5,
  },
];