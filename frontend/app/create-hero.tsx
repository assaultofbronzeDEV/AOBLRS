import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  TextInput,
  Animated,
  Easing,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Icon from "@react-native-vector-icons/material-design-icons";

import { fonts, setThemeAge, useTheme, ThemeColors } from "@/src/theme";
import {
  Ability,
  createEmptyAbility,
  createEmptyCharacter,
  createEmptyInventoryItem,
  createEmptyMonster,
  createEmptyArmour,
  defaultHeroStats,
  defaultMonsterStats,
  genId,
  HP_MAX,
  StatBlock,
  StatKey,
} from "@/src/types";
import { upsertCharacter } from "@/src/storage/characters";
import { CLASSES, RACES, Race, CharClass, TraitRef, traitKey } from "@/src/data/lineages";
import type { AbilityPreset } from "@/src/data/abilities";
import PickerSheet from "@/src/components/PickerSheet";
import AbilityCard from "@/src/components/AbilityCard";
import { useKeyboardBottomSpace } from "@/src/utils/useKeyboardBottomSpace";
import { AgeId, DEFAULT_AGE_ID } from "@/src/ages";
import { getAgeCatalog } from "@/src/ageCatalog";
import CustomPresetModal from "@/src/components/CustomPresetModal";
import { CustomPreset, CustomPresetKind, addCustomPreset, deleteCustomPreset, loadCustomPresets } from "@/src/storage/customPresets";
import ExportSheetModal from "@/src/components/ExportSheetModal";
import ImportEntityModal from "@/src/components/ImportEntityModal";
import { ExportEntity, StatRollPreset } from "@/src/storage/sheetTransfer";

// ---------- Steps ----------
type Step = 0 | 1 | 2 | 3 | 4 | 5;
const HERO_STEP_LABELS = ["Race", "Class", "Roll", "Assign", "Abilities", "Finalize"];
const MONSTER_STEP_LABELS = ["Type", "Roll", "Assign", "Finalize"];

// ---------- Slots for tap-to-assign ----------
type SlotRef = { statKey: StatKey; subIndex: number | null }; // null = main stat
const STATS_ORDER: StatKey[] = ["STR", "DEX", "INT", "CHA"];
const STAT_TITLES: Record<StatKey, string> = {
  STR: "STRENGTH",
  DEX: "DEXTERITY",
  INT: "INTELLIGENCE",
  CHA: "CHARISMA",
};
const SUB_NAMES: Record<StatKey, string[]> = {
  STR: ["Lifting", "Climbing", "Intimidation", "Vitality"],
  DEX: ["Melee Attack", "Ranged Attack", "Sleight of Hand", "Stealth"],
  INT: ["Perception", "Investigation", "History", "First Aid"],
  CHA: ["Persuasion", "Deception", "Haggling", "Creature Handling"],
};

const traitLabel = (trait: TraitRef) =>
  trait.subIndex == null
    ? `${STAT_TITLES[trait.statKey]} (MAIN)`
    : SUB_NAMES[trait.statKey][trait.subIndex];

const slotKey = (s: SlotRef) => `${s.statKey}.${s.subIndex ?? "M"}`;

const MONSTER_SLOTS: SlotRef[] = [
  { statKey: "STR", subIndex: null },
  { statKey: "DEX", subIndex: null },
  { statKey: "DEX", subIndex: 0 },
  { statKey: "DEX", subIndex: 1 },
  { statKey: "INT", subIndex: null },
];

type MonsterType = {
  id: string;
  name: string;
  tagline: string;
  lore: string;
  health: number;
  armour: number;
  attackRoll: string;
  attackName?: string;
  specialAbility?: string;
  specialRoll?: string;
  oncePerRest?: string;
  statValues?: [number, number, number, number, number];
  weaponName?: string;
  weaponDamageRoll?: string;
  weaponAttackKind?: "melee" | "ranged";
  oncePerTurnName?: string;
  oncePerTurnDescription?: string;
  oncePerTurnRoll?: string;
  oncePerRestName?: string;
  oncePerRestDescription?: string;
  oncePerRestRoll?: string;
  oncePerRestType?: "damage" | "healing" | "none";
  high?: TraitRef[];
  low?: TraitRef[];
};

// Converts a saved CustomPreset into the shape each easy-creation step expects.
function presetToRace(preset: CustomPreset): Race {
  return {
    id: preset.id,
    name: preset.name,
    tagline: preset.description || "A custom bloodline.",
    lore: preset.description || "A custom bloodline forged by the table.",
    high: preset.good,
    low: preset.bad,
  };
}

function presetToClass(preset: CustomPreset): CharClass {
  const weapon = preset.weapon ?? { name: "Simple Weapon", attackKind: "melee" as const, damageRoll: "1d6" };
  return {
    id: preset.id,
    name: preset.name,
    tagline: preset.description || "A custom calling.",
    lore: preset.description || "A custom calling forged by the table.",
    baseArmour: 2,
    weapons: [weapon],
    high: preset.good,
    low: preset.bad,
  };
}

function presetToMonsterType(preset: CustomPreset): MonsterType {
  const health = preset.maxHealth ?? 15;
  return {
    id: preset.id,
    name: preset.name,
    tagline: preset.description || "A custom threat.",
    lore: preset.description || "A custom threat forged by the table.",
    health,
    armour: 2,
    attackRoll: "1d6",
    weaponName: "Simple Weapon",
    weaponDamageRoll: "1d6",
    weaponAttackKind: "melee",
    oncePerTurnName: "Strike",
    oncePerTurnDescription: "A basic attack.",
    oncePerTurnRoll: "1d6",
    oncePerRestName: "Second Wind",
    oncePerRestDescription: "Regain some strength.",
    oncePerRestRoll: "1d6",
    oncePerRestType: "healing",
    high: preset.good,
    low: preset.bad,
  };
}

const CUSTOM_MONSTER: MonsterType = {
  id: "custom-monster",
  name: "Custom Enemy",
  tagline: "A blank slate for the GM.",
  lore: "Roll and assign five stats, then customize the finished enemy sheet.",
  health: 15,
  armour: 10,
  attackRoll: "1d6",
};

const MONSTER_TYPES: MonsterType[] = [
  { id: "average-npc", name: "Average NPC", tagline: "A capable everyday opponent.", lore: "A trained fighter following simple orders, dangerous in numbers and unremarkable alone.", health: 15, armour: 2, attackRoll: "1d6", statValues: [10, 10, 10, 10, 0], weaponName: "Club", weaponDamageRoll: "1d8", weaponAttackKind: "melee", oncePerTurnName: "Basic Strike", oncePerTurnDescription: "A straightforward attack.", oncePerTurnRoll: "1d6", oncePerRestName: "Second Wind", oncePerRestDescription: "Regain a little strength.", oncePerRestRoll: "1d6", oncePerRestType: "healing" },
  { id: "strong-npc", name: "Strong NPC", tagline: "A hardened and dangerous foe.", lore: "Battle-scarred and unyielding, hitting harder than most and refusing to go down easy.", health: 15, armour: 4, attackRoll: "1d8", statValues: [8, 9, 8, 9, 0], weaponName: "Warhammer", weaponDamageRoll: "1d10+5", weaponAttackKind: "melee", oncePerTurnName: "Heavy Blow", oncePerTurnDescription: "A punishing strike that leaves room for no mistake.", oncePerTurnRoll: "1d8", oncePerRestName: "Bloodied Surge", oncePerRestDescription: "Fight harder when cornered.", oncePerRestRoll: "1d8+2" },
  { id: "goblin", name: "Goblin (Basic)", tagline: "Small, scrappy, and spiteful.", lore: "Fast and sneaky, always looking for an opening to strike and flee.", health: 10, armour: 1, attackRoll: "1d8", statValues: [12, 10, 12, 10, 0], weaponName: "Rusty Dagger", weaponDamageRoll: "1d4+4", weaponAttackKind: "melee", oncePerTurnName: "Quick Stab", oncePerTurnDescription: "A darting opportunistic attack.", oncePerTurnRoll: "1d6", oncePerRestName: "Scurry Away", oncePerRestDescription: "Disengage and vanish into cover." },
  { id: "fire-goblin", name: "Fire Goblin", tagline: "A goblin with a taste for flame.", lore: "Wreathed in embers, lashing out with searing strikes that leave lingering burns.", health: 12, armour: 2, attackRoll: "1d8", specialAbility: "1d8+2 Fire Damage. Roll Vitality; on fail, take 1d4 damage next turn.", specialRoll: "1d8+2", statValues: [11, 10, 9, 8, 11], weaponName: "Firebrand", weaponDamageRoll: "1d6+4", weaponAttackKind: "melee", oncePerTurnName: "Flame Lash", oncePerTurnDescription: "A whip of burning air.", oncePerTurnRoll: "1d8+2", oncePerRestName: "Ignite", oncePerRestDescription: "Set the battlefield alight.", oncePerRestRoll: "2d8" },
  { id: "orc", name: "Orc", tagline: "Strong, direct, and relentless.", lore: "A brutal warlord whose blade and stomping fury shatter formations.", health: 30, armour: 6, attackRoll: "1d12+3", attackName: "Sword of Dread", specialAbility: "Thundering Stomp: 1d12+6 damage within 10ft; all within radius make a DEX save.", specialRoll: "1d12+6", statValues: [7, 14, 6, 12, 8], weaponName: "Sword of Dread", weaponDamageRoll: "1d10+5", weaponAttackKind: "melee", oncePerTurnName: "Thundering Stomp", oncePerTurnDescription: "All within 10ft make a DEX save or take the damage.", oncePerTurnRoll: "1d12+6", oncePerRestName: "War Cry", oncePerRestDescription: "A terrifying roar that shakes the battlefield.", oncePerRestRoll: "2d12" },
  { id: "mage", name: "Mage", tagline: "A fragile body with dangerous magic.", lore: "Frail in body but devastating in magic, favouring ranged spellfire over melee.", health: 14, armour: 1, attackRoll: "1d12+2", specialAbility: "Chosen Spell", oncePerRest: "Quick Teleport: burst of light to an unknown location within 1000ft.", statValues: [14, 7, 14, 6, 6], weaponName: "Arcane Staff", weaponDamageRoll: "1d6+4", weaponAttackKind: "ranged", oncePerTurnName: "Chosen Spell", oncePerTurnDescription: "A focused bolt of destructive magic.", oncePerTurnRoll: "1d12+2", oncePerRestName: "Quick Teleport", oncePerRestDescription: "Teleport in a burst of light to an unknown location within 1000ft." },
];

