export type SubSkill = {
  name: string;
  value: number;
};

export type StatKey = "STR" | "DEX" | "INT" | "CHA";

export type StatBlock = {
  key: StatKey;
  name: string;
  value: number;
  subs: SubSkill[];
};

export type EffectType = "none" | "damage" | "healing";

// A stat reference lets an ability point at either a main stat or a sub-skill
// on the same character sheet.
export type StatRef = {
  kind: "main" | "sub";
  statKey: StatKey;
  subIndex?: number; // when kind === "sub"
};

export type Ability = {
  id: string;
  title: string;
  description: string;
  linkedStat?: StatRef; // when set, "Use" rolls d20 vs that stat
  effectRoll: string; // dice notation like "1d6+2"; empty means no effect roll
  effectType: EffectType;
};

export type CustomSection = {
  id: string;
  title: string;
  content: string;
};

export const HP_MAX = 20;

export type Character = {
  id: string;
  name: string;
  className: string;
  level: string;
  portraitUri?: string;
  hp: number; // 0..HP_MAX
  armour: string;
  meleeDmg: string;
  stats: StatBlock[];
  oncePerTurn: Ability[];
  oncePerRest: Ability[];
  heroAbilities: Ability[]; // usually 1 but allow multiple
  heroPoints: number;
  backstory: string;
  inventory: string;
  notes: string;
  customSections: CustomSection[];
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

export const genId = () =>
  `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

export const createEmptyAbility = (): Ability => ({
  id: genId(),
  title: "",
  description: "",
  linkedStat: undefined,
  effectRoll: "",
  effectType: "none",
});

export const createEmptyCharacter = (): Character => {
  const now = new Date().toISOString();
  return {
    id: genId(),
    name: "",
    className: "",
    level: "1",
    portraitUri: undefined,
    hp: HP_MAX,
    armour: "10",
    meleeDmg: "1d6",
    stats: defaultStats(),
    oncePerTurn: [],
    oncePerRest: [],
    heroAbilities: [],
    heroPoints: 0,
    backstory: "",
    inventory: "",
    notes: "",
    customSections: [],
    createdAt: now,
    updatedAt: now,
  };
};

// Migrate loaded characters that may lack newer fields (from older MVP schema).
export const migrateCharacter = (raw: any): Character => {
  const asArr = (v: any): any[] => (Array.isArray(v) ? v : []);
  const now = new Date().toISOString();
  return {
    id: raw.id ?? genId(),
    name: raw.name ?? "",
    className: raw.className ?? "",
    level: raw.level ?? "1",
    portraitUri: raw.portraitUri,
    hp: typeof raw.hp === "number" ? Math.max(0, Math.min(HP_MAX, raw.hp)) : HP_MAX,
    armour: raw.armour ?? "10",
    meleeDmg: raw.meleeDmg ?? "1d6",
    stats: Array.isArray(raw.stats) && raw.stats.length === 4 ? raw.stats : defaultStats(),
    oncePerTurn: Array.isArray(raw.oncePerTurn)
      ? raw.oncePerTurn
      : typeof raw.oncePerTurn === "string" && raw.oncePerTurn.trim()
        ? [{ ...createEmptyAbility(), description: raw.oncePerTurn }]
        : [],
    oncePerRest: Array.isArray(raw.oncePerRest)
      ? raw.oncePerRest
      : typeof raw.oncePerRest === "string" && raw.oncePerRest.trim()
        ? [{ ...createEmptyAbility(), description: raw.oncePerRest }]
        : [],
    heroAbilities: Array.isArray(raw.heroAbilities)
      ? raw.heroAbilities
      : typeof raw.heroAbility === "string" && raw.heroAbility.trim()
        ? [{ ...createEmptyAbility(), title: "Hero Ability", description: raw.heroAbility }]
        : [],
    heroPoints: typeof raw.heroPoints === "number" ? raw.heroPoints : 0,
    backstory: raw.backstory ?? "",
    inventory: raw.inventory ?? "",
    notes: raw.notes ?? "",
    customSections: asArr(raw.customSections),
    createdAt: raw.createdAt ?? now,
    updatedAt: raw.updatedAt ?? now,
  };
};
