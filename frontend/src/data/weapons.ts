// Assault of Bronze — starter weapon library.
// Every entry can be dropped straight onto a hero's weapon list.
// Players may still craft custom weapons via the "+ Custom" button.

import type { AttackKind } from "@/src/types";

export type WeaponPreset = {
  id: string;
  name: string;
  price: string;
  attackKind: AttackKind;
  damageRoll: string;
  category: "Blades" | "Big Steel" | "Hafted" | "Brawler" | "Bows & Slings" | "Magic & Named";
  notes?: string;
};

export const WEAPON_PRESETS: WeaponPreset[] = [
  // Blades
  { id: "dagger", name: "Dagger", price: "2g", attackKind: "melee", damageRoll: "1d4+1", category: "Blades", notes: "Concealable. Cheap. Everywhere." },
  { id: "short-sword", name: "Short Sword", price: "10g", attackKind: "melee", damageRoll: "1d6+2", category: "Blades", notes: "Balanced. The soldier's staple." },
  { id: "longsword", name: "Longsword", price: "25g", attackKind: "melee", damageRoll: "1d8+2", category: "Blades", notes: "A knight's arm." },
  { id: "rapier", name: "Rapier", price: "30g", attackKind: "melee", damageRoll: "1d6+2", category: "Blades", notes: "Duelist's pick. Fast and cruel." },

  // Big Steel
  { id: "greatsword", name: "Greatsword", price: "75g", attackKind: "melee", damageRoll: "1d10+5", category: "Big Steel", notes: "Two hands. Wide arcs." },
  { id: "battle-axe", name: "Battle Axe", price: "35g", attackKind: "melee", damageRoll: "1d8+2", category: "Big Steel", notes: "Cleaves shields and hopes alike." },
  { id: "greataxe", name: "Greataxe", price: "60g", attackKind: "melee", damageRoll: "1d10+3", category: "Big Steel", notes: "Two-handed. Hell to swing, worse to catch." },

  // Hafted
  { id: "spear", name: "Spear", price: "5g", attackKind: "melee", damageRoll: "1d6", category: "Hafted", notes: "Reaches 10ft. Formation-friendly." },
  { id: "warhammer", name: "Warhammer", price: "20g", attackKind: "melee", damageRoll: "1d8+3", category: "Hafted", notes: "Crushes plate (and stubbornness)." },
  { id: "mace", name: "Mace", price: "15g", attackKind: "melee", damageRoll: "1d10", category: "Hafted", notes: "No edge, no problem." },
  { id: "quarterstaff", name: "Quarterstaff", price: "2g", attackKind: "melee", damageRoll: "1d6+5", category: "Hafted", notes: "Simple. Silent. Underrated." },
  { id: "halberd", name: "Halberd", price: "40g", attackKind: "melee", damageRoll: "1d10+3", category: "Hafted", notes: "Chop, thrust, hook — kill." },

  // Brawler
  { id: "bare-fists", name: "Bare Fists", price: "Free", attackKind: "melee", damageRoll: "1d6", category: "Brawler", notes: "Free. Always with you." },
  { id: "brass-knuckles", name: "Brass Knuckles", price: "8g", attackKind: "melee", damageRoll: "1d6+4", category: "Brawler", notes: "Tavern favourite. Fits a pocket." },
  { id: "club", name: "Club", price: "5s", attackKind: "melee", damageRoll: "1d8", category: "Brawler", notes: "Whatever was closest." },

  // Bows & Slings
  { id: "shortbow", name: "Shortbow", price: "25g", attackKind: "ranged", damageRoll: "1d6", category: "Bows & Slings", notes: "Quick draw, short range." },
  { id: "longbow", name: "Longbow", price: "50g", attackKind: "ranged", damageRoll: "1d8", category: "Bows & Slings", notes: "The longer the bow, the farther it flies." },
  { id: "crossbow", name: "Crossbow", price: "75g", attackKind: "ranged", damageRoll: "1d10", category: "Bows & Slings", notes: "Slow to load. Unforgiving on impact. IGNORES ARMOUR" },
  { id: "sling", name: "Sling", price: "1s", attackKind: "ranged", damageRoll: "1d4", category: "Bows & Slings", notes: "Stones. Free ammunition." },
  { id: "throwing-daggers", name: "Throwing Daggers", price: "15g", attackKind: "ranged", damageRoll: "1d6+1", category: "Bows & Slings", notes: "Don't forget these." },
  { id: "javelin", name: "Javelin", price: "2g", attackKind: "ranged", damageRoll: "1d6", category: "Bows & Slings", notes: "Thrown spear. One shot, big loud." },

  // Magic & Named
  { id: "Wand", name: "Wand", price: "100g", attackKind: "ranged", damageRoll: "1d6", category: "Magic & Named", notes: "The Power-Stone within acts as a perfect magical conduit." },
  { id: "Power-Stone Staff", name: "Power-Stone Staff", price: "250g", attackKind: "melee", damageRoll: "1d8", category: "Magic & Named", notes: "Half weapon, half walking stick." },
  { id: "weapon-of-khaliik", name: "Weapon of Khaliik", price: "1000g", attackKind: "melee", damageRoll: "1d20+5", category: "Magic & Named", notes: "Forged from the shape-shifting metal Stormsteel. Takes the form of your most required tool." },
];