const MONSTER_LOOT = [
  { name: "Gold Coins", description: "A few warm, hard-won coins taken from the enemy's hoard." },
  { name: "Silver Coins", description: "A small handful of tarnished silver from an enemy pocket." },
  { name: "Bronze Coins", description: "Common stamped coins, carried far from their original home." },
  { name: "Bloodied Coin", description: "A tarnished coin stamped with a crude enemy mark." },
  { name: "Monster Fang", description: "A sharp trophy from something that wanted you dead." },
  { name: "Goblin Trinket", description: "A lucky scrap of metal tied to a fraying cord." },
  { name: "Charred Power-Stone", description: "Still warm, a powerful magical conduit. It smells faintly of smoke and sulfur." },
  { name: "Orc War Token", description: "A heavy bone token carved with a brutal victory mark." },
  { name: "Strange Spell Component", description: "A piece of something unnatural, useful to the right mage." },
  { name: "Black Feathers", description: "Too dark and too clean to belong to any ordinary bird." },
  { name: "Cracked Monster Eye", description: "It has gone cloudy, but seems to watch when no one is looking." },
  { name: "Stolen Signet", description: "Proof that this enemy has been raiding somewhere nearby." },
  { name: "Wrapped Silver Shards", description: "A few sharp fragments hidden inside stained cloth." },
];

const randomMonsterLoot = () => {
  const coins = MONSTER_LOOT.slice(0, 3);
  const otherLoot = MONSTER_LOOT.slice(3);
  const shuffle = <T,>(items: T[]) => {
    const shuffled = [...items];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  };
  const shuffledCoins = shuffle(coins);
  const shuffledOtherLoot = shuffle(otherLoot);
  const coinItem = createEmptyInventoryItem(shuffledCoins[0].name, shuffledCoins[0].description);
  coinItem.qty = 1 + Math.floor(Math.random() * 100);
  return [coinItem, createEmptyInventoryItem(shuffledOtherLoot[0].name, shuffledOtherLoot[0].description)];
};
// Roll 20d20 clamped [6,18].
const rollTwentyClamped = (): number[] => {
  const out: number[] = [];
  for (let i = 0; i < 20; i++) {
    const raw = 1 + Math.floor(Math.random() * 20);
    out.push(Math.max(6, Math.min(18, raw)));
  }
  return out;
};

const rollMonsterStats = (): number[] => {
  const out: number[] = [];
  for (let i = 0; i < MONSTER_SLOTS.length; i++) {
    const raw = 1 + Math.floor(Math.random() * 20);
    out.push(Math.max(6, Math.min(18, raw)));
  }
  return out;
};

