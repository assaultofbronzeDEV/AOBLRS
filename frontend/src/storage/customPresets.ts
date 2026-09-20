import AsyncStorage from "@react-native-async-storage/async-storage";
import { TraitRef } from "@/src/data/lineages";
import { genId } from "@/src/types";

export type CustomPresetKind = "race" | "class" | "monsterType";

export type CustomPresetWeapon = {
  name: string;
  attackKind: "melee" | "ranged";
  damageRoll: string;
};

export type CustomPreset = {
  id: string;
  kind: CustomPresetKind;
  name: string;
  description: string;
  good: TraitRef[]; // up to 4 — natural strengths, place a LOW roll here
  bad: TraitRef[]; // up to 4 — weak spots, place a HIGH roll here
  weapon?: CustomPresetWeapon; // class: starting weapon
  maxHealth?: number; // monsterType: starting/max HP
  createdAt: string;
};

const STORAGE_KEY = "aob:customPresets:v1";

async function loadAll(): Promise<CustomPreset[]> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

async function saveAll(list: CustomPreset[]): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(list));
}

export async function loadCustomPresets(kind: CustomPresetKind): Promise<CustomPreset[]> {
  const all = await loadAll();
  return all.filter((p) => p.kind === kind);
}

export async function addCustomPreset(preset: Omit<CustomPreset, "id" | "createdAt">): Promise<CustomPreset> {
  const all = await loadAll();
  const saved: CustomPreset = { ...preset, id: genId(), createdAt: new Date().toISOString() };
  all.unshift(saved);
  await saveAll(all);
  return saved;
}

export async function importCustomPreset(preset: CustomPreset): Promise<CustomPreset> {
  const all = await loadAll();
  const saved: CustomPreset = { ...preset, id: genId(), createdAt: new Date().toISOString() };
  all.unshift(saved);
  await saveAll(all);
  return saved;
}

export async function deleteCustomPreset(id: string): Promise<void> {
  const all = await loadAll();
  await saveAll(all.filter((p) => p.id !== id));
}
