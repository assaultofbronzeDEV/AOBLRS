// Assault of Bronze — starter ability library.
//
// Every preset (except Hero Abilities) ships with a default `linkedStat`
// so the roll button prompts the right sub-skill check:
//
//   magic (utility / area / non-directional)  → INT main
//   ranged magic OR ranged physical            → DEX · Ranged Attack
//   melee (magic or physical)                  → DEX · Melee Attack
//   non-magical healing                        → INT · First Aid
//   magical healing                            → INT main
//   stealth / social / creature specifics      → the sub-skill it echoes
//
// Hero Abilities intentionally have no linkedStat — they trigger without a
// check when a Hero Point is spent.

import type { EffectType, StatRef } from "@/src/types";

export type AbilityCategory =
  | "Starter Spells"
  | "Class Specials"
  | "Once Per Rest"
  | "Hero Abilities";

export type AbilityPreset = {
  id: string;
  name: string;
  description: string;
  category: AbilityCategory;
  effectType: EffectType;
  effectRoll?: string;
  linkedStat?: StatRef;
  tag?: string;
};

// Handy shortcuts.
const INT_MAIN: StatRef = { kind: "main", statKey: "INT" };
const INT_FIRST_AID: StatRef = { kind: "sub", statKey: "INT", subIndex: 3 };
const DEX_MELEE: StatRef = { kind: "sub", statKey: "DEX", subIndex: 0 };
const DEX_RANGED: StatRef = { kind: "sub", statKey: "DEX", subIndex: 1 };
const DEX_STEALTH: StatRef = { kind: "sub", statKey: "DEX", subIndex: 3 };
const STR_INTIMIDATION: StatRef = { kind: "sub", statKey: "STR", subIndex: 2 };
const STR_VITALITY: StatRef = { kind: "sub", statKey: "STR", subIndex: 3 };
const CHA_PERSUASION: StatRef = { kind: "sub", statKey: "CHA", subIndex: 0 };
const CHA_CREATURE: StatRef = { kind: "sub", statKey: "CHA", subIndex: 3 };

