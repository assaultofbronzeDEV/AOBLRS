# Assault of Bronze Companion — PRD

## Overview
Mobile character sheet app for the "Assault of Bronze" lightweight roleplay TTRPG. Fully offline, multi-character, portrait-friendly, with a full session toolkit (dice, history, rests, inventory).

## Character List
- Hero rows show portrait / name / class / level / HP.
- FAB creates a new hero.
- **Visible trash icon** on each row and long-press both open an **in-app confirmation modal** (Cancel / Delete).

## Character Sheet

### Header block
- Portrait picker (persisted as base64).
- Name / Class / Level labeled inputs.

### Combat block
- HP tracker: fixed max of 20, two rows of 10 tappable hearts, +/- buttons.
- Armour compact number input.
- Melee DMG bronze roll button with tap-to-edit notation.

### Action bar (below combat)
- **Roll mode chip** cycles Normal → Advantage → Disadvantage → Normal. Auto-resets to Normal after one d20 roll consumes it (effect-only rolls do not consume the mode).
- **Long Rest** button refills HP to 20 and clears `used` flags on all abilities.

### Stat grid
- STR / DEX / INT / CHA cards with 4 sub-skills each. Tap a label to roll d20 vs its number; the number field only edits.

### Collapsible sections (tap header to expand/collapse)
- **Weapons** — add cards with Melee/Ranged toggle, damage roll, and Attack button (d20 vs the DEX Melee/Ranged Attack, damage on success).
- **Once Per Turn / Once Per Rest / Hero Abilities** — ability cards with title, description, linked stat picker, damage/healing dice, Use button.
- **Backstory** — long-form freeform text (collapsible).
- **Inventory** — checklist of items with quantity +/- and a used checkbox that strikes through the name.
- **Notes** — long-form freeform text (collapsible).
- **Roll History** — last 20 rolls per character with label, d20 result vs target (and adv/dis note), verdict, and damage/healing total. Clear button included.
- **Custom sections** — user-titled text boxes at the bottom, collapsible.

### Dice Roll Overlay
- Animated d20 rotates + ticker.
- Colors: green success, red failure, gold nat 20, dark red nat 1.
- **Advantage / Disadvantage** rolls 2 d20s and shows both dice + the kept value.
- Effect rolls (damage/healing) fire on success and show total + individual rolls.
- Invalid dice notation shows a friendly hint instead of getting stuck.

## Dice Parser
Accepts `NdM`, `NdM±K`, and the tabletop shorthand `NxDM` / `N*dM`. Legacy `1xD6` melee defaults auto-migrate to `1d6`.

## Persistence
- AsyncStorage under `aob:characters:v1`.
- 400 ms debounced autosave.
- Migration layer covers old string-based abilities, `hpMax` removal, missing weapons/inventoryItems/rollHistory arrays, legacy `1xD6` melee notation, and legacy inventory strings (parsed line-by-line into checklist items).

## Design
Parchment / medieval scroll aesthetic. Heavy 2–3 pt ink borders, cream `#F5F0E6` background, bronze `#B26941` primary, crimson `#8A2A2B` for hearts / failures / delete, serif typography (Georgia / platform serif).

## Tech Stack
Expo Router, React Native, react-native-reanimated (dice animation), expo-image-picker (base64), expo-haptics, @react-native-vector-icons/material-design-icons, AsyncStorage.