// ---------- Main screen ----------
export default function CreateHeroScreen() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { kind, age } = useLocalSearchParams<{ kind?: string; age?: string }>();
  const activeAge: AgeId = age === "age-of-war" ? "age-of-war" : DEFAULT_AGE_ID;
  const ageCatalog = getAgeCatalog(activeAge);

  useEffect(() => {
    setThemeAge(activeAge);
  }, [activeAge]);
  const styles = getStyles(colors);

  const isMonsterRequest = kind === "monster";
  const [mode, setMode] = useState<"easy" | "monster" | null>(null);
  const [step, setStep] = useState<Step>(0);
  const [race, setRace] = useState<Race | null>(null);
  const [charClass, setCharClass] = useState<CharClass | null>(null);
  const [monsterType, setMonsterType] = useState<MonsterType | null>(null);
  const [pool, setPool] = useState<number[]>([]); // rolled numbers (0 if consumed)
  const [assigned, setAssigned] = useState<Record<string, number>>({});
  const [selectedRollIdx, setSelectedRollIdx] = useState<number | null>(null);
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);
  const [customRaces, setCustomRaces] = useState<Race[]>([]);
  const [customClasses, setCustomClasses] = useState<CharClass[]>([]);
  const [customMonsterTypes, setCustomMonsterTypes] = useState<MonsterType[]>([]);
  const [presetModalKind, setPresetModalKind] = useState<CustomPresetKind | null>(null);
  const [oncePerTurnAbility, setOncePerTurnAbility] = useState<Ability | null>(null);
  const [oncePerRestAbility, setOncePerRestAbility] = useState<Ability | null>(null);
  const [heroAbility, setHeroAbility] = useState<Ability | null>(null);

  const refreshCustomPresets = async (targetKind: CustomPresetKind) => {
    const list = await loadCustomPresets(targetKind);
    if (targetKind === "race") setCustomRaces(list.map(presetToRace));
    if (targetKind === "class") setCustomClasses(list.map(presetToClass));
    if (targetKind === "monsterType") setCustomMonsterTypes(list.map(presetToMonsterType));
  };

  useEffect(() => {
    refreshCustomPresets("race");
    refreshCustomPresets("class");
    refreshCustomPresets("monsterType");
  }, []);

  const saveCustomPreset = async (preset: Omit<CustomPreset, "id" | "createdAt">) => {
    const saved = await addCustomPreset(preset);
    await refreshCustomPresets(saved.kind);
    setPresetModalKind(null);
    if (saved.kind === "race") setRace(presetToRace(saved));
    if (saved.kind === "class") setCharClass(presetToClass(saved));
    if (saved.kind === "monsterType") chooseMonsterType(presetToMonsterType(saved));
  };

  const removeCustomPreset = async (targetKind: CustomPresetKind, id: string) => {
    await deleteCustomPreset(id);
    await refreshCustomPresets(targetKind);
    if (targetKind === "race" && race?.id === id) setRace(null);
    if (targetKind === "class" && charClass?.id === id) setCharClass(null);
    if (targetKind === "monsterType" && monsterType?.id === id) setMonsterType(null);
  };

  const [statsExportOpen, setStatsExportOpen] = useState(false);
  const [statsImportOpen, setStatsImportOpen] = useState(false);

  const importStats = (nextPool: number[]) => {
    setPool(nextPool);
    setAssigned({});
    setSelectedRollIdx(null);
  };

  const handleImportStatRoll = (entity: ExportEntity) => {
    const preset = entity as StatRollPreset;
    const expectedDice = isMonster ? 5 : 20;
    if (
      preset.kind !== (isMonster ? "monster" : "hero") ||
      !Array.isArray(preset.pool) ||
      preset.pool.length !== expectedDice ||
      preset.pool.some((value) => !Number.isInteger(value) || value < 6 || value > 18)
    ) return;
    importStats(preset.pool);
    setStatsImportOpen(false);
  };

  const highSet = useMemo(() => {
    const s = new Set<string>();
    race?.high.forEach((t) => s.add(traitKey(t)));
    charClass?.high.forEach((t) => s.add(traitKey(t)));
    monsterType?.high?.forEach((t) => s.add(traitKey(t)));
    return s;
  }, [race, charClass, monsterType]);

  const lowSet = useMemo(() => {
    const s = new Set<string>();
    race?.low.forEach((t) => s.add(traitKey(t)));
    charClass?.low.forEach((t) => s.add(traitKey(t)));
    monsterType?.low?.forEach((t) => s.add(traitKey(t)));
    return s;
  }, [race, charClass, monsterType]);

  const isMonster = mode === "monster";
  const wizardSlots = isMonster
    ? MONSTER_SLOTS
    : STATS_ORDER.flatMap((statKey) => [
        { statKey, subIndex: null },
        ...Array.from({ length: 4 }, (_, subIndex) => ({ statKey, subIndex })),
      ]);
  const allAssigned = Object.keys(assigned).length === wizardSlots.length;

  const goNext = () => {
    if (isMonster) {
      if (step === 0 && !monsterType) return;
      if (step === 0 && monsterType?.statValues) {
        setStep(3);
        return;
      }
      if (step === 1 && pool.length === 0) return;
      if (step === 2 && !allAssigned) return;
      setStep((s) => Math.min(3, s + 1) as Step);
      return;
    }
    if (step === 0 && !race) return;
    if (step === 1 && !charClass) return;
    if (step === 2 && pool.length === 0) return;
    if (step === 3 && !allAssigned) return;
    if (step === 4 && !(oncePerTurnAbility && oncePerRestAbility && heroAbility)) return;
    setStep((s) => Math.min(5, s + 1) as Step);
  };
  const goBack = () => setStep((s) => Math.max(0, s - 1) as Step);

  // When entering step 2, auto-roll once.
  useEffect(() => {
    const rollStep = isMonster ? 1 : 2;
    if (step === rollStep && pool.length === 0) {
      setPool(isMonster ? rollMonsterStats() : rollTwentyClamped());
    }
  }, [isMonster, step, pool.length]);

  const reroll = () => {
    setPool(isMonster ? rollMonsterStats() : rollTwentyClamped());
    setAssigned({});
    setSelectedRollIdx(null);
  };

  const chooseMonsterType = (type: MonsterType) => {
    setMonsterType(type);
    if (type.statValues) {
      setAssigned(Object.fromEntries(MONSTER_SLOTS.map((slot, i) => [slotKey(slot), type.statValues![i]])));
      setPool([]);
    }
  };

  const startNewMonster = () => {
    setMonsterType(CUSTOM_MONSTER);
    setAssigned({});
    setPool([]);
    setSelectedRollIdx(null);
    setStep(1);
  };

  const autoFill = () => {
    const slots = wizardSlots;

    // Keep values already placed by the player and fill only the remaining slots.
    const available = pool.filter((v) => v !== 0);
    const remainingSlots = slots.filter((s) => assigned[slotKey(s)] == null);
    if (available.length !== remainingSlots.length) return; // safety

    // Partition slots: greens get lowest, reds get highest, rest random.
    const green: SlotRef[] = [];
    const red: SlotRef[] = [];
    const neutral: SlotRef[] = [];
    for (const s of remainingSlots) {
      const traitK = traitKey(s);
      if (highSet.has(traitK)) green.push(s);
      else if (lowSet.has(traitK)) red.push(s);
      else neutral.push(s);
    }

    const asc = [...available].sort((a, b) => a - b);
    const nextAssigned: Record<string, number> = { ...assigned };

    // Green slots get the lowest N numbers (in random order among greens).
    const shuffle = <T,>(arr: T[]): T[] => {
      const out = [...arr];
      for (let i = out.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [out[i], out[j]] = [out[j], out[i]];
      }
      return out;
    };

    const lowest = asc.slice(0, green.length);
    const highest = asc.slice(asc.length - red.length);
    const middle = asc.slice(green.length, asc.length - red.length);

    const shuffledLowest = shuffle(lowest);
    const shuffledHighest = shuffle(highest);
    const shuffledMiddle = shuffle(middle);
    const shuffledNeutral = shuffle(neutral);

    green.forEach((s, i) => {
      nextAssigned[slotKey(s)] = shuffledLowest[i];
    });
    red.forEach((s, i) => {
      nextAssigned[slotKey(s)] = shuffledHighest[i];
    });
    shuffledNeutral.forEach((s, i) => {
      nextAssigned[slotKey(s)] = shuffledMiddle[i];
    });

    setAssigned(nextAssigned);
    setPool((prev) => prev.map(() => 0)); // remaining values fully consumed
    setSelectedRollIdx(null);
  };

  const onPickRoll = (idx: number) => {
    if (pool[idx] === 0) return;
    setSelectedRollIdx((cur) => (cur === idx ? null : idx));
  };

  const onPickSlot = (slot: SlotRef) => {
    const k = slotKey(slot);
    // If slot has a value and no roll is selected, return it to the pool.
    if (assigned[k] != null && selectedRollIdx == null) {
      const val = assigned[k];
      setAssigned((prev) => {
        const next = { ...prev };
        delete next[k];
        return next;
      });
      // find first zero in pool and refill
      setPool((prev) => {
        const next = [...prev];
        const zeroIdx = next.findIndex((v) => v === 0);
        if (zeroIdx >= 0) next[zeroIdx] = val;
        else next.push(val);
        return next;
      });
      return;
    }
    if (selectedRollIdx == null) return;
    const val = pool[selectedRollIdx];
    if (!val) return;
    // If slot occupied, return old value to pool first.
    setAssigned((prev) => {
      const next = { ...prev };
      const prevVal = next[k];
      next[k] = val;
      if (prevVal != null) {
        setPool((p) => {
          const nx = [...p];
          nx[selectedRollIdx] = prevVal;
          return nx;
        });
      } else {
        setPool((p) => {
          const nx = [...p];
          nx[selectedRollIdx] = 0;
          return nx;
        });
      }
      return next;
    });
    setSelectedRollIdx(null);
  };

  const finalize = async () => {
    if (isMonster) {
      if (!monsterType || !allAssigned) return;
      setSaving(true);
      const base = createEmptyMonster();
      const stats = defaultMonsterStats();
      for (const st of stats) {
        const mainKey = slotKey({ statKey: st.key, subIndex: null });
        if (assigned[mainKey] != null) st.value = assigned[mainKey];
        st.subs = st.subs.map((sub, i) => ({
          ...sub,
          value: assigned[slotKey({ statKey: st.key, subIndex: i })] ?? sub.value,
        }));
      }
      const monster = {
        ...base,
        age: activeAge,
        name: name.trim() || monsterType.name,
        className: monsterType.name,
        hp: monsterType.health,
        maxHp: monsterType.health,
        stats,
        meleeDmg: monsterType.weaponDamageRoll ?? monsterType.attackRoll,
        armour: String(monsterType.armour),
        equippedArmour: {
          ...createEmptyArmour(),
          name: monsterType.armour > 0 ? "Natural Armour" : "Unarmoured",
          description: monsterType.armour > 0 ? "Natural protection." : "No armour equipped. Move up to 30ft.",
          damageReduction: String(monsterType.armour),
        },
        weapons: [{
          id: genId(),
          name: monsterType.weaponName ?? "Enemy weapon",
          attackKind: monsterType.weaponAttackKind ?? "melee",
          damageRoll: monsterType.weaponDamageRoll ?? monsterType.attackRoll,
        }],
        oncePerTurn: [{
          id: genId(),
          title: monsterType.oncePerTurnName ?? monsterType.attackName ?? "Once Per Turn Attack",
          description: monsterType.oncePerTurnDescription ?? `${monsterType.attackRoll} damage`,
          effectRoll: monsterType.oncePerTurnRoll ?? monsterType.attackRoll,
          effectType: "damage" as const,
          used: false,
        }],
        oncePerRest: [{
          id: genId(),
          title: monsterType.oncePerRestName ?? "Once Per Rest Ability",
          description: monsterType.oncePerRestDescription ?? "A powerful reserve ability.",
          effectRoll: monsterType.oncePerRestRoll ?? "",
          effectType: monsterType.oncePerRestType ?? (monsterType.oncePerRestRoll ? "damage" : "none"),
          used: false,
        }],
        heroAbilities: [],
        inventoryItems: randomMonsterLoot(),
        backstory: `${monsterType.name}. ${monsterType.tagline} ${monsterType.lore}`,
      };
      await upsertCharacter(monster, activeAge);
      router.replace(`/character/${monster.id}?age=${activeAge}`);
      return;
    }
    if (!race || !charClass || !allAssigned) return;
    setSaving(true);
    const base = createEmptyCharacter();
    const stats = defaultHeroStats();
    for (const st of stats) {
      const mainKey = slotKey({ statKey: st.key, subIndex: null });
      if (assigned[mainKey] != null) st.value = assigned[mainKey];
      st.subs = st.subs.map((sub, i) => {
        const k = slotKey({ statKey: st.key, subIndex: i });
        return { ...sub, value: assigned[k] ?? sub.value };
      });
    }
    const trimmedName = name.trim() || `${race.name.split(" / ")[0]} ${charClass.name}`;
    const starterItems = ageCatalog.itemCategoryOrder.map((category) => {
      const options = ageCatalog.items.filter((item) => item.category === category);
      const preset = options[Math.floor(Math.random() * options.length)];
      const label = preset.price ? `${preset.name} (${preset.price})` : preset.name;
      return createEmptyInventoryItem(label, preset.notes ?? "");
    });
    const hero = {
      ...base,
      name: trimmedName,
      className: charClass.name,
      level: "1",
      hp: HP_MAX,
      maxHp: HP_MAX,
      armour: String(charClass.baseArmour),
      equippedArmour: {
        ...createEmptyArmour(),
        name: "Starting Armour",
        description: "Starting protection from your class.",
        damageReduction: String(charClass.baseArmour),
      },
      meleeDmg: charClass.weapons[0]?.damageRoll ?? "1d6",
      stats,
      weapons: charClass.weapons.map((w) => ({
        id: genId(),
        name: w.name,
        attackKind: w.attackKind,
        damageRoll: w.damageRoll,
      })),
      oncePerTurn: [oncePerTurnAbility ?? createEmptyAbility()],
      oncePerRest: [oncePerRestAbility ?? createEmptyAbility()],
      heroAbilities: [heroAbility ?? createEmptyAbility()],
      inventoryItems: starterItems,
      backstory: `${race.name} ${charClass.name}. ${charClass.tagline}`,
    };
    await upsertCharacter(hero, activeAge);
    router.replace(`/character/${hero.id}?age=${activeAge}`);
  };

  const startCustom = async () => {
    setSaving(true);
    const character = isMonsterRequest ? createEmptyMonster() : createEmptyCharacter();
    character.age = activeAge;
    character.name = isMonsterRequest ? "New Enemy" : "New Hero";
    await upsertCharacter(character);
    await upsertCharacter(character, activeAge);
    router.replace(`/character/${character.id}?age=${activeAge}`);
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Pressable
          testID="creator-close"
          onPress={() => router.back()}
          hitSlop={10}
          style={({ pressed }) => [
            styles.iconBtn,
            { backgroundColor: pressed ? colors.brandTertiary : "transparent" },
          ]}
        >
          <Icon name="close" size={22} color={colors.onSurface} />
        </Pressable>
        <Text style={styles.headerTitle} numberOfLines={1}>
          {mode == null ? (isMonsterRequest ? "New Enemy" : "New Hero") : isMonster ? "Forge an Enemy" : "Forge a Hero"}
        </Text>
        <View style={{ width: 36 }} />
      </View>

      {mode == null ? (
        <ModePicker
          monster={isMonsterRequest}
          onEasy={() => setMode(isMonsterRequest ? "monster" : "easy")}
          onCustom={startCustom}
          saving={saving}
        />
      ) : (
        <>
          <StepBar step={step} labels={isMonster ? MONSTER_STEP_LABELS : HERO_STEP_LABELS} />

      <View style={{ flex: 1 }}>
        {!isMonster && step === 0 && (
          <RaceStep
            selected={race}
            onSelect={setRace}
            customRaces={customRaces}
            onCreateCustom={() => setPresetModalKind("race")}
            onDeleteCustom={(id) => removeCustomPreset("race", id)}
          />
        )}
        {!isMonster && step === 1 && (
          <ClassStep
            selected={charClass}
            onSelect={setCharClass}
            customClasses={customClasses}
            onCreateCustom={() => setPresetModalKind("class")}
            onDeleteCustom={(id) => removeCustomPreset("class", id)}
          />
        )}
        {isMonster && step === 0 && (
          <MonsterTypeStep
            selected={monsterType}
            onSelect={chooseMonsterType}
            onNew={startNewMonster}
            customMonsterTypes={customMonsterTypes}
            onCreateCustom={() => setPresetModalKind("monsterType")}
            onDeleteCustom={(id) => removeCustomPreset("monsterType", id)}
          />
        )}
        {((!isMonster && step === 2) || (isMonster && step === 1)) && (
          <RollStep
            pool={pool}
            onReroll={reroll}
            monster={isMonster}
            onExportStats={() => setStatsExportOpen(true)}
            onImportStats={() => setStatsImportOpen(true)}
          />
        )}
        {!isMonster && step === 3 && race && charClass && (
          <AssignStep
            pool={pool}
            assigned={assigned}
            selectedRollIdx={selectedRollIdx}
            highSet={highSet}
            lowSet={lowSet}
            onPickRoll={onPickRoll}
            onPickSlot={onPickSlot}
            onReroll={reroll}
            onAutoFill={autoFill}
          />
        )}
        {isMonster && step === 2 && monsterType && (
          <MonsterAssignStep
            pool={pool}
            assigned={assigned}
            selectedRollIdx={selectedRollIdx}
            highSet={highSet}
            lowSet={lowSet}
            onPickRoll={onPickRoll}
            onPickSlot={onPickSlot}
            onReroll={reroll}
            onAutoFill={autoFill}
          />
        )}
        {!isMonster && step === 4 && (
          <AbilitiesStep
            options={ageCatalog.abilities}
            categoryOrder={ageCatalog.abilityCategoryOrder}
            oncePerTurnAbility={oncePerTurnAbility}
            onSelectOncePerTurn={setOncePerTurnAbility}
            oncePerRestAbility={oncePerRestAbility}
            onSelectOncePerRest={setOncePerRestAbility}
            heroAbility={heroAbility}
            onSelectHeroAbility={setHeroAbility}
            stats={defaultHeroStats()}
          />
        )}
        {!isMonster && step === 5 && race && charClass && (
          <FinalizeStep
            race={race}
            charClass={charClass}
            name={name}
            setName={setName}
          />
        )}
        {isMonster && step === 3 && monsterType && (
          <MonsterFinalizeStep monsterType={monsterType} name={name} setName={setName} />
        )}
      </View>

      <View style={[styles.footer, { paddingBottom: 12 + insets.bottom }]}>
        <Pressable
          testID="creator-back"
          onPress={goBack}
          disabled={step === 0}
          style={({ pressed }) => [
            styles.footerBtn,
            styles.footerBack,
            {
              borderColor: colors.borderStrong,
              backgroundColor: pressed ? colors.brandTertiary : colors.surfaceSecondary,
              opacity: step === 0 ? 0.4 : 1,
            },
          ]}
        >
          <Icon name="chevron-left" size={18} color={colors.onSurface} />
          <Text style={[styles.footerBtnText, { color: colors.onSurface }]}>Back</Text>
        </Pressable>

        {step < (isMonster ? 3 : 5) ? (
          <Pressable
            testID="creator-next"
            onPress={goNext}
            disabled={
              isMonster
                ? (step === 0 && !monsterType) || (step === 2 && !allAssigned)
                : (step === 0 && !race) || (step === 1 && !charClass) || (step === 3 && !allAssigned) || (step === 4 && !(oncePerTurnAbility && oncePerRestAbility && heroAbility))
            }
            style={({ pressed }) => {
              const disabled =
                isMonster
                  ? (step === 0 && !monsterType) || (step === 2 && !allAssigned)
                  : (step === 0 && !race) || (step === 1 && !charClass) || (step === 3 && !allAssigned) || (step === 4 && !(oncePerTurnAbility && oncePerRestAbility && heroAbility));
              return [
                styles.footerBtn,
                {
                  borderColor: colors.borderStrong,
                  backgroundColor: pressed
                    ? colors.brandSecondary
                    : disabled
                      ? colors.surfaceTertiary
                      : colors.brandPrimary,
                  opacity: disabled ? 0.5 : 1,
                },
              ];
            }}
          >
            <Text
              style={[
                styles.footerBtnText,
                { color: colors.onBrandPrimary },
              ]}
            >
              {step === (isMonster ? 2 : 4) ? "Review" : "Next"}
            </Text>
            <Icon name="chevron-right" size={18} color={colors.onBrandPrimary} />
          </Pressable>
        ) : (
          <Pressable
            testID="creator-finish"
            onPress={finalize}
            disabled={saving}
            style={({ pressed }) => [
              styles.footerBtn,
              {
                borderColor: colors.borderStrong,
                backgroundColor: pressed ? colors.brandSecondary : colors.brandPrimary,
                opacity: saving ? 0.6 : 1,
              },
            ]}
          >
            <Icon name="shield-sword" size={18} color={colors.onBrandPrimary} />
            <Text style={[styles.footerBtnText, { color: colors.onBrandPrimary }]}>
              {saving ? "Forging…" : isMonster ? "Forge Enemy" : "Forge Hero"}
            </Text>
          </Pressable>
        )}
      </View>
        </>
      )}

      <CustomPresetModal
        visible={presetModalKind != null}
        kind={presetModalKind ?? "race"}
        onClose={() => setPresetModalKind(null)}
        onSaved={saveCustomPreset}
      />

      <ExportSheetModal
        visible={statsExportOpen}
        onClose={() => setStatsExportOpen(false)}
        entity={{
          type: "statRoll",
          value: {
            id: "draft",
            name: isMonster ? "Enemy Stat Roll" : "Party Stat Roll",
            kind: isMonster ? "monster" : "hero",
            pool,
          },
        }}
      />
      <ImportEntityModal
        visible={statsImportOpen}
        expectedType="statRoll"
        onClose={() => setStatsImportOpen(false)}
        onImport={handleImportStatRoll}
      />
    </View>
  );
}

