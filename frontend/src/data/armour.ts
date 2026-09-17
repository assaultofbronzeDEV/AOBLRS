import type { Armour } from "@/src/types";

export type ArmourPreset = Omit<Armour, "id"> & {
  id: string;
  category: "Light" | "Medium" | "Heavy";
};

export const ARMOUR_CATEGORY_ORDER = ["Light", "Medium", "Heavy"];

export const ARMOUR_PRESETS: ArmourPreset[] = [
  { id: "padded", name: "Padded Armour", description: "Quilted layers that soften glancing blows.", movementSpeed: "30", damageReduction: "1", category: "Light" },
  { id: "leather", name: "Leather Armour", description: "Supple hide reinforced at the vital points.", movementSpeed: "30", damageReduction: "2", category: "Light" },
  { id: "chain-shirt", name: "Chain Shirt", description: "Linked rings worn beneath a tunic or coat.", movementSpeed: "25", damageReduction: "3", category: "Medium" },
  { id: "scale", name: "Scale Armour", description: "Overlapping metal scales with a balanced weight.", movementSpeed: "25", damageReduction: "4", category: "Medium" },
  { id: "chainmail", name: "Chainmail", description: "Heavy linked rings built to endure the front line.", movementSpeed: "20", damageReduction: "5", category: "Heavy" },
  { id: "plate", name: "Plate Armour", description: "Full forged plates offering formidable protection.", movementSpeed: "15", damageReduction: "6", category: "Heavy" },
];
