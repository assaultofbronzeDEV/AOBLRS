import type { Ability, EffectType } from "@/src/types";
import { genId } from "@/src/types";

export type RuneOption = {
  id: string;
  name: string;
  glyph: string;
  meaning: string;
};

export const INTENT_RUNES: RuneOption[] = [
  { id: "pain", name: "Pain (Ar)", glyph: "A", meaning: "Harm the body or mind." },
  { id: "fear", name: "Fear (Bren)", glyph: "B", meaning: "Make the spirit falter." },
  { id: "health", name: "Health (Cor)", glyph: "C", meaning: "Restore vitality." },
  { id: "binding", name: "Binding (Dur)", glyph: "D", meaning: "Tether or confine." },
  { id: "strength", name: "Strength (Eth)", glyph: "E", meaning: "Fortify or empower." },
];

export const BEHAVIOUR_RUNES: RuneOption[] = [
  { id: "push", name: "Push (Fyr)", glyph: "F", meaning: "Drive forth or repel." },
  { id: "pull", name: "Pull (Girth)", glyph: "G", meaning: "Draw near or consume." },
  { id: "radiate", name: "Radiate (Huut)", glyph: "H", meaning: "Spread outward in widening circles." },
  { id: "calm", name: "Calm (Ikk)", glyph: "I", meaning: "Stabilize or soothe." },
  { id: "chaotic", name: "Chaotic (Faal)", glyph: "F", meaning: "Render unpredictable or wild." },
  { id: "destructive", name: "Destructive (Keth)", glyph: "K", meaning: "Break or annihilate." },
];

export const POWER_RUNES: RuneOption[] = [
  { id: "fury", name: "Fury (Lor)", glyph: "L", meaning: "Wrath and forceful anger." },
  { id: "vengeance", name: "Vengeance (Moor)", glyph: "M", meaning: "Retribution or a curse." },
  { id: "hatred", name: "Hatred (Nir)", glyph: "N", meaning: "Malice or mischief." },
  { id: "nurture", name: "Nurture (Onnt)", glyph: "O", meaning: "Care, protection, and sustaining force." },
  { id: "love", name: "Love (Pyr)", glyph: "P", meaning: "Empathy and connection." },
  { id: "will", name: "Will (Quen)", glyph: "Q", meaning: "Determination and resolve." },
];

export type SpellWheelSelection = {
  intent: string | null;
  behaviours: (string | null)[];
  powers: (string | null)[];
};

const potencyForCount = (count: number): string => {
  if (count <= 2) return "faint";
  if (count <= 4) return "steadied";
  if (count <= 6) return "potent";
  return "overwhelming";
};

const getRune = (runes: RuneOption[], id: string): RuneOption | undefined =>
  runes.find((rune) => rune.id === id);

const INTENT_SUBJECTS: Record<string, string> = {
  pain: "painful force",
  fear: "dread",
  health: "healing force",
  binding: "binding force",
  strength: "empowering force",
};

const INTENT_OUTCOMES: Record<string, string> = {
  pain: "A painful force strikes its chosen target.",
  fear: "A pulse of dread unsettles its chosen target.",
  health: "A healing force restores vitality to its chosen recipient.",
  binding: "A binding force restrains its chosen target.",
  strength: "An empowering force bolsters its chosen recipient.",
};

const BEHAVIOUR_MANIFESTATIONS: Record<string, Record<string, string>> = {
  pain: {
    push: "Painful energy surges outward from the caster and strikes its target.",
    pull: "Painful energy draws its target toward the caster before striking.",
    radiate: "Painful energy expands outward, striking targets around its point of release.",
    calm: "A controlled pulse of pain settles into its target, contained and deliberate.",
    chaotic: "Painful energy darts unpredictably between targets in its reach.",
    destructive: "A tearing surge of pain rends its target with destructive force.",
  },
  fear: {
    push: "Dread sweeps outward from the caster and washes over its target.",
    pull: "A menacing presence draws its target toward the source of the spell.",
    radiate: "A spreading wave of dread unsettles those around its point of release.",
    calm: "A quiet, insidious dread settles over its target.",
    chaotic: "Jarring flashes of dread strike unpredictably across the spell's reach.",
    destructive: "An overwhelming terror crashes into its target and shatters their composure.",
  },
  health: {
    push: "Healing energy surges outward from the caster, carrying restoration to its chosen recipient.",
    pull: "Restorative energy gathers inward around its chosen recipient, drawing them toward its source.",
    radiate: "A widening wave of healing energy restores those around its point of release.",
    calm: "A gentle, steady warmth soothes and restores its chosen recipient.",
    chaotic: "Restorative energy surges unpredictably, mending whoever it reaches.",
    destructive: "A forceful burst of healing breaks through harm and restores its chosen recipient.",
  },
  binding: {
    push: "Bindings surge outward from the caster and close around their target.",
    pull: "Bindings draw their target toward the source and hold them there.",
    radiate: "Bindings spread outward, encircling targets around their point of release.",
    calm: "A steady binding settles around its target and holds them firmly in place.",
    chaotic: "Shifting bindings lash unpredictably around targets in their reach.",
    destructive: "Crushing bindings wrench shut around their target and deny escape.",
  },
  strength: {
    push: "Empowering energy surges outward from the caster and bolsters its chosen recipient.",
    pull: "Strength gathers inward around its chosen recipient, drawing power into them.",
    radiate: "A widening surge of strength bolsters those around its point of release.",
    calm: "A measured flow of strength steadies and fortifies its chosen recipient.",
    chaotic: "Unpredictable surges of strength empower whoever they reach.",
    destructive: "A forceful surge of strength breaks through restraint and empowers its chosen recipient.",
  },
};

