// Assault of Bronze — starter ability library.
// Three tiers of power. Players may still craft custom abilities.

import type { EffectType } from "@/src/types";

export type AbilityCategory =
  | "Starter Spells"
  | "Class Specials"
  | "Once Per Rest";

export type AbilityPreset = {
  id: string;
  name: string;
  description: string;
  category: AbilityCategory;
  effectType: EffectType;
  effectRoll?: string;
  // Optional flavor tag ("Warrior", "Ranger" etc.) shown as a soft hint.
  tag?: string;
};

export const ABILITY_PRESETS: AbilityPreset[] = [
  // ── Starter Spells (cantrip tier — good as Once Per Turn) ────
  {
    id: "firebolt",
    name: "Firebolt",
    description: "A dart of flame flies from your fingertip.",
    category: "Starter Spells",
    effectType: "damage",
    effectRoll: "1d6",
  },
  {
    id: "frost-ray",
    name: "Frost Ray",
    description: "A biting ray of cold; the target's next move slows.",
    category: "Starter Spells",
    effectType: "damage",
    effectRoll: "1d6",
  },
  {
    id: "shocking-grasp",
    name: "Shocking Grasp",
    description: "Touch attack — the air cracks. Metal targets take an extra 1.",
    category: "Starter Spells",
    effectType: "damage",
    effectRoll: "1d6",
  },
  {
    id: "healing-touch",
    name: "Healing Touch",
    description: "Lay hands on an ally. Wounds close a little.",
    category: "Starter Spells",
    effectType: "healing",
    effectRoll: "1d4",
  },
  {
    id: "guiding-light",
    name: "Guiding Light",
    description: "A mote of light shows the way. Advantage on the next Perception roll.",
    category: "Starter Spells",
    effectType: "none",
  },
  {
    id: "mage-hand",
    name: "Mage Hand",
    description: "A spectral hand fetches, presses, or nudges within 30 ft.",
    category: "Starter Spells",
    effectType: "none",
  },
  {
    id: "minor-illusion",
    name: "Minor Illusion",
    description: "Conjure a small sound or image for one scene.",
    category: "Starter Spells",
    effectType: "none",
  },
  {
    id: "prestidigitation",
    name: "Prestidigitation",
    description: "Small tricks: clean, chill, warm, flavour, spark.",
    category: "Starter Spells",
    effectType: "none",
  },

  // ── Class Specials (mid tier) ─────────────────────────────
  {
    id: "second-wind",
    name: "Second Wind",
    description: "Dig deep. Regain a burst of health mid-fight.",
    category: "Class Specials",
    effectType: "healing",
    effectRoll: "1d6+2",
    tag: "Warrior",
  },
  {
    id: "aimed-shot",
    name: "Aimed Shot",
    description: "Take an extra breath, then loose. Precision beats hurry.",
    category: "Class Specials",
    effectType: "damage",
    effectRoll: "1d8",
    tag: "Ranger",
  },
  {
    id: "sneak-attack",
    name: "Sneak Attack",
    description: "Strike from surprise or a flank. Add a die of hurt to your next hit.",
    category: "Class Specials",
    effectType: "damage",
    effectRoll: "1d6",
    tag: "Rogue",
  },
  {
    id: "alchemist-bomb",
    name: "Alchemist's Bomb",
    description: "Throw a flask. Everyone within reach catches it.",
    category: "Class Specials",
    effectType: "damage",
    effectRoll: "1d6",
    tag: "Alchemist",
  },
  {
    id: "beast-speech",
    name: "Beast Speech",
    description: "Speak with a beast for one short scene. It may listen. It may not.",
    category: "Class Specials",
    effectType: "none",
    tag: "Warden",
  },
  {
    id: "rally-cry",
    name: "Rally Cry",
    description: "Party gains advantage on their next roll.",
    category: "Class Specials",
    effectType: "none",
    tag: "Warrior",
  },
  {
    id: "vanish",
    name: "Vanish",
    description: "Melt into shadow. Enter Stealth without a check.",
    category: "Class Specials",
    effectType: "none",
    tag: "Rogue",
  },
  {
    id: "arcane-missile",
    name: "Arcane Missile",
    description: "A slim dart of raw force. Never misses.",
    category: "Class Specials",
    effectType: "damage",
    effectRoll: "1d4+2",
    tag: "Sorcerer",
  },
  {
    id: "battle-chant",
    name: "Battle Chant",
    description: "Rhythmic old-tongue chant. +1 damage on melee attacks this scene.",
    category: "Class Specials",
    effectType: "none",
    tag: "Battle-Mage",
  },
  {
    id: "brutal-swing",
    name: "Brutal Swing",
    description: "A wide, wild arc. Cracks armour and ribs alike.",
    category: "Class Specials",
    effectType: "damage",
    effectRoll: "1d10",
    tag: "Scrapper",
  },

  // ── Once Per Rest (powerful) ─────────────────────────────
  {
    id: "fireball",
    name: "Fireball",
    description: "A roar of flame engulfs everyone in a 20 ft radius.",
    category: "Once Per Rest",
    effectType: "damage",
    effectRoll: "3d6",
  },
  {
    id: "massive-heal",
    name: "Massive Heal",
    description: "Golden light. An ally is pulled back from the brink.",
    category: "Once Per Rest",
    effectType: "healing",
    effectRoll: "3d6",
  },
  {
    id: "berserker-fury",
    name: "Berserker Fury",
    description: "Rage takes you. +2 to every roll this scene. You feel it later.",
    category: "Once Per Rest",
    effectType: "none",
    tag: "Warrior",
  },
  {
    id: "shield-of-bronze",
    name: "Shield of Bronze",
    description: "Nullify a single attack — even one you didn't see coming.",
    category: "Once Per Rest",
    effectType: "none",
  },
  {
    id: "lightning-storm",
    name: "Lightning Storm",
    description: "The sky opens. Everyone in the field takes the hit.",
    category: "Once Per Rest",
    effectType: "damage",
    effectRoll: "4d6",
    tag: "Sorcerer",
  },
  {
    id: "ice-wall",
    name: "Ice Wall",
    description: "Raise a wall of ice — 30 ft long, one scene. Passage denied.",
    category: "Once Per Rest",
    effectType: "none",
  },
  {
    id: "dimension-step",
    name: "Dimension Step",
    description: "Blink up to 60 ft to a spot you can see.",
    category: "Once Per Rest",
    effectType: "none",
    tag: "Sorcerer",
  },
  {
    id: "battle-focus",
    name: "Battle Focus",
    description: "The world slows. Your next attack lands at maximum damage.",
    category: "Once Per Rest",
    effectType: "none",
  },
  {
    id: "divine-intervention",
    name: "Divine Intervention",
    description: "Reach across the veil. A fallen ally returns at 1 HP.",
    category: "Once Per Rest",
    effectType: "healing",
    effectRoll: "1d4",
  },
  {
    id: "blood-frenzy",
    name: "Blood Frenzy",
    description: "Deal massive damage — and drink 1d6 of it yourself.",
    category: "Once Per Rest",
    effectType: "damage",
    effectRoll: "2d10",
    tag: "Scrapper",
  },
  {
    id: "arrow-storm",
    name: "Arrow Storm",
    description: "A quiver empties into the air. It rains.",
    category: "Once Per Rest",
    effectType: "damage",
    effectRoll: "3d8",
    tag: "Ranger",
  },
  {
    id: "war-cry",
    name: "War Cry",
    description: "Foes within earshot must make an Intimidation roll or flinch (disadvantage on their next action).",
    category: "Once Per Rest",
    effectType: "none",
    tag: "Warrior",
  },
];

export const ABILITY_CATEGORY_ORDER: AbilityCategory[] = [
  "Starter Spells",
  "Class Specials",
  "Once Per Rest",
];
