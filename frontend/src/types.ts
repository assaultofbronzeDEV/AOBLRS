export type SubSkill = {
  name: string;
  value: number;
};

export type StatBlock = {
  key: "STR" | "DEX" | "INT" | "CHA";
  name: string;
  value: number;
  subs: SubSkill[];
};

export type Character = {
  id: string;
  name: string;
  className: string;
  level: string;
  portraitUri?: string;
  hp: number; // filled hearts, out of hpMax
  hpMax: number;
  armour: string;
  meleeDmg: string;
  stats: StatBlock[];
  oncePerTurn: string;
  oncePerRest: string;
  heroAbility: string;
  heroPoints: number;
  backstory: string;
  inventory: string;
  notes: string;
  createdAt: string;
  updatedAt: string;
};

export const defaultStats = (): StatBlock[] => [
  {
    key: "STR",
    name: "STRENGTH",
    value: 15,
    subs: [
      { name: "Lifting", value: 15 },
      { name: "Climbing", value: 15 },
      { name: "Intimidation", value: 15 },
      { name: "Vitality", value: 15 },
    ],
  },
  {
    key: "DEX",
    name: "DEXTERITY",
    value: 15,
    subs: [
      { name: "Melee Attack", value: 15 },
      { name: "Ranged Attack", value: 15 },
      { name: "Sleight of Hand", value: 15 },
      { name: "Stealth", value: 15 },
    ],
  },
  {
    key: "INT",
    name: "INTELLIGENCE",
    value: 15,
    subs: [
      { name: "Perception", value: 15 },
      { name: "Investigation", value: 15 },
      { name: "History", value: 15 },
      { name: "First Aid", value: 15 },
    ],
  },
  {
    key: "CHA",
    name: "CHARISMA",
    value: 15,
    subs: [
      { name: "Persuasion", value: 15 },
      { name: "Deception", value: 15 },
      { name: "Haggling", value: 15 },
      { name: "Creature Handling", value: 15 },
    ],
  },
];

export const createEmptyCharacter = (): Character => {
  const now = new Date().toISOString();
  return {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    name: "",
    className: "",
    level: "1",
    portraitUri: undefined,
    hp: 20,
    hpMax: 20,
    armour: "10",
    meleeDmg: "1xD6",
    stats: defaultStats(),
    oncePerTurn: "",
    oncePerRest: "",
    heroAbility: "",
    heroPoints: 0,
    backstory: "",
    inventory: "",
    notes: "",
    createdAt: now,
    updatedAt: now,
  };
};
