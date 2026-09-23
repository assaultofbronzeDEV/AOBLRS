import { normalizeDiceNotation } from "@/src/utils/dice";
import { AgeId, DEFAULT_AGE_ID } from "@/src/ages";
import type { PotionPreset } from "@/src/data/potions";

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

export type StatRef = {
  kind: "main" | "sub";
  statKey: StatKey;
  subIndex?: number;
};

export type Ability = {
  id: string;
  title: string;
  description: string;
  linkedStat?: StatRef;
  effectRoll: string;
  effectType: EffectType;
  used?: boolean;
};

export type CustomSection = {
  id: string;
  title: string;
  content: string;
};

export type AttackKind = "melee" | "ranged";

export type Weapon = {
  id: string;
  name: string;
  description?: string;
  attackKind: AttackKind;
  damageRoll: string;
};

export type Armour = {
  id: string;
  name: string;
  description: string;
  movementSpeed: string;
  damageReduction: string;
};

export type InventoryItem = {
  id: string;
  name: string;
  description?: string;
  qty: number;
  used: boolean;
};

export type RollMode = "normal" | "advantage" | "disadvantage";
export type RollVerdict = "crit-success" | "crit-fail" | "success" | "fail";

export type RollHistoryEntry = {
  id: string;
  at: string;
  label: string;
  target?: number;
  rolled?: number;
  d20All?: number[];
  mode?: RollMode;
  verdict?: RollVerdict;
  effect?: {
    notation: string;
    type: "damage" | "healing";
    total: number;
    rolls: number[];
    modifier: number;
  };
};

export type EntityKind = "hero" | "monster";

export const HP_MAX = 20;
export const ROLL_HISTORY_MAX = 20;

export type Currency = {
  gold: number;
  silver: number;
  bronze: number;
  ingredients: number;
};

export type Character = {
  id: string;
  age: AgeId;
  kind: EntityKind;
  name: string;
  className: string;
  level: string;
  portraitUri?: string;
  hp: number;
  maxHp: number;
  armour: string;
  equippedArmour: Armour;
  meleeDmg: string;
  stats: StatBlock[];
  oncePerTurn: Ability[];
  oncePerRest: Ability[];
  heroAbilities: Ability[];
  heroPoints: number;
  currency: Currency;
  backstory: string;
  inventory: string;
  inventoryItems: InventoryItem[];
  customPotions: PotionPreset[];
  notes: string;
  customSections: CustomSection[];
  weapons: Weapon[];
  rollHistory: RollHistoryEntry[];
  createdAt: string;
  updatedAt: string;
};