const POWER_TONES: Record<string, string> = {
  fury: "fierce and wrathful",
  vengeance: "retributive",
  hatred: "dark and malicious",
  nurture: "protective and sustaining",
  love: "compassionate and connected",
  will: "resolute and unwavering",
};

function describeRunicEffect(
  intentId: string,
  behaviours: { rune: string; position: number }[],
  powers: { rune: string; position: number }[],
): string {
  const manifestations = behaviours
    .map(({ rune }) => BEHAVIOUR_MANIFESTATIONS[intentId]?.[rune])
    .filter((manifestation): manifestation is string => !!manifestation);
  const effect = manifestations.length
    ? manifestations.join(" ")
    : INTENT_OUTCOMES[intentId] ?? "The spell manifests its Intent.";
  const tones = powers
    .map(({ rune }) => POWER_TONES[rune])
    .filter((tone): tone is string => !!tone);

  if (tones.length === 0) return effect;
  const subject = INTENT_SUBJECTS[intentId] ?? "spell";
  const tone = [...new Set(tones)].join(" and ");
  return `${effect} Its ${subject} is imbued with ${tone} power.`;
}

export function buildRunicSpell(selection: SpellWheelSelection): Ability | null {
  if (!selection.intent) return null;
  const intent = getRune(INTENT_RUNES, selection.intent);
  if (!intent) return null;

  const behaviours = selection.behaviours
    .map((rune, position) => (rune ? { rune, position } : null))
    .filter((entry): entry is { rune: string; position: number } => entry != null);
  const powers = selection.powers
    .map((rune, position) => (rune ? { rune, position } : null))
    .filter((entry): entry is { rune: string; position: number } => entry != null);
  const runeCount = 1 + behaviours.length + powers.length;
  const frequency = runeCount <= 4 ? "oncePerTurn" : "oncePerRest";
  const effectType: EffectType =
    selection.intent === "pain" ? "damage" : selection.intent === "health" ? "healing" : "none";
  const behaviourRunes = behaviours
    .map(({ rune, position }) => {
      const option = getRune(BEHAVIOUR_RUNES, rune);
      return option ? { ...option, position } : null;
    })
    .filter((rune): rune is RuneOption & { position: number } => rune != null);
  const powerRunes = powers
    .map(({ rune, position }) => {
      const option = getRune(POWER_RUNES, rune);
      return option ? { ...option, position } : null;
    })
    .filter((rune): rune is RuneOption & { position: number } => rune != null);
  const resonantPowerIds = selection.intent === "pain"
    ? ["fury", "vengeance", "hatred"]
    : selection.intent === "health"
      ? ["nurture", "love"]
      : [];
  const resonanceBonus =
    powers.filter(({ rune }) => resonantPowerIds.includes(rune)).length +
    (selection.intent === "pain" ? behaviours.filter(({ rune }) => rune === "destructive").length : 0);
  const effectRoll =
    effectType === "none"
      ? ""
      : `${runeCount}d4${resonanceBonus ? `+${resonanceBonus}` : ""}`;
  const nameParts = [
    intent.name.split(" (")[0],
    ...behaviourRunes.map((rune) => rune.name.split(" (")[0]),
    ...powerRunes.map((rune) => rune.name.split(" (")[0]),
  ];
  const result = describeRunicEffect(selection.intent, behaviours, powers);
  const effectSummary =
    effectType === "damage"
      ? `Deals ${effectRoll} damage. ${result}`
      : effectType === "healing"
        ? `Restores ${effectRoll} health. ${result}`
        : result;
  const layout = [
    `Intent: ${intent.name}`,
    behaviourRunes.length
      ? `Behaviour clockwise: ${behaviourRunes.map((rune) => `${rune.position + 1}. ${rune.name}`).join(" → ")}`
      : "Behaviour: none",
    powerRunes.length
      ? `Power clockwise: ${powerRunes.map((rune) => `${rune.position + 1}. ${rune.name}`).join(" → ")}`
      : "Power: none",
  ];
  const frequencyLabel = frequency === "oncePerTurn" ? "Once Per Turn" : "Once Per Rest";

  return {
    id: genId(),
    title: nameParts.join(" · "),
    description: [
      effectSummary,
      `Runic potency: ${potencyForCount(runeCount)}.`,
      ...(resonanceBonus > 0
        ? [`Matching runes add +${resonanceBonus} to the effect roll.`]
        : []),
      `${frequencyLabel} · ${runeCount} rune${runeCount === 1 ? "" : "s"} total.`,
      ...layout,
    ].join("\n"),
    effectRoll,
    effectType,
    used: false,
    runicSpell: {
      intent: selection.intent,
      behaviours,
      powers,
      runeCount,
      frequency,
    },
  };
}
