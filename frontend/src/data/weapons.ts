// Assault of Bronze — starter weapon library.
// Every entry can be dropped straight onto a hero's weapon list.
// Players may still craft custom weapons via the "+ Custom" button.

import type { AttackKind } from "@/src/types";

export type WeaponPreset = {
  id: string;
  name: string;
  attackKind: AttackKind;
  damageRoll: string;
  category: "Blades" | "Big Steel" | "Hafted" | "Brawler" | "Bows & Slings" | "Magic & Named";
  notes?: string;
};

export const WEAPON_PRESETS: WeaponPreset[] = [
  // Blades
  { id: "dagger", name: "Dagger", attackKind: "melee", damageRoll: "1d4", category: "Blades", notes: "Concealable. Cheap. Everywhere." },
  { id: "short-sword", name: "Short Sword", attackKind: "melee", damageRoll: "1d6", category: "Blades", notes: "Balanced. The soldier's staple." },
  { id: "longsword", name: "Longsword", attackKind: "melee", damageRoll: "1d8", category: "Blades", notes: "A knight's arm." },
  { id: "rapier", name: "Rapier", attackKind: "melee", damageRoll: "1d6", category: "Blades", notes: "Duelist's pick. Fast and cruel." },

  // Big Steel
  { id: "greatsword", name: "Greatsword", attackKind: "melee", damageRoll: "1d10", category: "Big Steel", notes: "Two hands. Wide arcs." },
  { id: "battle-axe", name: "Battle Axe", attackKind: "melee", damageRoll: "1d8", category: "Big Steel", notes: "Cleaves shields and hopes alike." },
  { id: "greataxe", name: "Greataxe", attackKind: "melee", damageRoll: "1d10", category: "Big Steel", notes: "Two-handed. Hell to swing, worse to catch." },

  // Hafted
  { id: "spear", name: "Spear", attackKind: "melee", damageRoll: "1d6", category: "Hafted", notes: "Reach. Formation-friendly." },
  { id: "warhammer", name: "Warhammer", attackKind: "melee", damageRoll: "1d8", category: "Hafted", notes: "Crushes plate and stubbornness." },
  { id: "mace", name: "Mace", attackKind: "melee", damageRoll: "1d6", category: "Hafted", notes: "No edge, no problem." },
  { id: "quarterstaff", name: "Quarterstaff", attackKind: "melee", damageRoll: "1d6", category: "Hafted", notes: "Simple. Silent. Underrated." },
  { id: "halberd", name: "Halberd", attackKind: "melee", damageRoll: "1d10", category: "Hafted", notes: "Chop, thrust, hook — pick a Tuesday." },

  // Brawler
  { id: "bare-fists", name: "Bare Fists", attackKind: "melee", damageRoll: "1d4", category: "Brawler", notes: "Free. Always with you." },
  { id: "brass-knuckles", name: "Brass Knuckles", attackKind: "melee", damageRoll: "1d4", category: "Brawler", notes: "Tavern favourite. Fits a pocket." },
  { id: "club", name: "Club", attackKind: "melee", damageRoll: "1d6", category: "Brawler", notes: "Whatever was closest." },

  // Bows & Slings
  { id: "shortbow", name: "Shortbow", attackKind: "ranged", damageRoll: "1d6", category: "Bows & Slings", notes: "Quick draw, short range." },
  { id: "longbow", name: "Longbow", attackKind: "ranged", damageRoll: "1d8", category: "Bows & Slings", notes: "Yard-long shafts. Yard-long reach." },
  { id: "crossbow", name: "Crossbow", attackKind: "ranged", damageRoll: "1d8", category: "Bows & Slings", notes: "Slow to load. Unforgiving on impact." },
  { id: "sling", name: "Sling", attackKind: "ranged", damageRoll: "1d4", category: "Bows & Slings", notes: "Stones. Free ammunition." },
  { id: "throwing-daggers", name: "Throwing Daggers", attackKind: "ranged", damageRoll: "1d4", category: "Bows & Slings", notes: "Bring plenty. You will not get them back." },
  { id: "javelin", name: "Javelin", attackKind: "ranged", damageRoll: "1d6", category: "Bows & Slings", notes: "Thrown spear. One shot, big loud." },

  // Magic & Named
  { id: "focus-wand", name: "Focus Wand", attackKind: "ranged", damageRoll: "1d6", category: "Magic & Named", notes: "For those who don't need string or steel." },
  { id: "runed-staff", name: "Runed Staff", attackKind: "melee", damageRoll: "1d6", category: "Magic & Named", notes: "Half weapon, half library." },
  { id: "weapon-of-khaliik", name: "Weapon of Khaliik", attackKind: "melee", damageRoll: "1d8", category: "Magic & Named", notes: "Forged in the black hills. Sings quietly before a kill." },
];
