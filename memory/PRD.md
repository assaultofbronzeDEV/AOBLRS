# Assault of Bronze Companion — PRD

## Overview
Mobile character sheet app for the "Assault of Bronze" lightweight roleplay TTRPG. Fully offline, multi-character, portrait-friendly.

## Core Features

### Character List
- List all heroes with portrait / name / class / level / HP `X / 20`.
- FAB creates a new hero. Long-press a row to delete a hero.

### Character Sheet
- **Portrait**: tap to pick from photo library; stored as inline base64 so it survives reloads.
- **Name / Class / Level** labeled inputs.
- **HP tracker**: fixed max of 20. Two neat rows of 10 hearts. Tap a heart to jump to that value. `+` / `-` buttons for fine adjustment (long-press = ±5).
- **Armour** compact number input.
- **Melee DMG** is a bronze "Roll Damage" button showing the current dice notation. Tap to roll (effect-only DAMAGE flow). Pencil icon toggles inline editing of the notation.
- **4 stat blocks** — STR / DEX / INT / CHA abbreviations with the full name in small caps. Tapping the label/skill name rolls a d20 vs its number; tapping the number only edits.

### Weapons *(new)*
Above Once Per Turn. Each weapon card has:
- Name
- Kind toggle (Melee ↔ Ranged, locked to those two)
- Damage roll notation (e.g. `1d8+1`)
- **Attack** button — rolls d20 vs `Melee Attack` or `Ranged Attack` (DEX sub-skills); on success also rolls the damage dice.

### Structured Abilities
Three sections: **Once Per Turn**, **Once Per Rest**, **Hero Abilities**. Each holds a list of ability cards with:
- Title, description
- Optional linked stat (any main stat or sub-skill; picker modal)
- Optional damage/healing dice roll
- **Use** button: rolls d20 vs the linked stat's target (green success / red failure / gold nat 20 / dark red nat 1). On success (or when no stat is linked), the effect dice roll also fires.

### Hero Points
0–10 counter with +/- buttons next to Hero Abilities.

### Custom Sections
"Add Custom Section" at the bottom creates a titled text-box you can name and fill freely.

### Freeform sections
Backstory, Inventory, Notes remain as long-form multiline inputs.

### Dice Roll Overlay
Animated d20 rotates and ticks through values, then reveals the final number. Verdict colors: green success, red failure, gold nat 20, dark red nat 1. When an effect roll is attached, the modal shows the total damage/healing plus the individual dice. If the dice notation cannot be parsed, the modal shows "INVALID DICE NOTATION" with a helpful hint instead of getting stuck.

## Dice Parser
Accepts standard notation `NdM`, `NdM+K`, `NdM-K`, and the tabletop shorthand `NxDM` / `N*dM`. Old characters using `1xD6` are automatically normalised to `1d6` on load.

## Persistence
- `AsyncStorage` under key `aob:characters:v1`.
- 400 ms debounced autosave after every edit.
- Migration layer covers old string-based abilities, `hpMax` removal, missing weapons array, and legacy `1xD6` melee notation.

## Design
Parchment / medieval scroll aesthetic. Heavy 2–3 pt ink borders, cream `#F5F0E6` background, bronze `#B26941` primary, crimson `#8A2A2B` for hearts / failures, serif typography (Georgia / platform serif).

## Tech Stack
Expo Router, React Native, react-native-reanimated (dice animation), expo-image-picker (base64), expo-haptics, @react-native-vector-icons/material-design-icons, AsyncStorage.
