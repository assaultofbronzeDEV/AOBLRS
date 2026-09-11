// Assault of Bronze — Race & Class definitions.
// "High" traits mean the character is GOOD at those sub-skills — assign LOW
// numbers there (lower is better in this system). "Low" traits mean weak
// spots — assign HIGH numbers there.

import type { StatKey } from "@/src/types";

export type TraitRef = { statKey: StatKey; subIndex: number };

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

// Sub-skill index reference:
// STR: 0 Lifting, 1 Climbing, 2 Intimidation, 3 Vitality
// DEX: 0 Melee Attack, 1 Ranged Attack, 2 Sleight of Hand, 3 Stealth
// INT: 0 Perception, 1 Investigation, 2 History, 3 First Aid
// CHA: 0 Persuasion, 1 Deception, 2 Haggling, 3 Creature Handling

export const RACES: Race[] = [
  {
    id: "elf",
    name: "Elf / Half-Elf",
    tagline: "Long-lived. Keen-eyed. Untethered from time.",
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
      "Humans build empires in a lifetime and forget them in another. Their gift is not strength — it is the raw, restless drive to try.",
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
      "Carved from mountain and beard-braided oaths, dwarves endure where others break. They speak little and lift much.",
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
      "Underestimated in every tavern and every fight, halflings slip past trouble — or into pockets — before anyone notices.",
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
      "Descended from the great wyrms, dragonborn wear their heritage like a crown. When they speak, rooms quiet.",
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
      "Part beast, part person — therions never quite fit at either hearth. They read the world through fur, fang, and instinct.",
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
      "Orcs live loud and die louder. Their reputation walks a room ahead of them — sometimes to their advantage, mostly not.",
    high: [
      { statKey: "STR", subIndex: 2 }, // Intimidation
      { statKey: "STR", subIndex: 3 }, // Vitality
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
      "A drop of infernal blood, a lifetime of sideways looks. Demonborn learn early that words are sharper than swords.",
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
      "A soldier of any banner or none. Warriors read a fight like a book they wrote themselves.",
    baseArmour: 14,
    weapons: [{ name: "Short Sword", attackKind: "melee", damageRoll: "1d6" }],
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
      "The wilds obey no laws but a ranger has learned to move like they wrote the rules themselves.",
    baseArmour: 12,
    weapons: [
      { name: "Shortbow", attackKind: "ranged", damageRoll: "1d6" },
      { name: "Dagger", attackKind: "melee", damageRoll: "1d4" },
    ],
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
      "Half scholar, half brawler. Battle-mages weave hurried cantrips between sword-strokes and count it a good day.",
    baseArmour: 12,
    weapons: [{ name: "Runed Staff", attackKind: "melee", damageRoll: "1d6" }],
    high: [
      { statKey: "DEX", subIndex: 0 }, // Melee Attack
      { statKey: "INT", subIndex: 2 }, // History
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
      "Alchemists make the unlikely inevitable. Their pockets clink with vials that could heal you — or dissolve a door.",
    baseArmour: 10,
    weapons: [{ name: "Dagger", attackKind: "melee", damageRoll: "1d4" }],
    high: [
      { statKey: "INT", subIndex: 3 }, // First Aid
      { statKey: "INT", subIndex: 1 }, // Investigation
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
      "Rogues walk the roofs and back-alleys of the world. Doors open for them — usually without asking.",
    baseArmour: 11,
    weapons: [
      { name: "Dagger", attackKind: "melee", damageRoll: "1d4" },
      { name: "Short Sword", attackKind: "melee", damageRoll: "1d6" },
    ],
    high: [
      { statKey: "DEX", subIndex: 2 }, // Sleight of Hand
      { statKey: "DEX", subIndex: 3 }, // Stealth
    ],
    low: [
      { statKey: "STR", subIndex: 2 }, // Intimidation
    ],
  },
  {
    id: "warden",
    name: "Warden",
    tagline: "Beast-friend. Grove-keeper. Quiet oath.",
    lore:
      "Wardens keep the border between wilderness and everything else. Creatures they meet listen a little longer.",
    baseArmour: 12,
    weapons: [{ name: "Spear", attackKind: "melee", damageRoll: "1d6" }],
    high: [
      { statKey: "CHA", subIndex: 3 }, // Creature Handling
      { statKey: "INT", subIndex: 0 }, // Perception
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
      "Grew up in the pits, the docks, or somewhere worse. A scrapper punches through problems most people negotiate around.",
    baseArmour: 11,
    weapons: [{ name: "Bare Fists", attackKind: "melee", damageRoll: "1d4" }],
    high: [
      { statKey: "STR", subIndex: 0 }, // Lifting
      { statKey: "STR", subIndex: 2 }, // Intimidation
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
      "Sorcerers don't study — they simply are. Their power leaks around the edges: candles snuff, coins spin, fate flinches.",
    baseArmour: 10,
    weapons: [{ name: "Focus Wand", attackKind: "ranged", damageRoll: "1d6" }],
    high: [
      { statKey: "INT", subIndex: 0 }, // Perception
      { statKey: "CHA", subIndex: 1 }, // Deception
    ],
    low: [
      { statKey: "STR", subIndex: 0 }, // Lifting
    ],
  },
];

// Utility: encode a trait ref as a stable string key.
export const traitKey = (t: TraitRef) => `${t.statKey}.${t.subIndex}`;
