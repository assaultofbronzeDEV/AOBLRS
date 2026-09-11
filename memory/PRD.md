# Assault of Bronze Companion — PRD

## Overview
Mobile character sheet app for the "Assault of Bronze" lightweight roleplay TTRPG. Fully offline. Now supports both **Heroes** and **Monsters** so the whole table (players + GM) can run a session on-device.

## Home Page
- **Two collapsible sections**: Heroes and Monsters. Tap the header to hide/show. Count badge on each header.
- **Two Create buttons**: "New Hero" and "New Monster" side by side at the bottom.
- Row: tap to open; long-press or tap the trash icon (with in-app confirm modal) to delete.
- Light / Dark theme toggle in the header.

## Hero Sheet
- Portrait picker (base64), Name / Class / Level.
- HP tracker: fixed max 20 (2 × 10 hearts). Tap hearts or use +/- (long-press = ±5). HP value shown left of +/-.
- Armour input + Melee DMG bronze roll button (tap to roll, pencil to edit notation).
- Action bar: Roll mode chip (Normal → Advantage → Disadvantage, single-use), Long Rest.
- Stats: 4 stat cards (STR / DEX / INT / CHA) with 4 sub-skills each. Tap name/label to roll d20 vs value.
- Weapons, Once Per Turn, Once Per Rest, Hero Abilities (with Hero Points + "Boost +1d6" button). Backstory, Inventory checklist, Notes, Roll History, Custom sections. All collapsible.
- **Hero Points**: using a Hero Ability spends 1 Hero Point (blocked with a warning if none). Boost button spends 1 Hero Point to add 1d6 to the next d20 roll.
- **Once Per Rest lockout**: a Once Per Rest ability greys out with "Used — Long Rest to reset" after one use. Long Rest clears all `used` flags and refills HP to 20.

## Monster Sheet (GM)
- Same structure with reduced stats laid out as **stacked full-width cards** (one per row):
  - Strength · Dexterity · Melee Attack · Ranged Attack · Special Ability
- **Editable Max HP** (draft-then-commit input, supports erase).
- Same weapons + abilities + roll history + rolls system.
- Inventory section renamed **Dropped Loot**.
- No Hero Points / Boost UI.

## Dice Roll Overlay
- Animated d20 with tick-through effect.
- Advantage / Disadvantage rolls 2 d20s and shows both.
- Boost adds 1d6 shown as a separate breakdown line.
- Effect rolls (damage / healing) fire on success and show total + individual dice.
- Invalid dice notation shows a friendly hint instead of hanging.

## Persistence
- AsyncStorage under `aob:characters:v1`, 400 ms debounced.
- Full migration coverage: old string abilities, missing weapons/inventoryItems/rollHistory arrays, legacy `1xD6` melee notation, legacy inventory strings, `kind` and `maxHp` defaults.

## Design
Parchment / dark forge aesthetic. Light and dark palettes both feature heavy 2–3 pt ink borders, bronze accents, crimson for hearts / failures / delete.

## Hero Character Creator (`/create-hero`)
Launched by the **New Hero** button. First shows a **mode picker**:
- **Easy Creation** → 5-step guided wizard (below).
- **Custom Creation** → skips the wizard entirely, creates an empty hero and jumps straight to the character sheet where every field can be edited freely.

### Easy Creation — 5-step wizard
1. **Race** — Elf/Half-Elf, Human, Dwarf, Hobbit/Halfling, Dragonborn, Giantborn, Therion, Orc/Half-Orc, Demonborn/Tiefling. Each has a tagline, short lore, and colored trait chips (green = high, red = low) mapped to specific sub-skills.
2. **Class** — Warrior, Ranger, Battle-Mage, Alchemist, Rogue, Warden, Scrapper, Sorcerer. Sets base Armour and starting weapon(s), plus its own high/low trait chips.
3. **Roll** — auto-rolls 20 × d20 clamped to [6, 18] with a staggered scale-in animation. "Reroll all" button.
4. **Assign** — tap a die → tap a slot to place. Sub-skill slots inherit **green borders** where race+class say "high" (want a LOW roll) and **red borders** where they say "low" (want a HIGH roll). Tapping a filled slot returns the value to the pool. Cannot proceed until all 20 dice are placed.
5. **Finalize** — name input (with sensible placeholder) + summary chips. Forge Hero creates the character with HP 20/20, applies base Armour + starting weapons, then navigates to the character sheet.

Data source: `/app/frontend/src/data/lineages.ts` — pure data (races + classes + trait refs).

## Tech Stack
Expo Router, React Native, react-native-reanimated (dice), expo-image-picker (base64 portraits), expo-haptics, @react-native-vector-icons/material-design-icons, AsyncStorage.

## Weapon & Item Libraries
Tapping **Add Weapon** or **Add Item** on a hero sheet opens a bottom-sheet **PickerSheet** modal with:
- A prominent **"Create custom …"** button up top (routes to a blank row like before).
- A live-search field.
- The full preset library grouped by category and tappable to add.

Weapon presets live in `src/data/weapons.ts` (categories: Blades, Big Steel, Hafted, Brawler, Bows & Slings, Magic & Named — includes Dagger, Short Sword, Weapon of Khaliik, and more). Item presets live in `src/data/items.ts` (General Goods, Tools, Medical, Consumables, Misc — prices baked into the name so `Torch (1s)`, `Potion of Healing (50g)`, etc.). All added rows remain fully editable inline.
