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
  { id: "dagger", name: "Dagger", price: "2g", attackKind: "melee", damageRoll: "1d4+4", category: "Blades", notes: "Concealable. Cheap. Everywhere." },
  { id: "short-sword", name: "Short Sword", price: "10g", attackKind: "melee", damageRoll: "1d6+4", category: "Blades", notes: "Balanced. The soldier's staple." },
  { id: "longsword", name: "Longsword", price: "25g", attackKind: "melee", damageRoll: "1d8+4", category: "Blades", notes: "A knight's best defence is a good offence." },
  { id: "smallsword", name: "Smallsword", price: "30g", attackKind: "melee", damageRoll: "1d6+2", category: "Blades", notes: "Light and fast, You can attack twice per turn with this weapon." },

  // Big Steel
  { id: "battle-axe", name: "Battle Axe", price: "55g", attackKind: "melee", damageRoll: "1d10+3", category: "Big Steel", notes: "Cleaves shields and hopes alike.\nDAMAGES ARMOUR x1 per hit." },
  { id: "greataxe", name: "Greataxe", price: "100g", attackKind: "melee", damageRoll: "1d12+5", category: "Big Steel", notes: "Two-handed. Hell to swing, worse to be in the path of." },
  { id: "greatsword", name: "Greatsword", price: "75g", attackKind: "melee", damageRoll: "1d10+5", category: "Big Steel", notes: "Two hands. Heavy as hell." },

  // Hafted
  { id: "spear", name: "Spear", price: "5g", attackKind: "melee", damageRoll: "1d6+4", category: "Hafted", notes: "Reaches 10ft Melee. Can be used as ranged weapon up to 20ft. Formation-friendly." },
  { id: "warhammer", name: "Warhammer", price: "45g", attackKind: "melee", damageRoll: "1d10+5", category: "Hafted", notes: "Crushes Enemies.\nENEMIES MUST ROLL STR(Main) AND ON FAIL ARE KNOCKED PRONE (they must use their movement action to recover on their next turn)" },
  { id: "mace", name: "Mace", price: "15g", attackKind: "melee", damageRoll: "1d10+2", category: "Hafted", notes: "Nice and heavy, great at bludgeoning." },
  { id: "quarterstaff", name: "Quarterstaff", price: "2g", attackKind: "melee", damageRoll: "1d6+5", category: "Hafted", notes: "Simple. Silent. Underrated. Reaches 10ft Melee." },
  { id: "halberd", name: "Halberd", price: "40g", attackKind: "melee", damageRoll: "1d6+8", category: "Hafted", notes: "Chop, thrust, hook. There are many ways to kill with this weapon. Reaches 10ft Melee.\nDAMAGES ARMOUR x2 per hit." },

  // Brawler
  { id: "bare-fists", name: "Bare Fists", price: "Free", attackKind: "melee", damageRoll: "1d6", category: "Brawler", notes: "Free. Always with you." },
  { id: "brass-knuckles", name: "Brass Knuckles", price: "8g", attackKind: "melee", damageRoll: "1d6+3", category: "Brawler", notes: "A Brawlers favourite. Fits neatly into a pocket." },
  { id: "club", name: "Club", price: "5s", attackKind: "melee", damageRoll: "1d8", category: "Brawler", notes: "Sometimes you just have to use whatever was closest." },

  // Bows & Slings
  { id: "shortbow", name: "Shortbow", price: "25g", attackKind: "ranged", damageRoll: "1d6+2", category: "Bows & Slings", notes: "Quick and effective. 80ft range." },
  { id: "longbow", name: "Longbow", price: "50g", attackKind: "ranged", damageRoll: "1d8+2", category: "Bows & Slings", notes: "The longer the bow, the farther it flies. Range 400ft." },
  { id: "crossbow", name: "Crossbow", price: "75g", attackKind: "ranged", damageRoll: "1d10+2", category: "Bows & Slings", notes: "Slow to load. Unforgiving on impact.\nIGNORES ARMOUR, takes an action to reload." },
  { id: "sling", name: "Sling", price: "1s", attackKind: "ranged", damageRoll: "1d4+4", category: "Bows & Slings", notes: "Shoots stones. Yay! free ammunition!" },
  { id: "throwing-knives", name: "Throwing Knives x5", price: "15g", attackKind: "ranged", damageRoll: "1d6+2", category: "Bows & Slings", notes: "These run out quick, dont forget to collect them!" },

  // Magic & Named
  { id: "wand", name: "Wand", price: "100g", attackKind: "ranged", damageRoll: "1d6+4", category: "Magic & Named", notes: "The Power-Stone within acts as a perfect magical conduit, allowing the holder to cast spells.\n\nBASIC ATTACK- A magical blast of force. Range 30ft." },
  { id: "sorcerers-staff", name: "Sorcerers Staff", price: "250g", attackKind: "ranged", damageRoll: "1d6+4", category: "Magic & Named", notes: "Part weapon, Part magical conduit, part walking stick.\nBASIC ATK - A magical blast of force. Range 30ft." },
  { id: "weapon-of-khaliik", name: "Weapon of Khaliik", price: "1000g", attackKind: "melee", damageRoll: "1d20+5", category: "Magic & Named", notes: "A powerful magical conduit forged from the shape-shifting metal Stormsteel and embedded with a pure Power-Stone. Takes the form of your most required tool or melee weapon" },
];
