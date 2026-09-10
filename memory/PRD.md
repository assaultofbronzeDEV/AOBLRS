# Assault of Bronze Companion — PRD

## Overview
Mobile character sheet app for the "Assault of Bronze" lightweight roleplay TTRPG. Players create and manage multiple characters, track HP, roll dice against stats, and store notes/inventory/abilities. Fully offline (local device storage).

## Core Features
- **Character list** – Long-press a row to delete; tap to open. FAB creates a new hero.
- **Character sheet** – Portrait (tap to pick from library), Name, Class, Level, 20-heart HP tracker (adjustable max), Armour, Melee DMG, four stat blocks (STR/DEX/INT/CHA) each with 4 sub-skills, Once Per Turn, Once Per Rest, Hero Ability + Hero Points counter (0–10), Backstory, Inventory, Notes. Autosaves 400 ms after any edit.
- **Dice roller** – Tap any stat or sub-skill to roll a d20 against its number. Animated d20 rotates and ticks through values; verdict colors: green (success ≥ target), red (failure), gold (nat 20 crit), dark red (nat 1 crit fail). Haptics on roll and result.

## Persistence
- `AsyncStorage` under key `aob:characters:v1`.
- No backend / cloud sync.

## Design
Parchment/medieval scroll aesthetic. Heavy 2–3 pt ink borders, cream `#F5F0E6` background, bronze `#B26941` primary, crimson `#8A2A2B` for hearts and failures, serif typography (Georgia / platform serif).

## Tech Stack
Expo Router (file-based), React Native, react-native-reanimated (dice animation), expo-image-picker (portrait), expo-haptics, @react-native-vector-icons/material-design-icons.
