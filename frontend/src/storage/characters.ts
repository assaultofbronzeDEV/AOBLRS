import AsyncStorage from "@react-native-async-storage/async-storage";
import { Character } from "@/src/types";

const KEY = "aob:characters:v1";

export async function loadAllCharacters(): Promise<Character[]> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as Character[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export async function saveAllCharacters(list: Character[]): Promise<void> {
  await AsyncStorage.setItem(KEY, JSON.stringify(list));
}

export async function upsertCharacter(char: Character): Promise<Character[]> {
  const list = await loadAllCharacters();
  const idx = list.findIndex((c) => c.id === char.id);
  const updated = { ...char, updatedAt: new Date().toISOString() };
  if (idx >= 0) list[idx] = updated;
  else list.unshift(updated);
  await saveAllCharacters(list);
  return list;
}

export async function deleteCharacter(id: string): Promise<Character[]> {
  const list = await loadAllCharacters();
  const next = list.filter((c) => c.id !== id);
  await saveAllCharacters(next);
  return next;
}

export async function getCharacter(id: string): Promise<Character | null> {
  const list = await loadAllCharacters();
  return list.find((c) => c.id === id) ?? null;
}