// ---------- Mode picker ----------
function ModePicker({
  monster = false,
  onEasy,
  onCustom,
  saving,
}: {
  monster?: boolean;
  onEasy: () => void;
  onCustom: () => void;
  saving: boolean;
}) {
  const { colors } = useTheme();
  const styles = getStyles(colors);
  return (
    <ScrollView contentContainerStyle={styles.modeBody}>
      <Text style={styles.stepHeading}>{monster ? "How shall we forge this enemy?" : "How shall we begin?"}</Text>
      <Text style={styles.stepSubHeading}>
        {monster
          ? "Choose a guided enemy profile or start with a blank enemy sheet."
          : "Choose your path. You can always tweak everything on the sheet afterwards."}
      </Text>

      <Pressable
        testID="mode-easy"
        onPress={onEasy}
        disabled={saving}
        style={({ pressed }) => [
          styles.modeCard,
          {
            borderColor: colors.brandPrimary,
            backgroundColor: pressed ? colors.brandTertiary : colors.surfaceSecondary,
          },
        ]}
      >
        <View style={styles.modeIconWrap}>
          <Icon name="auto-fix" size={30} color={colors.brandPrimary} />
        </View>
        <Text style={styles.modeTitle}>{monster ? "Basic Enemy" : "Easy Creation"}</Text>
        <Text style={styles.modeSub}>
          {monster
            ? "Pick an enemy type, roll five stats, and assign them to the creature's core abilities."
            : "A guided 5-step forge. Pick a race and class, roll 20 dice, and tap them into place. Great for a first hero or players new to the system."}
        </Text>
        <View style={styles.modeMetaRow}>
          <View style={styles.modeMetaChip}>
            <Icon name="account-star" size={12} color={colors.brandPrimary} />
            <Text style={styles.modeMetaText}>{monster ? "6 Types" : "9 Races"}</Text>
          </View>
          <View style={styles.modeMetaChip}>
            <Icon name="shield-sword" size={12} color={colors.brandPrimary} />
            <Text style={styles.modeMetaText}>{monster ? "5 Stats" : "8 Classes"}</Text>
          </View>
          <View style={styles.modeMetaChip}>
            <Icon name="dice-multiple" size={12} color={colors.brandPrimary} />
            <Text style={styles.modeMetaText}>Fastest start</Text>
          </View>
        </View>
        <View style={[styles.modeCta, { backgroundColor: colors.brandPrimary }]}>
          <Text style={[styles.modeCtaText, { color: colors.onBrandPrimary }]}>
            {monster ? "Start enemy forge" : "Start guided forge"}
          </Text>
          <Icon name="chevron-right" size={16} color={colors.onBrandPrimary} />
        </View>
      </Pressable>

      <Pressable
        testID="mode-custom"
        onPress={onCustom}
        disabled={saving}
        style={({ pressed }) => [
          styles.modeCard,
          {
            borderColor: colors.borderStrong,
            backgroundColor: pressed ? colors.surfaceTertiary : colors.surface,
            opacity: saving ? 0.6 : 1,
          },
        ]}
      >
        <View style={styles.modeIconWrap}>
          <Icon name="pencil-outline" size={30} color={colors.onSurface} />
        </View>
        <Text style={styles.modeTitle}>{monster ? "Custom Enemy" : "Custom Creation"}</Text>
        <Text style={styles.modeSub}>
          {monster
            ? "Skip the wizard and open a blank enemy sheet. Add the name, stats, loot, weapons, and abilities yourself."
            : "Skip the wizard entirely and land on a blank sheet. Fill in name, class, stats, weapons and abilities by hand. Perfect for veterans porting an existing hero."}
        </Text>
        <View style={styles.modeMetaRow}>
          <View style={styles.modeMetaChip}>
            <Icon name="tune" size={12} color={colors.onSurface} />
            <Text style={styles.modeMetaText}>Total control</Text>
          </View>
        </View>
        <View style={[styles.modeCta, { backgroundColor: colors.surfaceSecondary, borderWidth: 2, borderColor: colors.borderStrong }]}>
          <Text style={[styles.modeCtaText, { color: colors.onSurface }]}>
            {saving ? "Preparing…" : monster ? "Blank enemy sheet" : "Straight to sheet"}
          </Text>
          <Icon name="chevron-right" size={16} color={colors.onSurface} />
        </View>
      </Pressable>
    </ScrollView>
  );
}

// ---------- Step bar ----------
function StepBar({ step, labels }: { step: Step; labels: string[] }) {
  const { colors } = useTheme();
  const styles = getStyles(colors);
  return (
    <View style={styles.stepBar}>
      {labels.map((label, i) => {
        const active = i === step;
        const done = i < step;
        return (
          <View key={label} style={styles.stepPill}>
            <View
              style={[
                styles.stepDot,
                {
                  backgroundColor: done
                    ? colors.brandPrimary
                    : active
                      ? colors.brandSecondary
                      : colors.surfaceTertiary,
                  borderColor: colors.borderStrong,
                },
              ]}
            >
              <Text
                style={[
                  styles.stepDotText,
                  { color: done || active ? colors.onBrandPrimary : colors.muted },
                ]}
              >
                {i + 1}
              </Text>
            </View>
            <Text
              numberOfLines={1}
              style={[
                styles.stepLabel,
                {
                  color: active ? colors.onSurface : colors.muted,
                  fontFamily: active ? fonts.displayBold : fonts.display,
                },
              ]}
            >
              {label}
            </Text>
          </View>
        );
      })}
    </View>
  );
}

// ---------- Race step ----------
function RaceStep({
  selected,
  onSelect,
  customRaces,
  onCreateCustom,
  onDeleteCustom,
}: {
  selected: Race | null;
  onSelect: (r: Race) => void;
  customRaces: Race[];
  onCreateCustom: () => void;
  onDeleteCustom: (id: string) => void;
}) {
  const { colors } = useTheme();
  const styles = getStyles(colors);
  return (
    <ScrollView contentContainerStyle={styles.stepBody}>
      <Text style={styles.stepHeading}>Choose your bloodline</Text>
      <Text style={styles.stepSubHeading}>
        Green traits are natural strengths. Place a LOW roll there. Red traits are weak spots. Place a HIGH roll there.
      </Text>
      <Pressable
        testID="create-custom-race"
        onPress={onCreateCustom}
        style={({ pressed }) => [
          styles.modeCta,
          {
            borderWidth: 2,
            borderColor: colors.brandPrimary,
            backgroundColor: pressed ? colors.brandSecondary : colors.brandPrimary,
          },
        ]}
      >
        <Icon name="pencil-plus" size={16} color={colors.onBrandPrimary} />
        <Text style={[styles.modeCtaText, { color: colors.onBrandPrimary }]}>Create Custom Race</Text>
        <Icon name="chevron-right" size={16} color={colors.onBrandPrimary} />
      </Pressable>
      {customRaces.length > 0 && <Text style={styles.sectionLabel}>CUSTOM RACES</Text>}
      {customRaces.map((r) => (
        <PickerCard
          key={r.id}
          testID={`race-${r.id}`}
          selected={selected?.id === r.id}
          title={r.name}
          tagline={r.tagline}
          lore={r.lore}
          high={r.high}
          low={r.low}
          onPress={() => onSelect(r)}
          onDelete={() => onDeleteCustom(r.id)}
        />
      ))}
      {customRaces.length > 0 && <Text style={styles.sectionLabel}>STANDARD RACES</Text>}
      {RACES.map((r) => (
        <PickerCard
          key={r.id}
          testID={`race-${r.id}`}
          selected={selected?.id === r.id}
          title={r.name}
          tagline={r.tagline}
          lore={r.lore}
          high={r.high}
          low={r.low}
          onPress={() => onSelect(r)}
        />
      ))}
    </ScrollView>
  );
}

