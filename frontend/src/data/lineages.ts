// Assault of Bronze — Race & Class definitions.
// "High" traits mean the character is GOOD at those sub-skills — assign LOW
// numbers there (lower is better in this system). "Low" traits mean weak
// spots — assign HIGH numbers there.

import type { StatKey } from "@/src/types";
import { WEAPON_PRESETS } from "@/src/data/weapons";

// A TraitRef points at either a main stat (subIndex = null) or a sub-skill.
export type TraitRef = { statKey: StatKey; subIndex: number | null };

export type Race = {
  id: string;
  name: string;
  tagline: string;
  lore: string;
  high: TraitRef[]; // slots to highlight GREEN (put a low roll here)
  low: TraitRef[]; // slots to highlight RED (put a high roll here)
};

export type StartingWeapon = {
  name: string;
  attackKind: "melee" | "ranged";
  damageRoll: string;
};

export type CharClass = {
  id: string;
  name: string;
  tagline: string;
  lore: string;
  baseArmour: number;
  weapons: StartingWeapon[];
  high: TraitRef[];
  low: TraitRef[];
};

// Every class's starting gear must come from the shared weapon pool so it
// stays in sync with what players can pick manually in-app.
const poolWeapon = (id: string): StartingWeapon => {
  const preset = WEAPON_PRESETS.find((w) => w.id === id);
  if (!preset) throw new Error(`Unknown starter weapon id: ${id}`);
  return { name: preset.name, attackKind: preset.attackKind, damageRoll: preset.damageRoll };
};

// Sub-skill index reference:
// STR: 0 Lifting, 1 Climbing, 2 Intimidation, 3 Vitality
// DEX: 0 Melee Attack, 1 Ranged Attack, 2 Sleight of Hand, 3 Stealth
// INT: 0 Perception, 1 Investigation, 2 History, 3 First Aid
// CHA: 0 Persuasion, 1 Deception, 2 Haggling, 3 Creature Handling

