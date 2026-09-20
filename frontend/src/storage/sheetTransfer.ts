import { Platform, Share } from "react-native";
import {
  Ability,
  Character,
  InventoryItem,
  Weapon,
  migrateCharacter,
  genId,
} from "@/src/types";
import { AgeId, DEFAULT_AGE_ID } from "@/src/ages";
import { CustomPreset } from "@/src/storage/customPresets";

export type StatRollPreset = {
  id: string;
  name: string;
  kind: "hero" | "monster";
  pool: number[];
};

export type ExportPayload = {
  schema: "aob-sheet-v1";
  exportedAt: string;
  app: "Assault of Bronze";
  version: "1.0.0";
  type: "single" | "bundle";
  age: AgeId;
  character?: Character;
  characters?: Character[];
};

export type ExportEntityType = "ability" | "weapon" | "item" | "customPreset" | "statRoll";
export type ExportEntity = Ability | Weapon | InventoryItem | CustomPreset | StatRollPreset;

export type EntityExportPayload = {
  schema: "aob-entity-v1";
  exportedAt: string;
  app: "Assault of Bronze";
  version: "1.0.0";
  entityType: ExportEntityType;
  age: AgeId;
  entity: ExportEntity;
};

export function createCharacterExportJson(char: Character): string {
  const payload: ExportPayload = {
    schema: "aob-sheet-v1",
    exportedAt: new Date().toISOString(),
    app: "Assault of Bronze",
    version: "1.0.0",
    type: "single",
    age: char.age ?? DEFAULT_AGE_ID,
    character: char,
  };
  return JSON.stringify(payload, null, 2);
}

export function createAllCharactersExportJson(chars: Character[]): string {
  const payload: ExportPayload = {
    schema: "aob-sheet-v1",
    exportedAt: new Date().toISOString(),
    app: "Assault of Bronze",
    version: "1.0.0",
    type: "bundle",
    age: chars[0]?.age ?? DEFAULT_AGE_ID,
    characters: chars,
  };
  return JSON.stringify(payload, null, 2);
}

export function createEntityExportJson(entityType: ExportEntityType, entity: ExportEntity, age: AgeId = DEFAULT_AGE_ID): string {
  const payload: EntityExportPayload = {
    schema: "aob-entity-v1",
    exportedAt: new Date().toISOString(),
    app: "Assault of Bronze",
    version: "1.0.0",
    entityType,
    age,
    entity,
  };
  return JSON.stringify(payload, null, 2);
}

export type ParseImportResult = {
  success: boolean;
  characters?: Character[];
  error?: string;
};

export type ParseEntityImportResult = {
  success: boolean;
  entityType?: ExportEntityType;
  entity?: ExportEntity;
  error?: string;
};

export function parseEntityImportJson(raw: string): ParseEntityImportResult {
  if (!raw || !raw.trim()) {
    return { success: false, error: "Input is empty. Please provide valid JSON." };
  }

  try {
    const parsed = JSON.parse(raw.trim());
    const validTypes: ExportEntityType[] = ["ability", "weapon", "item", "customPreset", "statRoll"];
    if (
      parsed?.schema !== "aob-entity-v1" ||
      !validTypes.includes(parsed.entityType) ||
      !parsed.entity ||
      typeof parsed.entity !== "object"
    ) {
      return { success: false, error: "Unrecognized ability, weapon, or item export." };
    }
    return { success: true, entityType: parsed.entityType, entity: parsed.entity };
  } catch (err: any) {
    return { success: false, error: `Invalid JSON: ${err.message || "parsing failed"}` };
  }
}

export function cloneEntityWithNewId(entity: ExportEntity): ExportEntity {
  return { ...JSON.parse(JSON.stringify(entity)), id: genId() };
}

export function parseImportJson(raw: string): ParseImportResult {
  if (!raw || !raw.trim()) {
    return { success: false, error: "Input is empty. Please provide valid JSON." };
  }

  try {
    const parsed = JSON.parse(raw.trim());

    // Case 1: Standard AoB Export Bundle
    if (parsed && typeof parsed === "object" && Array.isArray(parsed.characters)) {
      const list = parsed.characters.map(migrateCharacter);
      if (list.length === 0) {
        return { success: false, error: "No characters found in the bundle." };
      }
      return { success: true, characters: list };
    }

    // Case 2: Standard AoB Export Single Character
    if (parsed && typeof parsed === "object" && parsed.character && typeof parsed.character === "object") {
      const char = migrateCharacter(parsed.character);
      return { success: true, characters: [char] };
    }

    // Case 3: Raw array of character objects
    if (Array.isArray(parsed)) {
      const list = parsed.map(migrateCharacter);
      if (list.length === 0) {
        return { success: false, error: "Array contains no characters." };
      }
      return { success: true, characters: list };
    }

    // Case 4: Raw single character object
    if (parsed && typeof parsed === "object" && (parsed.stats || parsed.name !== undefined || parsed.hp !== undefined || parsed.kind)) {
      const char = migrateCharacter(parsed);
      return { success: true, characters: [char] };
    }

    return { success: false, error: "Unrecognized character format. Please check the JSON data." };
  } catch (err: any) {
    return { success: false, error: `Invalid JSON: ${err.message || "parsing failed"}` };
  }
}

/**
 * Prepares a clean sanitized filename for exporting
 */
export function sanitizeFilename(name: string): string {
  return name.replace(/[^a-zA-Z0-9_-]/g, "_").toLowerCase() || "sheet";
}

/**
 * Triggers native share sheet or web file download for the exported JSON
 */
export async function triggerExportShare(
  filename: string,
  jsonContent: string,
  title: string
): Promise<{ success: boolean; error?: string }> {
  try {
    if (Platform.OS === "web") {
      if (typeof document !== "undefined") {
        const blob = new Blob([jsonContent], { type: "application/json;charset=utf-8;" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = filename.endsWith(".json") ? filename : `${filename}.json`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
      }
      return { success: true };
    }

    const shareTitle = title || "Assault of Bronze Character Sheet";
    const result = await Share.share(
      {
        title: shareTitle,
        message: jsonContent,
      },
      {
        dialogTitle: shareTitle,
        subject: shareTitle,
      }
    );

    if (result.action === Share.dismissedAction) {
      return { success: false, error: "Share dismissed" };
    }
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err?.message || "Export failed" };
  }
}

/**
 * Clones a character with new IDs for all sub-entities (for "Import as New")
 */
export function cloneCharacterWithNewIds(character: Character, nameSuffix?: string): Character {
  const now = new Date().toISOString();
  return {
    ...JSON.parse(JSON.stringify(character)),
    id: genId(),
    name: nameSuffix ? `${character.name || "Unnamed"} ${nameSuffix}`.trim() : character.name || "Unnamed",
    createdAt: now,
    updatedAt: now,
    oncePerTurn: (character.oncePerTurn || []).map((ability) => ({ ...ability, id: genId() })),
    oncePerRest: (character.oncePerRest || []).map((ability) => ({ ...ability, id: genId() })),
    heroAbilities: (character.heroAbilities || []).map((ability) => ({ ...ability, id: genId() })),
    inventoryItems: (character.inventoryItems || []).map((item) => ({ ...item, id: genId() })),
    customSections: (character.customSections || []).map((section) => ({ ...section, id: genId() })),
    weapons: (character.weapons || []).map((weapon) => ({ ...weapon, id: genId() })),
  };
}
