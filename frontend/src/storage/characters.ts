import AsyncStorage from "@react-native-async-storage/async-storage";
import { Character, migrateCharacter } from "@/src/types";
import { AgeId, DEFAULT_AGE_ID } from "@/src/ages";

const LEGACY_KEY = "aob:characters:v1";
const keyForAge = (age: AgeId) => `aob:characters:${age}:v1`;
let migrationPromise: Promise<void> | null = null;

async function migrateLegacyCharacters(): Promise<void> {
  if (!migrationPromise) {
    migrationPromise = (async () => {
      const legacyRaw = await AsyncStorage.getItem(LEGACY_KEY);
      if (!legacyRaw) return;
      const existingRaw = await AsyncStorage.getItem(keyForAge(DEFAULT_AGE_ID));
      if (!existingRaw) await AsyncStorage.setItem(keyForAge(DEFAULT_AGE_ID), legacyRaw);
      await AsyncStorage.removeItem(LEGACY_KEY);
    })();
  }
  await migrationPromise;
}

export async function loadAllCharacters(age: AgeId = DEFAULT_AGE_ID): Promise<Character[]> {
  try {
    await migrateLegacyCharacters();
    const raw = await AsyncStorage.getItem(keyForAge(age));
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.map(migrateCharacter);
  } catch {
    return [];
  }
}

export async function saveAllCharacters(list: Character[], age: AgeId = DEFAULT_AGE_ID): Promise<void> {
  await AsyncStorage.setItem(keyForAge(age), JSON.stringify(list));
}

export async function upsertCharacter(char: Character, age: AgeId = char.age ?? DEFAULT_AGE_ID): Promise<Character[]> {
  const list = await loadAllCharacters(age);
  const idx = list.findIndex((c) => c.id === char.id);
  const updated = { ...char, age, updatedAt: new Date().toISOString() };
  if (idx >= 0) list[idx] = updated;
  else list.unshift(updated);
  await saveAllCharacters(list, age);
  return list;
}

export async function deleteCharacter(id: string, age: AgeId = DEFAULT_AGE_ID): Promise<Character[]> {
  const list = await loadAllCharacters(age);
  const next = list.filter((c) => c.id !== id);
  await saveAllCharacters(next, age);
  return next;
}

export async function getCharacter(id: string, age: AgeId = DEFAULT_AGE_ID): Promise<Character | null> {
  const list = await loadAllCharacters(age);
  return list.find((c) => c.id === id) ?? null;
}