export const RACES: Race[] = [
  {
    id: "elf",
    name: "Elf / Half-Elf",
    tagline: "Long-lived. Keen-eyed. Untethered from time, but fragile.",
    lore:
      "Born to the whisper of ancient forests, elves move with unhurried grace and see what others miss. Their patience is a blade.",
    high: [
      { statKey: "DEX", subIndex: 3 }, // Stealth
      { statKey: "INT", subIndex: 0 }, // Perception
    ],
    low: [
      { statKey: "STR", subIndex: 0 }, // Lifting
      { statKey: "STR", subIndex: 3 }, // Vitality
    ],
  },
  {
    id: "human",
    name: "Human",
    tagline: "Ambitious. Adaptable. Everywhere.",
    lore:
      "Humans are the most adaptable and ambitious of all races. Their shorter lifespans drive them to achieve greatness in a variety of fields, from trade and war to  invention and in rare cases magic. They are a diverse race with a vast array of cultures and beliefs, though most typically reside in and around Central City in the main Human territory on the eastern half of Aryndos..",
    high: [
      { statKey: "CHA", subIndex: 0 }, // Persuasion
      { statKey: "CHA", subIndex: 2 }, // Haggling
    ],
    low: [
      { statKey: "INT", subIndex: 2 }, // History (short-lived, short memory)
    ],
  },
  {
    id: "dwarf",
    name: "Dwarf",
    tagline: "Stone-hearted. Forge-forged. Unmoved.",
    lore:
      "Stout and hardy, dwarves are master craftsmen and miners who typically dwell in mountain strongholds or far underground. These Dwarven strongholds are accessible through secret entryways and tunnel systems scattered across Aryndos. Renowned for their resilience, loyalty, and love of gold, they are unmatched in forging weapons and armour.",
    high: [
      { statKey: "STR", subIndex: 0 }, // Lifting
      { statKey: "STR", subIndex: 3 }, // Vitality
    ],
    low: [
      { statKey: "DEX", subIndex: 2 }, // Sleight of Hand
      { statKey: "DEX", subIndex: 3 }, // Stealth
    ],
  },
  {
    id: "hobbit",
    name: "Hobbit / Halfling",
    tagline: "Small feet. Full plates. Sharper than they look.",
    lore:
      "Small and unassuming, hobbits are cheerful, resourceful people who value home, family, and good food. Despite their small stature, they are remarkably brave when the need arises and are known for their stealth, luck and nimbleness; they are typically found in the far west of Aryndos in small, tight knit communities.",
    high: [
      { statKey: "DEX", subIndex: 2 }, // Sleight of Hand
      { statKey: "DEX", subIndex: 3 }, // Stealth
    ],
    low: [
      { statKey: "STR", subIndex: 2 }, // Intimidation
      { statKey: "STR", subIndex: 0 }, // Lifting
    ],
  },
  {
    id: "dragonborn",
    name: "Dragonborn",
    tagline: "Scaled kin. Proud voice. Old blood.",
    lore:
      "The reason for the Dragonborn's existence is largely unknown and debated, they are hatched from True-Dragon eggs when the egg has been abandoned by its True-Dragon Parent and cared for by any humanoid Magi until hatching. The Dragonborn are proud, imposing beings with scales that shimmer in a variety of colours. They possess the elemental breath of their True-Dragon kin and a deep connection to them, often embodying their strength and honour, though True-Dragons are rare, there are historical instances of Dragonborn and True Dragons being an extremely powerful pairing.",
    high: [
      { statKey: "STR", subIndex: 2 }, // Intimidation
      { statKey: "CHA", subIndex: 0 }, // Persuasion
    ],
    low: [
      { statKey: "DEX", subIndex: 2 }, // Sleight of Hand
    ],
  },
  {
    id: "giantborn",
    name: "Giantborn",
    tagline: "Sky-tall. Ground-shaker. Slow to bend.",
    lore:
      "The blood of titans runs slow and heavy. Giantborn heave doors from hinges and stoop through most every arch.",
    high: [
      { statKey: "STR", subIndex: 0 }, // Lifting
      { statKey: "STR", subIndex: 2 }, // Intimidation
    ],
    low: [
      { statKey: "DEX", subIndex: 3 }, // Stealth
      { statKey: "CHA", subIndex: 0 }, // Persuasion
    ],
  },
  {
    id: "therion",
    name: "Therion",
    tagline: "Beast-kin. Wild eye. Half-tamed.",
    lore:
      "These Animalistic humanoids hail from distant islands around the Continent of Aryndos and exist in many breeds, most resemble common animals like Cats and Dogs and other mammals. Agile and curious, Therions are natural explorers and treasure seekers, driven by an insatiable wanderlust. Their keen senses make them adept hunters, fighters and rogues.",
    high: [
      { statKey: "INT", subIndex: 0 }, // Perception
      { statKey: "CHA", subIndex: 3 }, // Creature Handling
    ],
    low: [
      { statKey: "CHA", subIndex: 0 }, // Persuasion
    ],
  },
  {
    id: "orc",
    name: "Orc / Half-Orc",
    tagline: "Battle-born. Loud. Loyal to the last.",
    lore:
      "Fierce and resilient, orcs are a warrior race that thrives on strength and determination. Once feared raiders, many orcs have embraced a more honourable path, becoming skilled blacksmiths, shamans, or even heroes. Their culture values loyalty, courage, and the will to overcome any challenge, most Magi cultures accept Orcs within their ranks.",
    high: [
      { statKey: "STR", subIndex: 2 }, // Intimidation
      { statKey: "DEX", subIndex: 0 }, // Melee Attack
    ],
    low: [
      { statKey: "CHA", subIndex: 0 }, // Persuasion
      { statKey: "CHA", subIndex: 1 }, // Deception
    ],
  },
  {
    id: "demonborn",
    name: "Demonborn / Tiefling",
    tagline: "Marked. Whispered about. Silver-tongued.",
    lore:
      "Nobody knows the true reason that Demonborn come into existence, they are always born of Elven parentage and are often discarded shortly afterwards. Demonborn are largely misunderstood due to their coloured skin, horns and aptitude for Necromancy.",
    high: [
      { statKey: "CHA", subIndex: 1 }, // Deception
      { statKey: "CHA", subIndex: 0 }, // Persuasion
    ],
    low: [
      { statKey: "CHA", subIndex: 3 }, // Creature Handling
      { statKey: "INT", subIndex: 3 }, // First Aid
    ],
  },
];

