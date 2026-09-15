import type { AbilityPreset } from "@/src/data/abilities";
import type { ItemPreset } from "@/src/data/items";
import type { WeaponPreset } from "@/src/data/weapons";
import { WEAPON_PRESETS } from "@/src/data/weapons";

const DEX_MELEE = { kind: "sub" as const, statKey: "DEX" as const, subIndex: 0 };
const DEX_RANGED = { kind: "sub" as const, statKey: "DEX" as const, subIndex: 1 };
const INT_MAIN = { kind: "main" as const, statKey: "INT" as const };

export const AGE_OF_WAR_STANDARD_MELEE: WeaponPreset[] = WEAPON_PRESETS.filter((weapon) =>
  ["dagger", "short-sword", "battle-axe", "spear", "club", "brass-knuckles"].includes(weapon.id),
);

export const AGE_OF_WAR_WEAPON_OF_KHALIIK: WeaponPreset = {
  ...WEAPON_PRESETS.find((weapon) => weapon.id === "weapon-of-khaliik")!,
  price: "1b",
};

export const AGE_OF_WAR_WEAPONS: WeaponPreset[] = [
  { id: "war-pistol", name: "Power-Stone Pistol", price: "80g", attackKind: "ranged", damageRoll: "1d8+2", category: "Bows & Slings", notes: "Compact energy sidearm. A visible charge flare gives away the shooter." },
  { id: "arc-carbine", name: "Arc Carbine", price: "180g", attackKind: "ranged", damageRoll: "1d10+2", category: "Bows & Slings", notes: "Military-grade Power-Stone weapon. Reliable at medium range." },
  { id: "storm-lance", name: "Storm Lance", price: "240g", attackKind: "ranged", damageRoll: "1d12+1d6", category: "Bows & Slings", notes: "Projects a concentrated bolt of raw Power-Stone energy." },
  { id: "shock-baton", name: "Shock Baton", price: "35g", attackKind: "melee", damageRoll: "1d6+1d6", category: "Brawler", notes: "A close-quarters weapon that overloads armour seams." },
  { id: "voidblade", name: "Voidblade", price: "500g", attackKind: "melee", damageRoll: "1d10+1d8", category: "Magic & Named", notes: "A dark edge that drinks the heat from whatever it cuts." },
  { id: "power-stone-cannon", name: "Power-Stone Cannon", price: "1200g", attackKind: "ranged", damageRoll: "2d12+1d10", category: "Big Steel", notes: "A siege weapon powered by a dangerously unstable core." },
];

export const AGE_OF_WAR_ITEMS: ItemPreset[] = [
  { id: "power-cell", name: "Power Cell", price: "20g", category: "Consumables", notes: "Feeds one weapon or machine for a short mission." },
  { id: "field-medkit", name: "Field Medkit", price: "30g", category: "Medical", notes: "Stops bleeding and restores 1d6 HP when used with First Aid." },
  { id: "smoke-charge", name: "Smoke Charge", price: "8g", category: "Consumables", notes: "Fills a 20ft area with metallic smoke." },
  { id: "armour-patch", name: "Armour Patch Kit", price: "15g", category: "Tools", notes: "Emergency plating and sealant for damaged armour." },
  { id: "black-powder-ration", name: "Black Ration", price: "2g", category: "General Goods", notes: "Dense, bitter field food designed to survive a war zone." },
  { id: "signal-beacon", name: "Signal Beacon", price: "45g", category: "Misc", notes: "Broadcasts a short-range coded Power-Stone pulse." },
];

export const AGE_OF_WAR_ABILITIES: AbilityPreset[] = [
  { id: "power-surge", name: "Power Surge", description: "Overload a nearby conduit and release a violent arc of energy.", category: "Starter Spells", effectType: "damage", effectRoll: "1d8+1d6", linkedStat: INT_MAIN, tag: "War magic" },
  { id: "hex-round", name: "Hex Round", description: "Mark a target with a vicious curse; the next hit tears deeper.", category: "Class Specials", effectType: "damage", effectRoll: "1d6+2", linkedStat: DEX_RANGED, tag: "Dark magic" },
  { id: "blood-ward", name: "Blood Ward", description: "Spend vitality to turn a killing blow aside.", category: "Once Per Rest", effectType: "healing", effectRoll: "1d10+1d6", linkedStat: INT_MAIN, tag: "Dark magic" },
  { id: "combat-focus", name: "Combat Focus", description: "Enter a cold, vicious concentration for the next exchange.", category: "Class Specials", effectType: "none", linkedStat: DEX_MELEE, tag: "Military" },
  { id: "black-flare", name: "Black Flare", description: "A burst of lightless flame scorches everyone caught in the breach.", category: "Once Per Rest", effectType: "damage", effectRoll: "2d10+1d6", linkedStat: INT_MAIN, tag: "War magic" },
];