// ---------- Class step ----------
function ClassStep({
  selected,
  onSelect,
  customClasses,
  onCreateCustom,
  onDeleteCustom,
}: {
  selected: CharClass | null;
  onSelect: (c: CharClass) => void;
  customClasses: CharClass[];
  onCreateCustom: () => void;
  onDeleteCustom: (id: string) => void;
}) {
  const { colors } = useTheme();
  const styles = getStyles(colors);
  return (
    <ScrollView contentContainerStyle={styles.stepBody}>
      <Text style={styles.stepHeading}>Choose your calling</Text>
      <Text style={styles.stepSubHeading}>
        Sets your starting Armour and weapon(s). Traits stack with your race&apos;s hints.
      </Text>
      <Pressable
        testID="create-custom-class"
        onPress={onCreateCustom}
        style={({ pressed }) => [
          styles.modeCta,
          {
            borderWidth: 2,
            borderColor: colors.brandPrimary,
            backgroundColor: pressed ? colors.brandSecondary : colors.brandPrimary,
          },
        ]}
      >
        <Icon name="pencil-plus" size={16} color={colors.onBrandPrimary} />
        <Text style={[styles.modeCtaText, { color: colors.onBrandPrimary }]}>Create Custom Class</Text>
        <Icon name="chevron-right" size={16} color={colors.onBrandPrimary} />
      </Pressable>
      {customClasses.length > 0 && <Text style={styles.sectionLabel}>CUSTOM CLASSES</Text>}
      {customClasses.map((c) => (
        <PickerCard
          key={c.id}
          testID={`class-${c.id}`}
          selected={selected?.id === c.id}
          title={c.name}
          tagline={c.tagline}
          lore={c.lore}
          high={c.high}
          low={c.low}
          onPress={() => onSelect(c)}
          onDelete={() => onDeleteCustom(c.id)}
          extra={
            <View style={styles.classExtras}>
              <View style={styles.classExtraChip}>
                <Icon name="shield" size={12} color={colors.brandPrimary} />
                <Text style={styles.classExtraText}>Armour {c.baseArmour}</Text>
              </View>
              {c.weapons.map((w, i) => (
                <View key={i} style={styles.classExtraChip}>
                  <Icon
                    name={w.attackKind === "ranged" ? "bow-arrow" : "sword"}
                    size={12}
                    color={colors.brandPrimary}
                  />
                  <Text style={styles.classExtraText}>
                    {w.name} ({w.damageRoll})
                  </Text>
                </View>
              ))}
            </View>
          }
        />
      ))}
      {customClasses.length > 0 && <Text style={styles.sectionLabel}>STANDARD CLASSES</Text>}
      {CLASSES.map((c) => (
        <PickerCard
          key={c.id}
          testID={`class-${c.id}`}
          selected={selected?.id === c.id}
          title={c.name}
          tagline={c.tagline}
          lore={c.lore}
          high={c.high}
          low={c.low}
          onPress={() => onSelect(c)}
          extra={
            <View style={styles.classExtras}>
              <View style={styles.classExtraChip}>
                <Icon name="shield" size={12} color={colors.brandPrimary} />
                <Text style={styles.classExtraText}>Armour {c.baseArmour}</Text>
              </View>
              {c.weapons.map((w, i) => (
                <View key={i} style={styles.classExtraChip}>
                  <Icon
                    name={w.attackKind === "ranged" ? "bow-arrow" : "sword"}
                    size={12}
                    color={colors.brandPrimary}
                  />
                  <Text style={styles.classExtraText}>
                    {w.name} ({w.damageRoll})
                  </Text>
                </View>
              ))}
            </View>
          }
        />
      ))}
    </ScrollView>
  );
}

function MonsterTypeStep({
  selected,
  onSelect,
  onNew,
  customMonsterTypes,
  onCreateCustom,
  onDeleteCustom,
}: {
  selected: MonsterType | null;
  onSelect: (type: MonsterType) => void;
  onNew: () => void;
  customMonsterTypes: MonsterType[];
  onCreateCustom: () => void;
  onDeleteCustom: (id: string) => void;
}) {
  const { colors } = useTheme();
  const styles = getStyles(colors);
  return (
    <ScrollView contentContainerStyle={styles.stepBody}>
      <Text style={styles.stepHeading}>Choose an enemy type</Text>
      <Text style={styles.stepSubHeading}>
        Pick a shape for the threat. You can rename and customize the enemy once it is forged.
      </Text>
      <Pressable
        testID="new-monster-preset"
        onPress={onNew}
        style={({ pressed }) => [
          styles.modeCta,
          {
            borderWidth: 2,
            borderColor: colors.brandPrimary,
            backgroundColor: pressed ? colors.brandSecondary : colors.brandPrimary,
          },
        ]}
      >
        <Icon name="dice-multiple" size={16} color={colors.onBrandPrimary} />
        <Text style={[styles.modeCtaText, { color: colors.onBrandPrimary }]}>New Enemy, Randomized Stats</Text>
        <Icon name="chevron-right" size={16} color={colors.onBrandPrimary} />
      </Pressable>
      <Pressable
        testID="create-custom-monster-type"
        onPress={onCreateCustom}
        style={({ pressed }) => [
          styles.modeCta,
          {
            borderWidth: 2,
            borderColor: colors.borderStrong,
            backgroundColor: pressed ? colors.surfaceTertiary : colors.surfaceSecondary,
          },
        ]}
      >
        <Icon name="pencil-plus" size={16} color={colors.onSurface} />
        <Text style={[styles.modeCtaText, { color: colors.onSurface }]}>Create Custom Enemy Type</Text>
        <Icon name="chevron-right" size={16} color={colors.onSurface} />
      </Pressable>
      {customMonsterTypes.length > 0 && <Text style={styles.sectionLabel}>CUSTOM ENEMIES</Text>}
      {customMonsterTypes.map((type) => (
        <PickerCard
          key={type.id}
          testID={`monster-type-${type.id}`}
          selected={selected?.id === type.id}
          title={type.name}
          tagline={type.tagline}
          lore={type.lore}
          high={type.high ?? []}
          low={type.low ?? []}
          onPress={() => onSelect(type)}
          onDelete={() => onDeleteCustom(type.id)}
          extra={
            <View style={styles.classExtras}>
              <View style={styles.classExtraChip}>
                <Icon name="heart" size={12} color={colors.brandSecondary} />
                <Text style={styles.classExtraText}>HP {type.health}</Text>
              </View>
              <View style={styles.classExtraChip}>
                <Icon name="sword" size={12} color={colors.brandPrimary} />
                <Text style={styles.classExtraText}>{type.attackRoll} damage</Text>
              </View>
            </View>
          }
        />
      ))}
      {customMonsterTypes.length > 0 && <Text style={styles.sectionLabel}>STANDARD ENEMIES</Text>}
      {MONSTER_TYPES.map((type) => (
        <PickerCard
          key={type.id}
          testID={`monster-type-${type.id}`}
          selected={selected?.id === type.id}
          title={type.name}
          tagline={type.tagline}
          lore={type.lore}
          high={type.high ?? []}
          low={type.low ?? []}
          onPress={() => onSelect(type)}
          extra={
            <View style={styles.classExtras}>
              <View style={styles.classExtraChip}>
                <Icon name="heart" size={12} color={colors.brandSecondary} />
                <Text style={styles.classExtraText}>HP {type.health}</Text>
              </View>
              <View style={styles.classExtraChip}>
                <Icon name="sword" size={12} color={colors.brandPrimary} />
                <Text style={styles.classExtraText}>{type.attackRoll} damage</Text>
              </View>
            </View>
          }
        />
      ))}
    </ScrollView>
  );
}

// ---------- Picker card ----------
function PickerCard({
  selected,
  title,
  tagline,
  lore,
  high,
  low,
  onPress,
  extra,
  testID,
  onDelete,
}: {
  selected: boolean;
  title: string;
  tagline: string;
  lore: string;
  high: TraitRef[];
  low: TraitRef[];
  onPress: () => void;
  extra?: React.ReactNode;
  testID?: string;
  onDelete?: () => void;
}) {
  const { colors } = useTheme();
  const styles = getStyles(colors);
  return (
    <Pressable
      testID={testID}
      onPress={onPress}
      style={({ pressed }) => [
        styles.pickerCard,
        {
          borderColor: selected ? colors.brandPrimary : colors.borderStrong,
          backgroundColor: selected
            ? colors.brandTertiary
            : pressed
              ? colors.surfaceTertiary
              : colors.surfaceSecondary,
        },
      ]}
    >
      <View style={styles.pickerHead}>
        <Text style={styles.pickerTitle}>{title}</Text>
        {onDelete && (
          <Pressable
            testID={`${testID}-delete`}
            onPress={(e) => {
              e.stopPropagation?.();
              onDelete();
            }}
            hitSlop={8}
            style={styles.pickerDeleteBtn}
          >
            <Icon name="trash-can-outline" size={18} color={colors.error} />
          </Pressable>
        )}
        {selected && (
          <Icon name="check-circle" size={20} color={colors.brandPrimary} />
        )}
      </View>
      <Text style={styles.pickerTagline}>{tagline}</Text>
      <Text style={styles.pickerLore}>{lore}</Text>
      <View style={styles.traitRow}>
        {high.map((t, i) => (
          <View
            key={`h${i}`}
            style={[styles.traitChip, { borderColor: colors.success, backgroundColor: colors.surface }]}
          >
            <Icon name="arrow-up-bold" size={11} color={colors.success} />
            <Text style={[styles.traitText, { color: colors.success }]}>
              {traitLabel(t)}
            </Text>
          </View>
        ))}
        {low.map((t, i) => (
          <View
            key={`l${i}`}
            style={[styles.traitChip, { borderColor: colors.error, backgroundColor: colors.surface }]}
          >
            <Icon name="arrow-down-bold" size={11} color={colors.error} />
            <Text style={[styles.traitText, { color: colors.error }]}>
              {traitLabel(t)}
            </Text>
          </View>
        ))}
      </View>
      {extra}
    </Pressable>
  );
}

// ---------- Roll step ----------
function RollStep({
  pool,
  onReroll,
  monster = false,
  onExportStats,
  onImportStats,
}: {
  pool: number[];
  onReroll: () => void;
  monster?: boolean;
  onExportStats: () => void;
  onImportStats: () => void;
}) {
  const { colors } = useTheme();
  const styles = getStyles(colors);
  // Simple stagger animation on mount / reroll.
  const anims = useRef(pool.map(() => new Animated.Value(0))).current;
  // Reset animations when pool changes (reroll).
  useEffect(() => {
    // Rebuild anim refs if length changed.
    while (anims.length < pool.length) anims.push(new Animated.Value(0));
    anims.forEach((a) => a.setValue(0));
    Animated.stagger(
      35,
      anims.slice(0, pool.length).map((a) =>
        Animated.timing(a, {
          toValue: 1,
          duration: 260,
          easing: Easing.out(Easing.back(1.4)),
          useNativeDriver: true,
        }),
      ),
    ).start();
  }, [pool]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <ScrollView contentContainerStyle={styles.stepBody}>
      <Text style={styles.stepHeading}>{monster ? "Roll the enemy's stats" : "The bones are cast"}</Text>
      <Text style={styles.stepSubHeading}>
        {monster
          ? "Five d20s rolled (clamped to 6–18). Assign them to Strength, Dexterity, Melee, Ranged, and Special Ability."
          : "20 dice rolled (each d20, clamped to 6–18). Remember: LOWER is better in Assault of Bronze."}
      </Text>
      <View style={styles.rollGrid}>
        {pool.map((n, i) => (
          <Animated.View
            key={i}
            style={[
              styles.rollDie,
              {
                borderColor: colors.borderStrong,
                backgroundColor: colors.surfaceSecondary,
                opacity: anims[i] ?? 1,
                transform: [
                  {
                    scale: (anims[i] ?? new Animated.Value(1)).interpolate({
                      inputRange: [0, 1],
                      outputRange: [0.3, 1],
                    }),
                  },
                ],
              },
            ]}
          >
            <Text style={styles.rollDieText}>{n}</Text>
          </Animated.View>
        ))}
      </View>
      <Pressable
        testID="reroll-btn"
        onPress={onReroll}
        style={({ pressed }) => [
          styles.rerollBtn,
          {
            borderColor: colors.borderStrong,
            backgroundColor: pressed ? colors.brandSecondary : colors.surfaceSecondary,
          },
        ]}
      >
        <Icon name="dice-multiple" size={16} color={colors.onSurface} />
        <Text style={styles.rerollText}>Reroll all</Text>
      </Pressable>
      <View style={styles.assignActionRow}>
        <Pressable
          testID="roll-import-stats"
          onPress={onImportStats}
          style={[styles.rerollSmall, { borderColor: colors.borderStrong, backgroundColor: colors.surfaceSecondary }]}
        >
          <Icon name="file-import-outline" size={13} color={colors.onSurface} />
          <Text style={styles.rerollSmallText}>Import Dice Pool</Text>
        </Pressable>
        <Pressable
          testID="roll-export-stats"
          onPress={onExportStats}
          disabled={pool.length === 0}
          style={[styles.rerollSmall, { borderColor: colors.borderStrong, backgroundColor: colors.surfaceSecondary, opacity: pool.length > 0 ? 1 : 0.4 }]}
        >
          <Icon name="file-export-outline" size={13} color={colors.onSurface} />
          <Text style={styles.rerollSmallText}>Export Dice Pool</Text>
        </Pressable>
      </View>
    </ScrollView>
  );
}

