import { AgeId } from "@/src/ages";
import { ABILITY_CATEGORY_ORDER, ABILITY_PRESETS } from "@/src/data/abilities";
import { ITEM_CATEGORY_ORDER, ITEM_PRESETS } from "@/src/data/items";
import { WEAPON_PRESETS } from "@/src/data/weapons";
import {
  AGE_OF_WAR_ABILITIES,
  AGE_OF_WAR_ITEMS,
  AGE_OF_WAR_STANDARD_MELEE,
  AGE_OF_WAR_WEAPON_OF_KHALIIK,
  AGE_OF_WAR_WEAPONS,
} from "@/src/data/ageOfWar";

export type AgeCatalog = {
  abilities: typeof ABILITY_PRESETS;
  abilityCategoryOrder: typeof ABILITY_CATEGORY_ORDER;
  items: typeof ITEM_PRESETS;
  itemCategoryOrder: typeof ITEM_CATEGORY_ORDER;
  weapons: typeof WEAPON_PRESETS;
};

const AGE_CATALOGS: Record<AgeId, AgeCatalog> = {
  // The existing library is the canonical Age of Magic content.
  "age-of-magic": {
    abilities: ABILITY_PRESETS,
    abilityCategoryOrder: ABILITY_CATEGORY_ORDER,
    items: ITEM_PRESETS,
    itemCategoryOrder: ITEM_CATEGORY_ORDER,
    weapons: WEAPON_PRESETS,
  },
  // Kept as a separate catalog boundary so Age of War content can evolve independently.
  "age-of-war": {
    abilities: AGE_OF_WAR_ABILITIES,
    abilityCategoryOrder: ABILITY_CATEGORY_ORDER,
    items: AGE_OF_WAR_ITEMS,
    itemCategoryOrder: ITEM_CATEGORY_ORDER,
    weapons: [...AGE_OF_WAR_STANDARD_MELEE, ...AGE_OF_WAR_WEAPONS, AGE_OF_WAR_WEAPON_OF_KHALIIK],
  },
};

export function getAgeCatalog(age: AgeId): AgeCatalog {
  return AGE_CATALOGS[age];
}
