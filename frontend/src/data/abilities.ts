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
    description: "A dart of flame flies from your fingertips up to 25ft.",
    category: "Starter Spells",
    effectType: "damage",
    effectRoll: "1d6+2",
    linkedStat: DEX_RANGED,
  },
  {
    id: "frost-ray",
    name: "Frost Ray",
    description: "A biting ray of cold; the target's movement is halved next turn.",
    category: "Starter Spells",
    effectType: "damage",
    effectRoll: "1d8",
    linkedStat: DEX_RANGED,
  },
  {
    id: "shocking-grasp",
    name: "Shocking Grasp",
    description: "Touch attack. The air cracks with lightning. Metal targets take an extra 1d6 damage.",
    category: "Starter Spells",
    effectType: "damage",
    effectRoll: "1d6+3",
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
    description: "Conjure a small sound or image. It lasts until you break concentration.",
    category: "Starter Spells",
    effectType: "none",
    linkedStat: INT_MAIN,
  },
  {
    id: "prestidigitation",
    name: "Prestidigitation",
    description: "Small tricks: clean a pot, a quick burst of cold, heat up your hands, flavour your food, throw some sparks, etc.",
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
    tag: "Warrior",
  },
  {
    id: "aimed-shot",
    name: "Aimed Shot",
    description: "Take an extra breath, then loose your arrow. Precision beats hurry.",
    category: "Class Specials",
    effectType: "damage",
    effectRoll: "1d8+5",
    linkedStat: DEX_RANGED,
    tag: "Ranger",
  },
  {
    id: "sneak-attack",
    name: "Sneak Attack",
    description: "Strike from surprise or a flank. If success, you deal double damage.",
    category: "Class Specials",
    effectType: "damage",
    effectRoll: "1d8+3",
    linkedStat: DEX_MELEE,
    tag: "Rogue",
  },
  {
    id: "alchemist-bomb",
    name: "Alchemist's Bomb",
    description: "Throw a flask up to 20ft. Everyone within a 10ft radius takes damage.",
    category: "Class Specials",
    effectType: "damage",
    effectRoll: "1d10+5",
    linkedStat: DEX_RANGED,
    tag: "Alchemist",
  },
  {
    id: "beast-speech",
    name: "Beast Speech",
    description: "Speak a beast's language for ten minutes. It may listen. It may not.",
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
    description: "You melt into shadow.",
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
    linkedStat: INT_MAIN,
    tag: "Sorcerer",
  },
  {
    id: "battle-chant",
    name: "Battle Chant",
    description: "Rhythmic old-tongue chant. +1 damage on melee attacks for all allies this round.",
    category: "Class Specials",
    effectType: "none",
    linkedStat: STR_INTIMIDATION,
    tag: "Battle-Mage",
  },
  {
    id: "brutal-swing",
    name: "Brutal Swing",
    description: "A wide, wild arc. Hits all within a 10ft radius. Cracks armour and ribs alike.",
    category: "Class Specials",
    effectType: "damage",
    effectRoll: "1d10+5",
    linkedStat: DEX_MELEE,
    tag: "Scrapper",
  },

  // ── Once Per Rest (powerful — 1d10 minimum) ───────────────
  {
    id: "brew-potion",
    name: "Brew Potion",
    description: "Choose a potion to brew. Costs ingredients and requires an available formula level.",
    category: "Once Per Rest",
    effectType: "none",
    linkedStat: INT_MAIN,
    tag: "Alchemist",
  },
  {
    id: "fireball",
    name: "Fireball",
    description: "A ball of flame that you can throw up to 20ft, it's flame engulfs everything within a 20 ft radius.",
    category: "Once Per Rest",
    effectType: "damage",
    effectRoll: "3d10",
    linkedStat: INT_MAIN,
  },
  {
    id: "massive-heal",
    name: "Massive Heal",
    description: "Golden light emerges from your hands. An ally is pulled back from the brink.",
    category: "Once Per Rest",
    effectType: "healing",
    effectRoll: "2d10+2",
    linkedStat: INT_MAIN,
  },
  {
    id: "lightning-storm",
    name: "Lightning Storm",
    description: "The sky opens. Everything within 25 feet of you must make a DEX save or be damaged.",
    category: "Once Per Rest",
    effectType: "damage",
    effectRoll: "3d10",
    linkedStat: INT_MAIN,
    tag: "Sorcerer",
  },
  {
    id: "arrow-storm",
    name: "Arrow Storm",
    description: "USES 20 ARROWS. It rains. Everything within 25 feet radius must make a DEX save or be damaged.",
    category: "Once Per Rest",
    effectType: "damage",
    effectRoll: "3d12",
    linkedStat: DEX_RANGED,
    tag: "Ranger",
  },
  {
    id: "cleave",
    name: "Cleave",
    description: "One swing at two enemies adjacent to each other within 5ft. Both take the same damage.",
    category: "Once Per Rest",
    effectType: "damage",
    effectRoll: "2d10",
    linkedStat: DEX_MELEE,
    tag: "Warrior",
  },
  {
    id: "explosive-shot",
    name: "Explosive Shot",
    description: "Alchemist-engineered tipped arrows that burst on impact. Don't drop these.",
    category: "Once Per Rest",
    effectType: "damage",
    effectRoll: "2d12",
    linkedStat: DEX_RANGED,
    tag: "Ranger",
  },
  {
    id: "frozen-grasp",
    name: "Frozen Grasp",
    description: "You grip the target and their blood slows. They lose their next turn.",
    category: "Once Per Rest",
    effectType: "damage",
    effectRoll: "2d10",
    linkedStat: DEX_MELEE,
  },
  {
    id: "blood-frenzy",
    name: "Blood Frenzy",
    description: "Deal massive damage to all enemies within 20ft and drink half of it yourself.",
    category: "Once Per Rest",
    effectType: "damage",
    effectRoll: "3d10",
    linkedStat: DEX_MELEE,
    tag: "Scrapper",
  },
  {
    id: "consecrate-ground",
    name: "Consecrate Ground",
    description: "Bless the earth beneath you. Allies within 10 ft are healed instantly.",
    category: "Once Per Rest",
    effectType: "healing",
    effectRoll: "2d10",
    linkedStat: INT_MAIN,
  },
  {
    id: "berserker-fury",
    name: "Berserker Fury",
    description: "Rage takes you. You have advantage on every Melee roll for two turns. You feel it later.",
    category: "Once Per Rest",
    effectType: "none",
    linkedStat: STR_VITALITY,
    tag: "Warrior",
  },
  {
    id: "shield-of-bronze",
    name: "Shield of Bronze",
    description: "Nullify a single attack at any time, even one you didn't see coming.",
    category: "Once Per Rest",
    effectType: "none",
    linkedStat: STR_VITALITY,
  },
  {
    id: "ice-wall",
    name: "Ice Wall",
    description: "Raise a wall of ice, 30ft long. It lasts until it melts. Passage denied.",
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
    description: "The world slows. Your next attack has advantage and deals maximum damage.",
    category: "Once Per Rest",
    effectType: "none",
    linkedStat: INT_MAIN,
  },
  {
    id: "war-cry",
    name: "War Cry",
    description: "Foes within earshot flee from your cries and have disadvantage on their next action.",
    category: "Once Per Rest",
    effectType: "none",
    linkedStat: STR_INTIMIDATION,
    tag: "Warrior",
  },
  {
    id: "curse-of-weakness",
    name: "Curse of Weakness",
    description: "Enemies within 30 ft suffer disadvantage to all rolls for one turn.",
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
    description: "You call upon the god of power. A pillar of bronze fire consumes the field in a 30ft radius.",
    category: "Hero Abilities",
    effectType: "damage",
    effectRoll: "3d20",
  },
  {
    id: "world-shatter",
    name: "World-Shatter",
    description: "Slam the earth. It cracks outward. Anything standing within 20ft must roll a DEX check and falls prone on a failure.",
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
    description: "One perfect strike, meant for kings, gods, and monsters with no exceptions.",
    category: "Hero Abilities",
    effectType: "damage",
    effectRoll: "2d20+10",
  },
  {
    id: "chains-of-bronze",
    name: "Maltherion's Chains of Bronze",
    description: "Bronze links erupt from the ground, holding the target and burning them. They cannot act next turn.",
    category: "Hero Abilities",
    effectType: "damage",
    effectRoll: "1d20",
  },
  {
    id: "phoenix-rebirth",
    name: "Phoenix Rebirth",
    description: "The next time you would fall, rise instead at full HP.",
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
    description: "You point. The target is now marked and takes double damage. Forever.",
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
    description: "A voice like breaking mountains. All enemies flee for one turn.",
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