// ---------- Assign step ----------
function AssignStep({
  pool,
  assigned,
  selectedRollIdx,
  highSet,
  lowSet,
  onPickRoll,
  onPickSlot,
  onReroll,
  onAutoFill,
}: {
  pool: number[];
  assigned: Record<string, number>;
  selectedRollIdx: number | null;
  highSet: Set<string>;
  lowSet: Set<string>;
  onPickRoll: (i: number) => void;
  onPickSlot: (s: SlotRef) => void;
  onReroll: () => void;
  onAutoFill: () => void;
}) {
  const { colors } = useTheme();
  const styles = getStyles(colors);
  const remaining = pool.filter((v) => v !== 0).length;

  return (
    <ScrollView
      contentContainerStyle={styles.stepBody}
      keyboardShouldPersistTaps="handled"
    >
      <Text style={styles.stepHeading}>Assign your fate</Text>
      <Text style={styles.stepSubHeading}>
        Tap a die, then tap a slot. Green slots want LOW numbers, red slots want HIGH numbers. Tap a filled slot to return it to the pool.
      </Text>

      <View style={styles.assignPoolCard}>
        <View style={styles.assignPoolHead}>
          <Text style={styles.assignPoolLabel}>DICE POOL</Text>
          <Text style={styles.assignPoolCount}>
            {remaining} / 20 left
          </Text>
        </View>
        <View style={styles.assignPoolGrid}>
          {pool.map((n, i) => {
            const isSel = i === selectedRollIdx;
            const consumed = n === 0;
            return (
              <Pressable
                key={i}
                testID={`roll-${i}`}
                onPress={() => onPickRoll(i)}
                disabled={consumed}
                style={({ pressed }) => [
                  styles.poolDie,
                  {
                    borderColor: isSel ? colors.brandPrimary : colors.borderStrong,
                    borderWidth: isSel ? 3 : 2,
                    backgroundColor: consumed
                      ? colors.surfaceTertiary
                      : isSel
                        ? colors.brandPrimary
                        : pressed
                          ? colors.brandTertiary
                          : colors.surface,
                    opacity: consumed ? 0.35 : 1,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.poolDieText,
                    {
                      color: isSel
                        ? colors.onBrandPrimary
                        : consumed
                          ? colors.muted
                          : colors.onSurface,
                    },
                  ]}
                >
                  {consumed ? "—" : n}
                </Text>
              </Pressable>
            );
          })}
        </View>
        <View style={styles.assignActionRow}>
          <Pressable
            testID="assign-autofill"
            onPress={onAutoFill}
            style={({ pressed }) => [
              styles.autoFillBtn,
              {
                borderColor: colors.brandPrimary,
                backgroundColor: pressed ? colors.brandSecondary : colors.brandPrimary,
              },
            ]}
          >
            <Icon name="auto-fix" size={13} color={colors.onBrandPrimary} />
            <Text style={[styles.autoFillText, { color: colors.onBrandPrimary }]}>
              Auto-fill
            </Text>
          </Pressable>
          <Pressable
            testID="assign-reroll"
            onPress={onReroll}
            style={({ pressed }) => [
              styles.rerollSmall,
              {
                borderColor: colors.borderStrong,
                backgroundColor: pressed ? colors.brandTertiary : colors.surfaceSecondary,
              },
            ]}
          >
            <Icon name="restart" size={13} color={colors.onSurface} />
            <Text style={styles.rerollSmallText}>Reroll &amp; reset</Text>
          </Pressable>
        </View>
      </View>

      {STATS_ORDER.map((sk) => (
        <View key={sk} style={styles.statSection}>
          <Text style={styles.statSectionTitle}>{STAT_TITLES[sk]}</Text>
          <View style={styles.statGrid}>
            {(() => {
              const main = { statKey: sk, subIndex: null } as const;
              const traitK = traitKey(main);
              const tint = highSet.has(traitK)
                ? ("high" as const)
                : lowSet.has(traitK)
                  ? ("low" as const)
                  : ("none" as const);
              return (
                <SlotChip
                  testID={`slot-${sk}-main`}
                  label="MAIN"
                  value={assigned[slotKey(main)]}
                  tint={tint}
                  onPress={() => onPickSlot(main)}
                  armed={selectedRollIdx != null}
                />
              );
            })()}
            {SUB_NAMES[sk].map((sub, i) => {
              const key = slotKey({ statKey: sk, subIndex: i });
              const traitK = `${sk}.${i}`;
              const tint = highSet.has(traitK)
                ? ("high" as const)
                : lowSet.has(traitK)
                  ? ("low" as const)
                  : ("none" as const);
              return (
                <SlotChip
                  key={i}
                  testID={`slot-${sk}-${i}`}
                  label={sub}
                  value={assigned[key]}
                  tint={tint}
                  onPress={() => onPickSlot({ statKey: sk, subIndex: i })}
                  armed={selectedRollIdx != null}
                />
              );
            })}
          </View>
        </View>
      ))}
    </ScrollView>
  );
}

function MonsterAssignStep({
  pool,
  assigned,
  selectedRollIdx,
  highSet,
  lowSet,
  onPickRoll,
  onPickSlot,
  onReroll,
  onAutoFill,
}: {
  pool: number[];
  assigned: Record<string, number>;
  selectedRollIdx: number | null;
  highSet: Set<string>;
  lowSet: Set<string>;
  onPickRoll: (i: number) => void;
  onPickSlot: (s: SlotRef) => void;
  onReroll: () => void;
  onAutoFill: () => void;
}) {
  const { colors } = useTheme();
  const styles = getStyles(colors);
  const remaining = pool.filter((v) => v !== 0).length;
  const labels = ["STRENGTH", "DEXTERITY", "MELEE ATTACK", "RANGED ATTACK", "SPECIAL ABILITY"];

  return (
    <ScrollView contentContainerStyle={styles.stepBody} keyboardShouldPersistTaps="handled">
      <Text style={styles.stepHeading}>Assign enemy stats</Text>
      <Text style={styles.stepSubHeading}>
        Tap a die, then tap a stat. Lower numbers are stronger in this system. Auto-fill assigns only the remaining stats.
      </Text>
      <View style={styles.assignPoolCard}>
        <View style={styles.assignPoolHead}>
          <Text style={styles.assignPoolLabel}>DICE POOL</Text>
          <Text style={styles.assignPoolCount}>{remaining} / 5 left</Text>
        </View>
        <View style={styles.assignPoolGrid}>
          {pool.map((n, i) => {
            const isSel = i === selectedRollIdx;
            const consumed = n === 0;
            return (
              <Pressable
                key={i}
                testID={`monster-roll-${i}`}
                onPress={() => onPickRoll(i)}
                disabled={consumed}
                style={({ pressed }) => [
                  styles.poolDie,
                  {
                    borderColor: isSel ? colors.brandPrimary : colors.borderStrong,
                    borderWidth: isSel ? 3 : 2,
                    backgroundColor: consumed ? colors.surfaceTertiary : isSel ? colors.brandPrimary : pressed ? colors.brandTertiary : colors.surface,
                    opacity: consumed ? 0.35 : 1,
                  },
                ]}
              >
                <Text style={[styles.poolDieText, { color: isSel ? colors.onBrandPrimary : consumed ? colors.muted : colors.onSurface }]}>
                  {consumed ? "—" : n}
                </Text>
              </Pressable>
            );
          })}
        </View>
        <View style={styles.assignActionRow}>
          <Pressable testID="monster-assign-autofill" onPress={onAutoFill} style={[styles.autoFillBtn, { borderColor: colors.brandPrimary, backgroundColor: colors.brandPrimary }]}>
            <Icon name="auto-fix" size={13} color={colors.onBrandPrimary} />
            <Text style={[styles.autoFillText, { color: colors.onBrandPrimary }]}>Auto-fill</Text>
          </Pressable>
          <Pressable testID="monster-assign-reroll" onPress={onReroll} style={[styles.rerollSmall, { borderColor: colors.borderStrong, backgroundColor: colors.surfaceSecondary }]}>
            <Icon name="restart" size={13} color={colors.onSurface} />
            <Text style={styles.rerollSmallText}>Reroll &amp; reset</Text>
          </Pressable>
        </View>
      </View>
      <View style={styles.statGrid}>
        {MONSTER_SLOTS.map((slot, i) => {
          const traitK = traitKey(slot);
          const tint = highSet.has(traitK) ? ("high" as const) : lowSet.has(traitK) ? ("low" as const) : ("none" as const);
          return (
            <SlotChip
              key={slotKey(slot)}
              testID={`monster-slot-${i}`}
              label={labels[i]}
              value={assigned[slotKey(slot)]}
              tint={tint}
              onPress={() => onPickSlot(slot)}
              armed={selectedRollIdx != null}
            />
          );
        })}
      </View>
    </ScrollView>
  );
}

function SlotChip({
  label,
  value,
  tint,
  onPress,
  armed,
  testID,
}: {
  label: string;
  value?: number;
  tint: "high" | "low" | "none";
  onPress: () => void;
  armed: boolean;
  testID?: string;
}) {
  const { colors } = useTheme();
  const border =
    tint === "high"
      ? colors.success
      : tint === "low"
        ? colors.error
        : colors.borderStrong;
  const bg = value != null ? colors.brandTertiary : colors.surface;
  const styles = getStyles(colors);
  return (
    <Pressable
      testID={testID}
      onPress={onPress}
      style={({ pressed }) => [
        styles.slot,
        {
          borderColor: border,
          borderWidth: tint === "none" ? 2 : 3,
          backgroundColor: pressed ? colors.brandTertiary : bg,
          shadowColor: armed && value == null ? colors.brandPrimary : "transparent",
        },
      ]}
    >
      <Text
        numberOfLines={1}
        style={[
          styles.slotLabel,
          {
            color:
              tint === "high"
                ? colors.success
                : tint === "low"
                  ? colors.error
                  : colors.muted,
          },
        ]}
      >
        {label}
      </Text>
      <Text style={styles.slotValue}>{value ?? "—"}</Text>
    </Pressable>
  );
}

// ---------- Abilities step ----------
type AbilityWizardKey = "oncePerTurn" | "oncePerRest" | "heroAbilities";

function AbilitySelectRow({
  icon,
  label,
  hint,
  selectedName,
  selectedDescription,
  onPress,
  onRandomize,
  testID,
}: {
  icon: string;
  label: string;
  hint: string;
  selectedName?: string;
  selectedDescription?: string;
  onPress: () => void;
  onRandomize: () => void;
  testID: string;
}) {
  const { colors } = useTheme();
  const styles = getStyles(colors);
  return (
    <View style={[styles.abilitySelectRow, { borderColor: colors.borderStrong, backgroundColor: colors.surface }]}>
      <Pressable
        testID={testID}
        onPress={onPress}
        style={({ pressed }) => [styles.abilitySelectMain, { backgroundColor: pressed ? colors.brandTertiary : colors.surface }]}
      >
        <Icon name={icon as any} size={22} color={colors.brandPrimary} />
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={[styles.finalLabel, { marginBottom: 2 }]}>{label}</Text>
          <Text
            numberOfLines={1}
            style={[
              styles.abilitySelectValue,
              { color: selectedName ? colors.onSurface : colors.muted, fontFamily: fonts.display },
            ]}
          >
            {selectedName ?? hint}
          </Text>
          {selectedDescription ? (
            <Text numberOfLines={2} style={[styles.abilitySelectDescription, { color: colors.muted }]}>
              {selectedDescription}
            </Text>
          ) : null}
        </View>
        <Icon name="chevron-right" size={20} color={colors.muted} />
      </Pressable>
      <Pressable
        testID={`${testID}-randomize`}
        onPress={onRandomize}
        accessibilityLabel={`Randomize ${label.toLowerCase()}`}
        style={({ pressed }) => [
          styles.abilityRandomize,
          { borderColor: colors.borderStrong, backgroundColor: pressed ? colors.brandTertiary : colors.surfaceSecondary },
        ]}
      >
        <Icon name="dice-d20" size={20} color={colors.brandPrimary} />
      </Pressable>
    </View>
  );
}

function AbilitiesStep({
  options,
  categoryOrder,
  oncePerTurnAbility,
  onSelectOncePerTurn,
  oncePerRestAbility,
  onSelectOncePerRest,
  heroAbility,
  onSelectHeroAbility,
  stats,
}: {
  options: AbilityPreset[];
  categoryOrder: string[];
  oncePerTurnAbility: Ability | null;
  onSelectOncePerTurn: (a: Ability | null) => void;
  oncePerRestAbility: Ability | null;
  onSelectOncePerRest: (a: Ability | null) => void;
  heroAbility: Ability | null;
  onSelectHeroAbility: (a: Ability | null) => void;
  stats: StatBlock[];
}) {
  const { colors } = useTheme();
  const styles = getStyles(colors);
  const keyboardSpace = useKeyboardBottomSpace(240);
  const [pickerFor, setPickerFor] = useState<AbilityWizardKey | null>(null);

  const presetToAbility = (preset: AbilityPreset): Ability => ({
    id: genId(),
    title: preset.name,
    description: preset.description,
    linkedStat: preset.linkedStat,
    effectRoll: preset.effectRoll ?? "",
    effectType: preset.effectType,
    used: false,
  });

  const applySelection = (ability: Ability) => {
    if (pickerFor === "oncePerTurn") onSelectOncePerTurn(ability);
    if (pickerFor === "oncePerRest") onSelectOncePerRest(ability);
    if (pickerFor === "heroAbilities") onSelectHeroAbility(ability);
    setPickerFor(null);
  };

  const optionsFor = (key: AbilityWizardKey) => options.filter((a) => {
    if (key === "heroAbilities") return a.category === "Hero Abilities";
    if (key === "oncePerRest") return a.category === "Once Per Rest";
    return a.category === "Starter Spells" || a.category === "Class Specials";
  });

  const randomize = (key: AbilityWizardKey) => {
    const available = optionsFor(key);
    const preset = available[Math.floor(Math.random() * available.length)];
    if (!preset) return;
    const ability = presetToAbility(preset);
    if (key === "oncePerTurn") onSelectOncePerTurn(ability);
    if (key === "oncePerRest") onSelectOncePerRest(ability);
    if (key === "heroAbilities") onSelectHeroAbility(ability);
  };

  const filteredPresets = pickerFor ? optionsFor(pickerFor) : [];

  return (
    <ScrollView
      contentContainerStyle={[styles.stepBody, { paddingBottom: 32 + keyboardSpace }]}
      keyboardShouldPersistTaps="handled"
    >
      <Text style={styles.stepHeading}>Set your abilities</Text>
      <Text style={[styles.stepSubHeading, { marginBottom: 16 }]}>
        Tap each slot to choose one ability from the library. All three are required to continue.
      </Text>
      <View style={{ gap: 12 }}>
        <AbilitySelectRow
          testID="create-hero-once-per-turn"
          icon="refresh"
          label="ONCE PER TURN"
          hint="Tap to choose"
          selectedName={oncePerTurnAbility?.title}
          selectedDescription={oncePerTurnAbility?.description}
          onPress={() => setPickerFor("oncePerTurn")}
          onRandomize={() => randomize("oncePerTurn")}
        />
        <AbilitySelectRow
          testID="create-hero-once-per-rest"
          icon="campfire"
          label="ONCE PER REST"
          hint="Tap to choose"
          selectedName={oncePerRestAbility?.title}
          selectedDescription={oncePerRestAbility?.description}
          onPress={() => setPickerFor("oncePerRest")}
          onRandomize={() => randomize("oncePerRest")}
        />
        <AbilitySelectRow
          testID="create-hero-hero-ability"
          icon="star-four-points"
          label="HERO ABILITY"
          hint="Tap to choose"
          selectedName={heroAbility?.title}
          selectedDescription={heroAbility?.description}
          onPress={() => setPickerFor("heroAbilities")}
          onRandomize={() => randomize("heroAbilities")}
        />
      </View>

      {oncePerTurnAbility && (
        <AbilityCard
          ability={oncePerTurnAbility}
          stats={stats}
          onChange={onSelectOncePerTurn}
          onDelete={() => onSelectOncePerTurn(null)}
          onUse={() => undefined}
          onExport={() => undefined}
          testID="create-hero-once-per-turn-editor"
        />
      )}
      {oncePerRestAbility && (
        <AbilityCard
          ability={oncePerRestAbility}
          stats={stats}
          onChange={onSelectOncePerRest}
          onDelete={() => onSelectOncePerRest(null)}
          onUse={() => undefined}
          onExport={() => undefined}
          testID="create-hero-once-per-rest-editor"
        />
      )}
      {heroAbility && (
        <AbilityCard
          ability={heroAbility}
          stats={stats}
          onChange={onSelectHeroAbility}
          onDelete={() => onSelectHeroAbility(null)}
          onUse={() => undefined}
          onExport={() => undefined}
          testID="create-hero-hero-ability-editor"
        />
      )}

      <PickerSheet
        visible={pickerFor != null}
        testIDPrefix="create-hero-ability-picker"
        title={
          pickerFor === "heroAbilities"
            ? "Hero Ability Library"
            : pickerFor === "oncePerRest"
              ? "Once Per Rest Library"
              : "Once Per Turn Library"
        }
        subtitle={
          pickerFor === "oncePerRest"
            ? "Big moves — 1d10 minimum. Fires once, refreshed on Long Rest."
            : pickerFor === "heroAbilities"
              ? "Legendary feats — d20 dice, spend a Hero Point to trigger."
              : "Cantrip-tier spells and class signatures — safe to reuse each turn."
        }
        customLabel="Create custom ability"
        presets={filteredPresets.map((a) => ({
          id: a.id,
          name: a.name,
          category: a.category,
          meta: a.effectRoll,
          notes: a.tag ? `${a.tag} · ${a.description}` : a.description,
          icon: a.effectType === "healing" ? "heart-plus" : a.effectType === "damage" ? "sword-cross" : "sparkles",
        }))}
        categoryOrder={categoryOrder}
        onClose={() => setPickerFor(null)}
        onSelect={(entry) => {
          const preset = options.find((a) => a.id === entry.id);
          if (preset) applySelection(presetToAbility(preset));
        }}
        onCustom={() => applySelection(createEmptyAbility())}
      />
    </ScrollView>
  );
}

// ---------- Finalize step ----------
function FinalizeStep({
  race,
  charClass,
  name,
  setName,
}: {
  race: Race;
  charClass: CharClass;
  name: string;
  setName: (v: string) => void;
}) {
  const { colors } = useTheme();
  const styles = getStyles(colors);
  const keyboardSpace = useKeyboardBottomSpace(240);
  const placeholder = `${race.name.split(" / ")[0]} ${charClass.name}`;
  return (
    <ScrollView
      contentContainerStyle={[styles.stepBody, { paddingBottom: 32 + keyboardSpace }]}
      keyboardShouldPersistTaps="handled"
    >
      <Text style={styles.stepHeading}>Name your hero</Text>
      <Text style={styles.stepSubHeading}>
        Nearly done. One last mark on the ledger.
      </Text>
      <View style={styles.finalCard}>
        <Text style={styles.finalLabel}>NAME</Text>
        <TextInput
          testID="hero-name-input"
          value={name}
          onChangeText={setName}
          placeholder={placeholder}
          placeholderTextColor={colors.muted}
          style={styles.nameInput}
        />
        <View style={styles.finalSummary}>
          <SummaryRow icon="account-star" label="Race" value={race.name} />
          <SummaryRow icon="shield-sword" label="Class" value={charClass.name} />
          <SummaryRow icon="heart" label="HP" value={`${HP_MAX} / ${HP_MAX}`} />
          <SummaryRow icon="shield" label="Armour" value={String(charClass.baseArmour)} />
          <SummaryRow
            icon="sword"
            label="Starting Weapons"
            value={charClass.weapons.map((w) => `${w.name} (${w.damageRoll})`).join(", ")}
          />
        </View>
      </View>
    </ScrollView>
  );
}

function MonsterFinalizeStep({
  monsterType,
  name,
  setName,
}: {
  monsterType: MonsterType;
  name: string;
  setName: (v: string) => void;
}) {
  const { colors } = useTheme();
  const styles = getStyles(colors);
  const keyboardSpace = useKeyboardBottomSpace(240);
  return (
    <ScrollView
      contentContainerStyle={[styles.stepBody, { paddingBottom: 32 + keyboardSpace }]}
      keyboardShouldPersistTaps="handled"
    >
      <Text style={styles.stepHeading}>Name your enemy</Text>
      <Text style={styles.stepSubHeading}>Choose a name for the encounter. You can edit every field after forging.</Text>
      <View style={styles.finalCard}>
        <Text style={styles.finalLabel}>NAME</Text>
        <TextInput
          testID="monster-name-input"
          value={name}
          onChangeText={setName}
          placeholder={monsterType.name}
          placeholderTextColor={colors.muted}
          style={styles.nameInput}
        />
        <View style={styles.finalSummary}>
          <SummaryRow icon="spider" label="Type" value={monsterType.name} />
          <SummaryRow icon="heart" label="Health" value={String(monsterType.health)} />
          <SummaryRow icon="sword" label="Attack" value={`${monsterType.attackName ? `${monsterType.attackName} · ` : ""}${monsterType.attackRoll} damage`} />
          {monsterType.specialAbility && <SummaryRow icon="creation" label="Special" value={monsterType.specialAbility} />}
          {monsterType.oncePerRest && <SummaryRow icon="timer-sand" label="Once Per Rest" value={monsterType.oncePerRest} />}
        </View>
      </View>
    </ScrollView>
  );
}

function SummaryRow({
  icon,
  label,
  value,
}: {
  icon: string;
  label: string;
  value: string;
}) {
  const { colors } = useTheme();
  const styles = getStyles(colors);
  return (
    <View style={styles.summaryRow}>
      <Icon name={icon as any} size={16} color={colors.brandPrimary} />
      <Text style={styles.summaryLabel}>{label}</Text>
      <Text style={styles.summaryValue} numberOfLines={2}>
        {value}
      </Text>
    </View>
  );
}

// ---------- Styles ----------
const getStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.surface },
    header: {
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: 12,
      paddingVertical: 10,
      borderBottomWidth: 3,
      borderBottomColor: colors.borderStrong,
      backgroundColor: colors.surfaceSecondary,
    },
    iconBtn: {
      width: 36,
      height: 36,
      borderWidth: 2,
      borderColor: colors.borderStrong,
      alignItems: "center",
      justifyContent: "center",
    },
    headerTitle: {
      flex: 1,
      textAlign: "center",
      fontSize: 20,
      color: colors.onSurface,
      fontFamily: fonts.displayBold,
      letterSpacing: 2,
    },
    stepBar: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: 12,
      paddingVertical: 10,
      borderBottomWidth: 2,
      borderBottomColor: colors.divider,
      backgroundColor: colors.surface,
      gap: 4,
    },
    stepPill: { alignItems: "center", flex: 1, gap: 4 },
    stepDot: {
      width: 26,
      height: 26,
      borderWidth: 2,
      alignItems: "center",
      justifyContent: "center",
    },
    stepDotText: { fontSize: 12, fontFamily: fonts.displayBold },
    stepLabel: { fontSize: 11, letterSpacing: 1 },
    stepBody: { padding: 16, paddingBottom: 32, gap: 14 },
    modeBody: { padding: 16, paddingBottom: 48, gap: 14 },
    modeCard: {
      borderWidth: 2.5,
      padding: 18,
      gap: 8,
    },
    modeIconWrap: {
      width: 52,
      height: 52,
      borderWidth: 2,
      borderColor: colors.borderStrong,
      backgroundColor: colors.surface,
      alignItems: "center",
      justifyContent: "center",
    },
    modeTitle: {
      fontSize: 22,
      color: colors.onSurface,
      fontFamily: fonts.displayBold,
      letterSpacing: 1.5,
      marginTop: 4,
    },
    modeSub: {
      fontSize: 13,
      color: colors.onSurface,
      fontFamily: fonts.display,
      lineHeight: 18,
    },
    modeMetaRow: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 4 },
    modeMetaChip: {
      flexDirection: "row",
      alignItems: "center",
      gap: 3,
      borderWidth: 1.5,
      borderColor: colors.borderStrong,
      backgroundColor: colors.surface,
      paddingHorizontal: 6,
      paddingVertical: 3,
    },
    modeMetaText: {
      fontSize: 11,
      color: colors.onSurface,
      fontFamily: fonts.displayBold,
      letterSpacing: 0.5,
    },
    modeCta: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 6,
      paddingVertical: 12,
      marginTop: 8,
    },
    modeCtaText: {
      fontSize: 14,
      fontFamily: fonts.displayBold,
      letterSpacing: 1,
    },
    stepHeading: {
      fontSize: 22,
      color: colors.onSurface,
      fontFamily: fonts.displayBold,
      letterSpacing: 1.5,
    },
    stepSubHeading: {
      fontSize: 13,
      color: colors.muted,
      fontFamily: fonts.display,
      lineHeight: 18,
    },
    sectionLabel: {
      fontSize: 12,
      color: colors.muted,
      fontFamily: fonts.displayBold,
      letterSpacing: 1.2,
      marginTop: 4,
    },

    // Picker card
    pickerCard: {
      borderWidth: 2.5,
      padding: 14,
      gap: 6,
    },
    pickerHead: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: 8,
    },
    pickerTitle: {
      flex: 1,
      minWidth: 0,
      fontSize: 18,
      color: colors.onSurface,
      fontFamily: fonts.displayBold,
      letterSpacing: 1,
    },
    pickerDeleteBtn: {
      padding: 2,
    },
    pickerTagline: {
      fontSize: 13,
      color: colors.brandPrimary,
      fontFamily: fonts.displayBold,
      fontStyle: "italic",
    },
    pickerLore: {
      fontSize: 13,
      color: colors.onSurface,
      fontFamily: fonts.display,
      lineHeight: 18,
    },
    traitRow: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 4 },
    traitChip: {
      flexDirection: "row",
      alignItems: "center",
      gap: 3,
      borderWidth: 1.5,
      paddingHorizontal: 6,
      paddingVertical: 3,
    },
    traitText: { fontSize: 11, fontFamily: fonts.displayBold, letterSpacing: 0.5 },
    classExtras: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 6 },
    classExtraChip: {
      flexDirection: "row",
      alignItems: "center",
      gap: 3,
      borderWidth: 1.5,
      borderColor: colors.borderStrong,
      backgroundColor: colors.surface,
      paddingHorizontal: 6,
      paddingVertical: 3,
    },
    classExtraText: {
      fontSize: 11,
      color: colors.onSurface,
      fontFamily: fonts.displayBold,
      letterSpacing: 0.5,
    },

    // Roll step
    rollGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginTop: 8 },
    rollDie: {
      width: 60,
      height: 60,
      borderWidth: 2.5,
      alignItems: "center",
      justifyContent: "center",
    },
    rollDieText: {
      fontSize: 22,
      color: colors.onSurface,
      fontFamily: fonts.displayBold,
    },
    rerollBtn: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 6,
      borderWidth: 2,
      paddingVertical: 12,
      marginTop: 12,
    },
    rerollText: {
      fontSize: 14,
      color: colors.onSurface,
      fontFamily: fonts.displayBold,
      letterSpacing: 1,
    },

    // Assign step
    assignPoolCard: {
      borderWidth: 2,
      borderColor: colors.borderStrong,
      backgroundColor: colors.surfaceSecondary,
      padding: 10,
      gap: 8,
    },
    assignPoolHead: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
    },
    assignPoolLabel: {
      fontSize: 12,
      color: colors.onSurface,
      fontFamily: fonts.displayBold,
      letterSpacing: 1.5,
    },
    assignPoolCount: {
      fontSize: 12,
      color: colors.muted,
      fontFamily: fonts.displayBold,
    },
    assignPoolGrid: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 6,
      justifyContent: "center",
    },
    poolDie: {
      width: 44,
      height: 44,
      alignItems: "center",
      justifyContent: "center",
    },
    poolDieText: {
      fontSize: 17,
      fontFamily: fonts.displayBold,
    },
    rerollSmall: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 4,
      borderWidth: 1.5,
      paddingVertical: 6,
      paddingHorizontal: 10,
    },
    rerollSmallText: {
      fontSize: 11,
      color: colors.onSurface,
      fontFamily: fonts.displayBold,
      letterSpacing: 0.8,
    },
    assignActionRow: {
      flexDirection: "row",
      gap: 6,
      justifyContent: "center",
      marginTop: 2,
    },
    autoFillBtn: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 4,
      borderWidth: 1.5,
      paddingVertical: 6,
      paddingHorizontal: 10,
    },
    autoFillText: {
      fontSize: 11,
      fontFamily: fonts.displayBold,
      letterSpacing: 0.8,
    },

    statSection: { gap: 8 },
    statSectionTitle: {
      fontSize: 14,
      color: colors.onSurface,
      fontFamily: fonts.displayBold,
      letterSpacing: 2,
      borderBottomWidth: 2,
      borderBottomColor: colors.divider,
      paddingBottom: 4,
    },
    statGrid: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
    slot: {
      minWidth: 96,
      flexBasis: "31%",
      flexGrow: 1,
      paddingVertical: 8,
      paddingHorizontal: 6,
      alignItems: "center",
      justifyContent: "center",
      minHeight: 60,
    },
    slotLabel: {
      fontSize: 10,
      fontFamily: fonts.displayBold,
      letterSpacing: 0.8,
      marginBottom: 2,
      textAlign: "center",
    },
    slotValue: {
      fontSize: 22,
      color: colors.onSurface,
      fontFamily: fonts.displayBold,
    },

    // Finalize
    finalCard: {
      borderWidth: 2.5,
      borderColor: colors.borderStrong,
      backgroundColor: colors.surfaceSecondary,
      padding: 14,
      gap: 12,
    },
    finalLabel: {
      fontSize: 12,
      color: colors.muted,
      fontFamily: fonts.displayBold,
      letterSpacing: 1.5,
    },
    abilitySelectRow: {
      flexDirection: "row",
      alignItems: "center",
      borderWidth: 2,
      minWidth: 0,
    },
    abilitySelectMain: {
      flex: 1,
      minWidth: 0,
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
      padding: 14,
    },
    abilityRandomize: {
      width: 48,
      height: 48,
      marginRight: 8,
      borderWidth: 1.5,
      alignItems: "center",
      justifyContent: "center",
    },
    abilitySelectValue: {
      fontSize: 14,
    },
    abilitySelectDescription: {
      fontSize: 12,
      lineHeight: 16,
      marginTop: 2,
      fontFamily: fonts.body,
    },
    nameInput: {
      borderWidth: 2,
      borderColor: colors.borderStrong,
      backgroundColor: colors.surface,
      padding: 12,
      fontSize: 18,
      color: colors.onSurface,
      fontFamily: fonts.displayBold,
    },
    finalSummary: { gap: 8, marginTop: 4 },
    summaryRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
    },
    summaryLabel: {
      fontSize: 12,
      color: colors.muted,
      fontFamily: fonts.displayBold,
      letterSpacing: 1,
      width: 70,
    },
    summaryValue: {
      flex: 1,
      fontSize: 14,
      color: colors.onSurface,
      fontFamily: fonts.display,
    },

    // Footer
    footer: {
      flexDirection: "row",
      gap: 10,
      paddingHorizontal: 16,
      paddingTop: 10,
      borderTopWidth: 3,
      borderTopColor: colors.borderStrong,
      backgroundColor: colors.surfaceSecondary,
    },
    footerBtn: {
      flex: 1,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 6,
      borderWidth: 2.5,
      paddingVertical: 12,
    },
    footerBack: { flex: 0.7 },
    footerBtnText: {
      fontSize: 14,
      fontFamily: fonts.displayBold,
      letterSpacing: 1,
    },
  });