export const defaultHeroStats = (): StatBlock[] => [
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

// Keep for legacy compat with other files.
export const defaultStats = defaultHeroStats;

export const defaultMonsterStats = (): StatBlock[] => [
  { key: "STR", name: "STRENGTH", value: 12, subs: [] },
  {
    key: "DEX",
    name: "DEXTERITY",
    value: 12,
    subs: [
      { name: "Melee Attack", value: 12 },
      { name: "Ranged Attack", value: 12 },
    ],
  },
  { key: "INT", name: "SPECIAL ABILITY", value: 12, subs: [] },
];

export const genId = () =>
  `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

export const normalizeDice = (raw: unknown): string | undefined => {
  if (typeof raw !== "string") return undefined;
  return normalizeDiceNotation(raw) ?? raw;
};

export const createEmptyAbility = (): Ability => ({
  id: genId(),
  title: "",
  description: "",
  linkedStat: undefined,
  effectRoll: "",
  effectType: "none",
  used: false,
});

export const createEmptyWeapon = (description = ""): Weapon => ({
  id: genId(),
  name: "",
  description,
  attackKind: "melee",
  damageRoll: "1d6",
});

export const createEmptyArmour = (): Armour => ({
  id: genId(),
  name: "Unarmoured",
  description: "No armour equipped. Move up to 30ft.",
  movementSpeed: "30",
  damageReduction: "0",
});

export const createEmptyInventoryItem = (name = "", description = ""): InventoryItem => ({
  id: genId(),
  name,
  description,
  qty: 1,
  used: false,
});

const createBase = (kind: EntityKind): Character => {
  const now = new Date().toISOString();
  const stats = kind === "monster" ? defaultMonsterStats() : defaultHeroStats();
  return {
    id: genId(),
    age: DEFAULT_AGE_ID,
    kind,
    name: "",
    className: "",
    level: "1",
    portraitUri: undefined,
    hp: HP_MAX,
    maxHp: HP_MAX,
    armour: "10",
    equippedArmour: createEmptyArmour(),
    meleeDmg: "1d6",
    stats,
    oncePerTurn: [],
    oncePerRest: [],
    heroAbilities: [],
    heroPoints: 0,
    currency: { gold: 0, silver: 0, bronze: 0, ingredients: 0 },
    backstory: "",
    inventory: "",
    inventoryItems: [],
    customPotions: [],
    notes: "",
    customSections: [],
    weapons: [],
    rollHistory: [],
    createdAt: now,
    updatedAt: now,
  };
};

export const createEmptyCharacter = () => createBase("hero");
export const createEmptyMonster = () => createBase("monster");

const parseInventoryFromString = (raw: string): InventoryItem[] =>
  raw
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean)
    .map((l) => createEmptyInventoryItem(l));

export const migrateCharacter = (raw: any): Character => {
  const asArr = (v: any): any[] => (Array.isArray(v) ? v : []);
  const now = new Date().toISOString();
  const migratedAbility = (a: any): Ability => ({
    id: a?.id ?? genId(),
    title: a?.title ?? "",
    description: a?.description ?? "",
    linkedStat: a?.linkedStat,
    effectRoll: a?.effectRoll ?? "",
    effectType: a?.effectType ?? "none",
    used: !!a?.used,
  });
  const oncePerTurn = Array.isArray(raw.oncePerTurn)
    ? raw.oncePerTurn.map(migratedAbility)
    : typeof raw.oncePerTurn === "string" && raw.oncePerTurn.trim()
      ? [{ ...createEmptyAbility(), description: raw.oncePerTurn }]
      : [];
  const oncePerRest = Array.isArray(raw.oncePerRest)
    ? raw.oncePerRest.map(migratedAbility)
    : typeof raw.oncePerRest === "string" && raw.oncePerRest.trim()
      ? [{ ...createEmptyAbility(), description: raw.oncePerRest }]
      : [];
  const heroAbilities = Array.isArray(raw.heroAbilities)
    ? raw.heroAbilities.map(migratedAbility)
    : typeof raw.heroAbility === "string" && raw.heroAbility.trim()
      ? [{ ...createEmptyAbility(), title: "Hero Ability", description: raw.heroAbility }]
      : [];
  const inventoryItems: InventoryItem[] = Array.isArray(raw.inventoryItems) && raw.inventoryItems.length > 0
    ? raw.inventoryItems.map((item: any) => ({
        ...item,
        description: item?.description ?? "",
      }))
    : typeof raw.inventory === "string" && raw.inventory.trim()
      ? parseInventoryFromString(raw.inventory)
      : [];
  const kind: EntityKind = raw.kind === "monster" ? "monster" : "hero";
  const defaultForKind = kind === "monster" ? defaultMonsterStats : defaultHeroStats;
  const maxHp = typeof raw.maxHp === "number" && raw.maxHp > 0 ? raw.maxHp : HP_MAX;
  const equippedArmour: Armour = raw.equippedArmour && typeof raw.equippedArmour === "object"
    ? {
        id: raw.equippedArmour.id ?? genId(),
        name: raw.equippedArmour.name ?? "Unarmoured",
        description: raw.equippedArmour.description ?? "",
        movementSpeed: String(raw.equippedArmour.movementSpeed ?? "30"),
        damageReduction: String(raw.equippedArmour.damageReduction ?? raw.armour ?? "0"),
      }
    : {
        ...createEmptyArmour(),
        name: raw.armour && raw.armour !== "0" ? "Current Armour" : "Unarmoured",
        description: raw.armour && raw.armour !== "0" ? "Migrated from your previous armour value." : "No armour equipped. Move up to 30ft.",
        damageReduction: String(raw.armour ?? "0"),
      };
  return {
    id: raw.id ?? genId(),
    age: raw.age === "age-of-war" ? "age-of-war" : DEFAULT_AGE_ID,
    kind,
    name: raw.name ?? "",
    className: raw.className ?? "",
    level: raw.level ?? "1",
    portraitUri: raw.portraitUri,
    hp: typeof raw.hp === "number" ? Math.max(0, Math.min(maxHp, raw.hp)) : maxHp,
    maxHp,
    armour: raw.armour ?? "10",
    equippedArmour,
    meleeDmg: normalizeDice(raw.meleeDmg) ?? "1d6",
    stats: Array.isArray(raw.stats) && raw.stats.length > 0 ? raw.stats : defaultForKind(),
    oncePerTurn,
    oncePerRest,
    heroAbilities,
    heroPoints: typeof raw.heroPoints === "number" ? raw.heroPoints : 0,
    currency: {
      gold: Number.isFinite(raw?.currency?.gold) ? Math.max(0, raw.currency.gold) : 0,
      silver: Number.isFinite(raw?.currency?.silver) ? Math.max(0, raw.currency.silver) : 0,
      bronze: Number.isFinite(raw?.currency?.bronze) ? Math.max(0, raw.currency.bronze) : 0,
      ingredients: Number.isFinite(raw?.currency?.ingredients) ? Math.max(0, raw.currency.ingredients) : 0,
    },
    backstory: raw.backstory ?? "",
    inventory: raw.inventory ?? "",
    inventoryItems,
    customPotions: Array.isArray(raw.customPotions) ? raw.customPotions : [],
    notes: raw.notes ?? "",
    customSections: asArr(raw.customSections),
    weapons: asArr(raw.weapons).map((weapon: any) => ({
      ...weapon,
      description: weapon?.description ?? "",
    })),
    rollHistory: Array.isArray(raw.rollHistory) ? raw.rollHistory.slice(0, ROLL_HISTORY_MAX) : [],
    createdAt: raw.createdAt ?? now,
    updatedAt: raw.updatedAt ?? now,
  };
};