export const ABILITY_PRESETS: AbilityPreset[] = [
  // ── Starter Spells (cantrip tier — Once Per Turn) ────────
  {
    id: "firebolt",
    name: "Firebolt",
    description: "A dart of flame flies from your fingertip.",
    category: "Starter Spells",
    effectType: "damage",
    effectRoll: "1d6",
    linkedStat: DEX_RANGED,
  },
  {
    id: "frost-ray",
    name: "Frost Ray",
    description: "A biting ray of cold; the target's next move slows.",
    category: "Starter Spells",
    effectType: "damage",
    effectRoll: "1d6",
    linkedStat: DEX_RANGED,
  },
  {
    id: "shocking-grasp",
    name: "Shocking Grasp",
    description: "Touch attack — the air cracks. Metal targets take an extra 1.",
    category: "Starter Spells",
    effectType: "damage",
    effectRoll: "1d6",
    linkedStat: DEX_MELEE,
  },
  {
    id: "healing-touch",
    name: "Healing Touch",
    description: "Lay hands on an ally. Wounds close a little.",
    category: "Starter Spells",
    effectType: "healing",
    effectRoll: "1d4",
    linkedStat: INT_MAIN,
  },
  {
    id: "guiding-light",
    name: "Guiding Light",
    description: "A mote of light shows the way. Advantage on the next Perception roll.",
    category: "Starter Spells",
    effectType: "none",
    linkedStat: INT_MAIN,
  },
  {
    id: "mage-hand",
    name: "Mage Hand",
    description: "A spectral hand fetches, presses, or nudges within 30 ft.",
    category: "Starter Spells",
    effectType: "none",
    linkedStat: INT_MAIN,
  },
  {
    id: "minor-illusion",
    name: "Minor Illusion",
    description: "Conjure a small sound or image for one scene.",
    category: "Starter Spells",
    effectType: "none",
    linkedStat: INT_MAIN,
  },
  {
    id: "prestidigitation",
    name: "Prestidigitation",
    description: "Small tricks: clean, chill, warm, flavour, spark.",
    category: "Starter Spells",
    effectType: "none",
    linkedStat: INT_MAIN,
  },

  // ── Class Specials (mid tier — Once Per Turn signature moves) ─
  {
    id: "second-wind",
    name: "Second Wind",
    description: "Dig deep. Regain a burst of health mid-fight.",
    category: "Class Specials",
    effectType: "healing",
    effectRoll: "1d6+2",
    linkedStat: INT_FIRST_AID,
    tag: "Warrior",
  },
  {
    id: "aimed-shot",
    name: "Aimed Shot",
    description: "Take an extra breath, then loose. Precision beats hurry.",
    category: "Class Specials",
    effectType: "damage",
    effectRoll: "1d8",
    linkedStat: DEX_RANGED,
    tag: "Ranger",
  },
  {
    id: "sneak-attack",
    name: "Sneak Attack",
    description: "Strike from surprise or a flank. Add a die of hurt to your next hit.",
    category: "Class Specials",
    effectType: "damage",
    effectRoll: "1d6",
    linkedStat: DEX_MELEE,
    tag: "Rogue",
  },
  {
    id: "alchemist-bomb",
    name: "Alchemist's Bomb",
    description: "Throw a flask. Everyone within reach catches it.",
    category: "Class Specials",
    effectType: "damage",
    effectRoll: "1d6",
    linkedStat: DEX_RANGED,
    tag: "Alchemist",
  },
  {
    id: "beast-speech",
    name: "Beast Speech",
    description: "Speak with a beast for one short scene. It may listen. It may not.",
    category: "Class Specials",
    effectType: "none",
    linkedStat: CHA_CREATURE,
    tag: "Warden",
  },
  {
    id: "rally-cry",
    name: "Rally Cry",
    description: "Party gains advantage on their next roll.",
    category: "Class Specials",
    effectType: "none",
    linkedStat: CHA_PERSUASION,
    tag: "Warrior",
  },
  {
    id: "vanish",
    name: "Vanish",
    description: "Melt into shadow.",
    category: "Class Specials",
    effectType: "none",
    linkedStat: DEX_STEALTH,
    tag: "Rogue",
  },
  {
    id: "arcane-missile",
    name: "Arcane Missile",
    description: "A slim dart of raw force. Never misses.",
    category: "Class Specials",
    effectType: "damage",
    effectRoll: "1d4+2",
    linkedStat: DEX_RANGED,
    tag: "Sorcerer",
  },
  {
    id: "battle-chant",
    name: "Battle Chant",
    description: "Rhythmic old-tongue chant. +1 damage on melee attacks this scene.",
    category: "Class Specials",
    effectType: "none",
    linkedStat: INT_MAIN,
    tag: "Battle-Mage",
  },
  {
    id: "brutal-swing",
    name: "Brutal Swing",
    description: "A wide, wild arc. Cracks armour and ribs alike.",
    category: "Class Specials",
    effectType: "damage",
    effectRoll: "1d10",
    linkedStat: DEX_MELEE,
    tag: "Scrapper",
  },

  // ── Once Per Rest (powerful — 1d10 minimum) ───────────────
  {
    id: "fireball",
    name: "Fireball",
    description: "A roar of flame engulfs everyone in a 20 ft radius.",
    category: "Once Per Rest",
    effectType: "damage",
    effectRoll: "3d10",
    linkedStat: INT_MAIN,
  },
  {
    id: "massive-heal",
    name: "Massive Heal",
    description: "Golden light. An ally is pulled back from the brink.",
    category: "Once Per Rest",
    effectType: "healing",
    effectRoll: "2d10+2",
    linkedStat: INT_MAIN,
  },
  {
    id: "lightning-storm",
    name: "Lightning Storm",
    description: "The sky opens. Everyone in the field takes the hit.",
    category: "Once Per Rest",
    effectType: "damage",
    effectRoll: "3d10",
    linkedStat: INT_MAIN,
    tag: "Sorcerer",
  },
  {
    id: "arrow-storm",
    name: "Arrow Storm",
    description: "A quiver empties into the air. It rains.",
    category: "Once Per Rest",
    effectType: "damage",
    effectRoll: "2d12",
    linkedStat: DEX_RANGED,
    tag: "Ranger",
  },
  {
    id: "cleave",
    name: "Cleave",
    description: "One swing, two enemies in reach. Both feel it.",
    category: "Once Per Rest",
    effectType: "damage",
    effectRoll: "2d10",
    linkedStat: DEX_MELEE,
    tag: "Warrior",
  },
  {
    id: "explosive-shot",
    name: "Explosive Shot",
    description: "Alchemist-tipped arrow bursts on impact.",
    category: "Once Per Rest",
    effectType: "damage",
    effectRoll: "2d12",
    linkedStat: DEX_RANGED,
    tag: "Ranger",
  },
  {
    id: "frozen-grasp",
    name: "Frozen Grasp",
    description: "The target's blood slows. They lose their next action.",
    category: "Once Per Rest",
    effectType: "damage",
    effectRoll: "2d10",
    linkedStat: DEX_MELEE,
  },
  {
    id: "blood-frenzy",
    name: "Blood Frenzy",
    description: "Deal massive damage — and drink 1d6 of it yourself.",
    category: "Once Per Rest",
    effectType: "damage",
    effectRoll: "3d10",
    linkedStat: DEX_MELEE,
    tag: "Scrapper",
  },
  {
    id: "consecrate-ground",
    name: "Consecrate Ground",
    description: "Bless the earth beneath you. Allies within 10 ft are healed.",
    category: "Once Per Rest",
    effectType: "healing",
    effectRoll: "2d10",
    linkedStat: INT_MAIN,
  },
  {
    id: "berserker-fury",
    name: "Berserker Fury",
    description: "Rage takes you. +2 to every roll this scene. You feel it later.",
    category: "Once Per Rest",
    effectType: "none",
    linkedStat: STR_VITALITY,
    tag: "Warrior",
  },
  {
    id: "shield-of-bronze",
    name: "Shield of Bronze",
    description: "Nullify a single attack — even one you didn't see coming.",
    category: "Once Per Rest",
    effectType: "none",
    linkedStat: STR_VITALITY,
  },
  {
    id: "ice-wall",
    name: "Ice Wall",
    description: "Raise a wall of ice — 30 ft long, one scene. Passage denied.",
    category: "Once Per Rest",
    effectType: "none",
    linkedStat: INT_MAIN,
  },
  {
    id: "dimension-step",
    name: "Dimension Step",
    description: "Blink up to 60 ft to a spot you can see.",
    category: "Once Per Rest",
    effectType: "none",
    linkedStat: INT_MAIN,
    tag: "Sorcerer",
  },
  {
    id: "battle-focus",
    name: "Battle Focus",
    description: "The world slows. Your next attack lands at maximum damage.",
    category: "Once Per Rest",
    effectType: "none",
    linkedStat: INT_MAIN,
  },
  {
    id: "war-cry",
    name: "War Cry",
    description: "Foes within earshot flinch — disadvantage on their next action.",
    category: "Once Per Rest",
    effectType: "none",
    linkedStat: STR_INTIMIDATION,
    tag: "Warrior",
  },
  {
    id: "curse-of-weakness",
    name: "Curse of Weakness",
    description: "Enemies within 30 ft suffer -2 to all rolls for one scene.",
    category: "Once Per Rest",
    effectType: "none",
    linkedStat: INT_MAIN,
  },

  // ── Hero Abilities (legendary — d20 minimum, no check needed) ─
  {
    id: "meteor-strike",
    name: "Meteor Strike",
    description: "Call a stone from the black sky. All in a 30 ft radius are struck.",
    category: "Hero Abilities",
    effectType: "damage",
    effectRoll: "3d20",
  },
  {
    id: "wrath-of-khaliik",
    name: "Wrath of Khaliik",
    description: "The old god answers. A pillar of bronze fire consumes the field.",
    category: "Hero Abilities",
    effectType: "damage",
    effectRoll: "3d20",
  },
  {
    id: "world-shatter",
    name: "World-Shatter",
    description: "Slam the earth. It cracks outward — anything standing on it is thrown.",
    category: "Hero Abilities",
    effectType: "damage",
    effectRoll: "4d20",
    tag: "Scrapper",
  },
  {
    id: "blade-of-dawn",
    name: "Blade of Dawn",
    description: "Your weapon flares with white flame. One cut, one enemy, one memory.",
    category: "Hero Abilities",
    effectType: "damage",
    effectRoll: "2d20+10",
    tag: "Warrior",
  },
  {
    id: "dragons-breath",
    name: "Dragon's Breath",
    description: "Breathe fire in a 60 ft cone. Everyone in it burns.",
    category: "Hero Abilities",
    effectType: "damage",
    effectRoll: "2d20",
    tag: "Dragonborn",
  },
  {
    id: "nova-burst",
    name: "Nova Burst",
    description: "Your body explodes with light. Every foe within 20 ft is blasted.",
    category: "Hero Abilities",
    effectType: "damage",
    effectRoll: "3d20",
    tag: "Sorcerer",
  },
  {
    id: "soul-rend",
    name: "Soul Rend",
    description: "Tear a chunk from the target's spirit. You heal for half the damage dealt.",
    category: "Hero Abilities",
    effectType: "damage",
    effectRoll: "2d20",
  },
  {
    id: "godslayer",
    name: "Godslayer",
    description: "One perfect strike. Meant for kings, gods, and monsters — no exceptions.",
    category: "Hero Abilities",
    effectType: "damage",
    effectRoll: "2d20+10",
  },
  {
    id: "chains-of-bronze",
    name: "Chains of Bronze",
    description: "Bronze links erupt from the ground, holding the target. They cannot act next turn.",
    category: "Hero Abilities",
    effectType: "damage",
    effectRoll: "1d20",
  },
  {
    id: "phoenix-rebirth",
    name: "Phoenix Rebirth",
    description: "The next time you would fall this scene, rise instead at full HP.",
    category: "Hero Abilities",
    effectType: "healing",
    effectRoll: "1d20+10",
  },
  {
    id: "divine-resurrection",
    name: "Divine Resurrection",
    description: "A fallen ally opens their eyes. They stand at full strength.",
    category: "Hero Abilities",
    effectType: "healing",
    effectRoll: "2d20",
  },
  {
    id: "sanctuary",
    name: "Sanctuary",
    description: "Bathe every ally in warm light. Each is healed for the same amount.",
    category: "Hero Abilities",
    effectType: "healing",
    effectRoll: "1d20+5",
  },
  {
    id: "absolute-judgement",
    name: "Absolute Judgement",
    description: "You point. The target's HP is reduced to 1. Once per hero, ever.",
    category: "Hero Abilities",
    effectType: "damage",
    effectRoll: "1d20",
  },
  {
    id: "time-slip",
    name: "Time Slip",
    description: "For one heartbeat, only you move. Take an extra full turn.",
    category: "Hero Abilities",
    effectType: "none",
  },
  {
    id: "titans-roar",
    name: "Titan's Roar",
    description: "A voice like breaking mountains. All enemies flee for one scene.",
    category: "Hero Abilities",
    effectType: "damage",
    effectRoll: "1d20",
    tag: "Giantborn",
  },
];

export const ABILITY_CATEGORY_ORDER: AbilityCategory[] = [
  "Starter Spells",
  "Class Specials",
  "Once Per Rest",
  "Hero Abilities",
];
