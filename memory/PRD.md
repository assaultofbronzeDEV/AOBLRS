# Assault of Bronze Companion — PRD

## Overview
Mobile character sheet app for the "Assault of Bronze" lightweight roleplay TTRPG. Players create and manage multiple characters, track HP, roll dice against stats, use structured abilities, and keep freeform notes. Fully offline (local device storage).

## Core Features

### Character List
- List all heroes with portrait / name / class / level / HP.
- FAB creates a new hero (`create-character-fab`).
- Long-press a row to delete a hero.

### Character Sheet
- **Portrait**: tap to pick from photo library.
- **Name / Class / Level** with labeled inputs.
- **HP tracker**: fixed max of 20. Hearts are tappable to jump to that value (tap heart N: filled → deplete to N; empty → fill to N+1). `+` / `-` buttons for fine adjustment (long-press = ±5).
- **Armour**, **Melee DMG** input cells.
- **4 stat blocks** (STRENGTH, DEXTERITY, INTELLIGENCE, CHARISMA) each with 4 sub-skills. Tapping the *name/label* rolls a d20 vs that number; tapping the *number field* only edits it.

### Structured Abilities
Three sections: **Once Per Turn**, **Once Per Rest**, **Hero Abilities**. Each holds a list of Ability cards with:
- Title
- Description
- Linked stat (any main stat or sub-skill; picker modal)
- Effect type cycle: None → Damage → Healing
- Effect dice roll (notation like `1d6+2`, `2d8`)
- **Use** button: rolls d20 vs the linked stat's target. On success (green ≥ target, gold on nat 20), the effect dice roll is also rolled and shown. On failure (red / dark red on nat 1), no effect roll. If no linked stat is set, only the effect roll runs.

### Hero Points counter
0–10 counter with +/- buttons alongside the Hero Abilities section.

### Custom Sections
"Add Custom Section" at the bottom creates a titled text-box the player can name and fill freely.

### Freeform text sections
Backstory, Inventory, Notes remain as long-form multiline inputs.

### Dice Roll Overlay
Animated d20 rotates and ticks through values; verdict colors: green success, red failure, gold nat 20, dark red nat 1. If an effect roll is attached, shows the total damage / healing plus the individual dice.

## Persistence
- `AsyncStorage` under key `aob:characters:v1`.
- 400 ms debounced autosave after every edit.
- Migration layer converts old string-based ability fields into the new Ability list format.

## Design
Parchment / medieval scroll aesthetic. Heavy 2–3 pt ink borders, cream `#F5F0E6` background, bronze `#B26941` primary, crimson `#8A2A2B` for hearts and failures, serif typography (Georgia / platform serif).

## Tech Stack
Expo Router (file-based), React Native, react-native-reanimated (dice animation), expo-image-picker, expo-haptics, @react-native-vector-icons/material-design-icons, AsyncStorage.