export const CLASSES: CharClass[] = [
  {
    id: "warrior",
    name: "Warrior",
    tagline: "First through the door. Last one standing.",
    lore:
      "A frontline fighter who thrives in the thick of battle, relying on raw strength and skill in hand-to-hand combat to overwhelm foes. Warriors hit hard with powerful melee attacks but lack subtlety, preferring direct confrontation over stealth. Their sturdy armour provides solid protection, allowing them to stand firm and trade blows where others would fall.",
    baseArmour: 3,
    weapons: [poolWeapon("short-sword")],
    high: [
      { statKey: "DEX", subIndex: 0 }, // Melee Attack
      { statKey: "STR", subIndex: 3 }, // Vitality
    ],
    low: [
      { statKey: "INT", subIndex: 1 }, // Investigation
    ],
  },
  {
    id: "ranger",
    name: "Ranger",
    tagline: "Loose the arrow. Vanish. Repeat.",
    lore:
      "A master of ranged combat who strikes from afar with precision and speed. Rangers excel at picking off targets before they can close the distance, using keen aim and quick reflexes to stay ahead of the fight. Their light armour offers minimal protection, so they rely on distance, agility, and positioning rather than brute force in melee.",
    baseArmour: 2,
    weapons: [poolWeapon("shortbow"), poolWeapon("dagger")],
    high: [
      { statKey: "DEX", subIndex: 1 }, // Ranged Attack
      { statKey: "DEX", subIndex: 3 }, // Stealth
    ],
    low: [
      { statKey: "CHA", subIndex: 0 }, // Persuasion
    ],
  },
  {
    id: "battle-mage",
    name: "Battle-Mage",
    tagline: "Steel in one hand. Fire in the other.",
    lore:
      "A warrior who channels destructive magic as their primary weapon. Battle-Mages endure the rigours of combat through sheer vitality, allowing them to unleash devastating spells while withstanding enemy assaults. Lacking physical strength and any form of armour, they depend on their spells and resilience to carry them through the fray.\n\nTypically, Mages of any sort will channel their magic through an item containing a Power-Stone, otherwise casting spells would draw from components or the caster's own life force.",
    baseArmour: 2,
    weapons: [poolWeapon("quarterstaff")],
    high: [
      { statKey: "DEX", subIndex: 0 }, // Melee Attack
      { statKey: "INT", subIndex: null }, // Intelligence (main)
    ],
    low: [
      { statKey: "DEX", subIndex: 3 }, // Stealth
    ],
  },
  {
    id: "alchemist",
    name: "Alchemist",
    tagline: "Boil, distil, throw the flask.",
    lore:
      "A vital ally on the battlefield, skilled in healing wounds, brewing potions, and keeping their companions in fighting shape. Alchemists excel at first aid and restorative magic, ensuring the party can endure prolonged conflicts. While their melee capabilities are limited, their moderate armour offers some protection as they move between allies, mending injuries and bolstering morale.",
    baseArmour: 1,
    weapons: [poolWeapon("dagger")],
    high: [
      { statKey: "INT", subIndex: 3 }, // First Aid
      { statKey: "INT", subIndex: null }, // Main Intelligence
    ],
    low: [
      { statKey: "STR", subIndex: 3 }, // Vitality
    ],
  },
  {
    id: "rogue",
    name: "Rogue",
    tagline: "The lock. The purse. The window.",
    lore:
      "Rogues are masters of shadows, precision, and opportunity. They strike when foes are unaware, weaving between danger and vanishing before a counterattack lands. Their advantage lies not in durability but in cunning and finesse. Lightly armoured and quick on their feet, Rogues excel at infiltration, ambushes, critical strikes, and disabling enemies before they know the fight has begun.",
    baseArmour: 1,
    weapons: [poolWeapon("dagger"), poolWeapon("short-sword")],
    high: [
      { statKey: "DEX", subIndex: 2 }, // Sleight of Hand
      { statKey: "DEX", subIndex: 3 }, // Stealth
      { statKey: "DEX", subIndex: 0 }, // melee attack 
    ],
    low: [
      { statKey: "STR", subIndex: 2 }, // Intimidation
    ],
  },
  {
    id: "warden",
    name: "Warden",
    tagline: "Beast-friend. Grove-keeper. Shield of the party.",
    lore:
      "Wardens are shields made flesh, stalwart protectors who anchor the battlefield. Whether towering in heavy armour or bracing with reinforced shields, Wardens specialise in controlling enemy movement, guarding allies, and enduring attacks that would fell lesser fighters. They thrive when they can hold a position and force enemies to come to them.",
    baseArmour: 4,
    weapons: [poolWeapon("spear")],
    high: [
      { statKey: "CHA", subIndex: 3 }, // Creature Handling
      { statKey: "INT", subIndex: 0 }, // Perception
      { statKey: "STR", subIndex: null }, // main Strength
    ],
    low: [
      { statKey: "CHA", subIndex: 2 }, // Haggling
    ],
  },
  {
    id: "scrapper",
    name: "Scrapper",
    tagline: "Fists first. Questions never.",
    lore:
      "Scrappers are unpredictable street-fighters who rely on raw grit, chaotic momentum, and improvised techniques. Whether brawlers, pit-fighters, or alley survivors, Scrappers excel when chaos erupts. Their blows are wild but fast, overwhelming foes with relentless pressure. Their lack of formal training means they often miss, but when they land a hit, it hurts.",
    baseArmour: 2,
    weapons: [poolWeapon("bare-fists")],
    high: [
      { statKey: "STR", subIndex: 0 }, // Lifting
      { statKey: "STR", subIndex: 2 }, // Intimidation
      { statKey: "DEX", subIndex: 0 }, // melee attack  
    ],
    low: [
      { statKey: "INT", subIndex: 2 }, // History
    ],
  },
  {
    id: "sorcerer",
    name: "Sorcerer",
    tagline: "Magic in the blood. Consequences in the room.",
    lore:
      "Sorcerers wield raw, untamed power typically born from innate talent rather than study or ritual. While unmatched in offensive spellcraft, Sorcerers are physically fragile, relying on distance, cunning, and magical control to stay alive. Their lack of armour and martial skill forces them to strike hard and avoid being struck in return.\n\nTypically, Mages of any sort will channel their magic through an item containing a Power-Stone, otherwise casting spells would draw from components or the caster's own life force.",
    baseArmour: 1,
    weapons: [poolWeapon("wand")],
    high: [
      { statKey: "INT", subIndex: null }, // intelligence (main)
      { statKey: "DEX", subIndex: 1 }, // Ranged Attack
      { statKey: "INT", subIndex: 0 }, // Perception
    ],
    low: [
      { statKey: "DEX", subIndex: 0 }, // Melee Attack
    ],
  },
];

// Utility: encode a trait ref as a stable string key. Main stats use "M".
export const traitKey = (t: TraitRef) => `${t.statKey}.${t.subIndex ?? "M"}`;
