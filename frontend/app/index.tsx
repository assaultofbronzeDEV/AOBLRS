import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  KeyboardAvoidingView,
  Platform,
  Switch,
  SectionList,
  RefreshControl,
  Modal,
  Image,
  ScrollView,
  TextInput,
  Animated,
} from "react-native";
import { PanGestureHandler, PinchGestureHandler, State } from "react-native-gesture-handler";
import { useRouter, useFocusEffect, useLocalSearchParams } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import * as ScreenOrientation from "expo-screen-orientation";

import AsyncStorage from "@react-native-async-storage/async-storage";

import Icon from "@react-native-vector-icons/material-design-icons";

import { fonts, setThemeAge, setThemeMode, useTheme } from "@/src/theme";

import { Character, RollHistoryEntry } from "@/src/types";

import { deleteCharacter, loadAllCharacters, upsertCharacter } from "@/src/storage/characters";

import { genId } from "@/src/types";

import DiceRollModal, { RollRequest } from "@/src/components/DiceRollModal";
import ExportSheetModal from "@/src/components/ExportSheetModal";
import ImportSheetModal from "@/src/components/ImportSheetModal";

import { partyManager } from "@/src/party/PartyManager";

import { usePartyState } from "@/src/party/usePartyState";
import { AGE_DEFINITIONS, AgeId, DEFAULT_AGE_ID } from "@/src/ages";

const HELP_TABS = [
  {
    key: "overview",
    label: "Overview",
    title: "Assault of Bronze",
    body: "Welcome to Assault of Bronze, a lightweight, narrative-first roleplay system built with one priority in mind: accessibility. Whether you're a first-time adventurer or a seasoned Game Master, AoB is designed to be intuitive, flexible, and fast-paced, putting the focus on storytelling, decision-making, and character immersion rather than constant rule-checking. With a streamlined dice system, stat-based action resolution, and easy-to-learn mechanics, AoB makes jumping into the game world quick and seamless.\n\nWith minimal math, clear success/fail mechanics, and storytelling at its core, Assault of Bronze empowers players and GMs alike to focus on what matters most - fun, creativity, and epic storytelling.\n\nThis help window will walk you through the core components of the system, from Character Creation, to Dice and Combat Mechanics, Special Abilities and the importance of Logical Roleplay. You'll begin by building a character identity through race, class, and unique abilities. This help panel covers how to handle ability checks, how combat flows without constant reference to DCs and you will soon discover that this app was built with absolute ease of use in mind.\n\nI truly believe that this is a capable tool and game system that can be used widely and easily over a wide variety of settings and genres, I sincerely hope you enjoy.\n\n- Jordan - creator of AOBLRS.",
  },
  {
    key: "dice",
    label: "Stats and Dice Mechanics",
    title: "Stats and Dice",
    body: `STAT CHECKS

Stat checks do not work like typical D&D rules in the AoB system. The stats on the Character Sheet equal the number you have to roll or higher with a D20 to succeed at any task. The lower the number in a stat, the better you are at that skill and the more often the character will succeed.

Whenever players take an important action, the GM determines which skill the character is using. The player rolls against the corresponding stat on the Character Sheet. If the player passes the check, the character succeeds to the best of their ability: a quick, easy yes or no answer without DCs to reference.

If the GM decides the method described by the player will not work as stated, the GM may set a higher target. This is known as a "Challenge Stat". For example, lifting a 1000kg boulder might require a roll of 50 or higher. The character could get help from other Player Characters or NPCs, who would all roll their strength checks, with each successful check their total die number rolled is added to the challenge pool; if the combined result reaches 50 or more, the group lifts the boulder.

CRITICAL SUCCESSES AND FAILURES

A natural 20 on a D20 during a stat check is the best possible outcome. In combat, it gives the player a full extra turn immediately, including movement, one action, and a bonus action. This is a Critical Success.

A natural 1 on a D20 during a stat check is the worst possible outcome and typically results in damage during combat. This is a Critical Failure. The GM decides whether the damage comes from a consequence or an extra attack by a creature.

MODIFIERS

Modifiers are typically added to damage rolls based on the weapon used. A basic dagger might deal 1D4 damage, while a better dagger might deal 1D4+5. The modifier guarantees at least 5 damage on every successful ATK roll.

Modifiers are never added to stat rolls. Instead, use Advantage or Disadvantage:

ADV: Roll 2D20 and take the highest number.

DISADV: Roll 2D20 and take the lowest number.

THE HERO DIE

During any stat check, the player performing the roll may spend 1 hero point to add an additional D6 to the result. This die can be rolled during or after the initial D20 roll.`,
  },
  {
    key: "logical-roleplay",
    label: "Logical Roleplay",
    title: "Logical Roleplay",
    body: `Logical roleplay means every decision in the game, whether resolving an action, determining consequences, or handling an unexpected event, should be grounded in reasonable logic. If the rules directly cover the situation, follow them. If there is no specific rule, apply the spirit of the system and use the stat or skill that best fits the action.

Match actions to the most appropriate stat or skill on the sheet, rather than whichever roll is convenient. When a player tries something, the GM should choose the stat that most accurately represents that ability: use Ranged Attack for shooting, First Aid for patching a wound, and Vitality for shrugging off toxins. This keeps outcomes believable and the game internally consistent.

The stats on the AoB character sheet are intentionally broad. They are shorthand for a character's general capabilities across any genre or setting. Treat each stat as a wide umbrella for many situations, not a checkbox for one specific stunt.

When an unforeseen situation does not fit neatly into a stat, apply common sense. Briefly discuss which existing skill is the closest fit and agree on it. If the table cannot reach consensus, the GM should make a prompt ruling so play continues. The goal is to keep players invested in the unfolding story rather than stalling over skill-check debates. Quick, reasonable decisions preserve pace and fun.

Debates can be revisited after the game, and not all debates are a problem. Let players debate where to go or whom to trust when they are immersed in the story; avoid arguments over game rules that pull the table away from the unfolding narrative.`,
  },
  {
    key: "combat",
    label: "Combat",
    title: "Rolling in a fight",
    body: `COMBAT

Combat typically begins with the enemies' first attack unless the players perform a sneak attack. On that first attack, players may make a DEX save to dodge it.

INITIATIVE

Initiative decides who acts when during combat. At the start of a fight, everyone rolls a d20 to figure out turn order. Players, enemies, and NPCs act from the highest roll to the lowest. If the enemy attacked first, its initiative is 20; if it was sneaked upon, its initiative is 0. For identical creatures such as a pack of drones or guards, the GM rolls once for the entire group and they act on the same turn.

During combat, players may take one action, such as a once-per-turn or once-per-rest ability, move, and take a bonus action such as drinking a potion, pressing a button, or pulling a lever. These can be performed in any order. Some targets have stronger armour or defensive abilities at higher levels to balance a higher-level party's improved ATK checks.

WEAPONS AND DAMAGE

To damage an enemy, a player may need to roll a d20 based on their attack. They can use a once-per-turn action, a once-per-rest action, or a Melee ATK or Ranged ATK stat roll with a weapon they possess. Weapon modifiers are typically added to damage rolls: a basic dagger might deal 1d4, while a better dagger might deal 1d4+5. The +5 guarantees at least 5 damage on every successful ATK roll.

Modifiers are never added to stat rolls. Instead, use Advantage or Disadvantage. See Dice and Stat Checks for more detail, and Weapon Table for a premade weapon list.

ARMOUR

Armour is a flat number subtracted from any damage a hero or enemy takes.  You don't roll for it, and it works the same on every hit, no matter the source. The only exception is when the attacking weapon or effect specifically says it ignores armour (for example, an "IGNORES ARMOUR" weapon note); in that case the full damage goes through untouched.

REMEMBER THE HERO DIE

During any stat check, the player rolling may spend 1 hero point to add an additional d6 to the result. This die can be rolled during or after the initial d20 roll. See Hero Points for more detail.

HEALTH CONDITIONS

When slashed or cut, a character is bleeding unless first aid is successfully applied. They take 1 damage regardless of armour every 5 real-time minutes, or at the GM's discretion.

When poisoned, a character must make a Vitality save each turn unless first aid is successfully applied. On a failure, they take 2 damage regardless of armour. Each poison type requires a different number of successful Vitality saves to wear off.

DEATH

If a player character reaches 0 HP, they are unconscious. They must achieve three Vitality-save successes before three failures, or they die.

Combat ends when the last enemy is defeated or surrenders. Remove the initiative order and return to standard roleplay rules.`,
  },
  {
    key: "creation",
    label: "Creation",
    title: "Creating characters",
    body: `HEROES AND ENEMIES

From the main screen, tap the create button to start a new Hero or Enemy. Easy Creation walks you through a profile, guided stat rolls, and lineage/class assignment, this is the fastest way to get playing. Custom Creation opens a blank sheet so you can hand-enter every stat, name, and detail yourself, useful for converting an existing character or building something the guided flow doesn't cover.

Either way, you end up on the same full character sheet afterward, so nothing is locked in by the mode you picked. You can keep adjusting stats, portrait, lineage, and class at any time.

WEAPONS, ITEMS, AND ABILITIES ARE JUST A STARTING POINT

Every weapon, item, and ability picker (opened from the + buttons on a character sheet) shows a library of premade options grouped by category. These presets exist to get you moving quickly, not to box you in. At the top of every picker is a "Create custom weapon / item / ability" button. Use it to build your own gear and powers from scratch with your own name, damage dice, effects, and notes.

Don't hesitate to reskin or completely reinvent a preset: duplicate its stats under a new name, tweak the damage die, or invent an ability that fits your character's story better than anything in the list. The presets are a springboard, not the rulebook.

SAVE YOUR HOMEBREW WITH EXPORT

Once you've built custom weapons, items, or abilities on a sheet, use the export icon (top right of a character sheet, or the export action on a row in the main list) to save that hero or enemy out as a shareable sheet file. This is the best way to preserve your homebrew creations. Export a finished character so you always have a backup, and import it back in (or share it with another player) whenever you need it. Duplicate a sheet first if you want to experiment without touching the original.`,
  },
  {
    key: "party",
    label: "Party",
    title: "Offline mode",
    body: "This build keeps all game data on this device. Party rooms and backend synchronization are disabled.",
  },
] as const;

const LORE_TABS = [
  {
    key: "overview",
    label: "Overview",
    title: "Aryndos and its changing ages",
    body: `Aryndos is a continent shaped by nature, ambition, and the sudden arrival of Magic from an event known as "Khaliik's Emergence". It is believed that the god known as Khaliik blessed Aryndos with his power that day. Aryndos' history moves from an uncertain early age, through the discovery of Khaliik's power - later known as Power-Stones, to the division between human kingdoms and the Magi Lands.

These stories are foundations for your own games, not limits. Use the gaps in the records to invent lost kingdoms, forgotten rituals, rival interpretations, and characters who stand at the turning points of history. A campaign might follow explorers seeking the truth of the Power-Stones, villagers living in the Borderlands, dealing with increasingly dangerous threats from the Federation, or heroes who discover that the old stories are incomplete.`,
    imageBlocks: [
      { after: "Aryndos is a continent shaped by nature, ambition, and the sudden arrival of Magic", source: require("@/assets/images/Aryndos map.png") },
    ],
  },
  {
    key: "early-ages",
    label: "Early Ages",
    title: "The Early Ages",
    body: `The earliest recordings date to approximately 1,000 years before the Wall was built. The Early Ages were scarcely recorded, so they appear quiet, but the surviving records are incomplete.

Aryndos thrived in harmony with nature for thousands of years. Humans, Orcs, Elves, Dwarves, and other peoples clashed from time to time, often fighting over territory and power. Of them all, the humans became the most prosperous.

As human society grew more complex, humans expanded their claim across the land, deforesting it and pushing forest-dwelling peoples farther west. One of the strangest reports from this period concerns Maltherion, the Skinwalker, an apparently unkillable shapeshifter who caused havoc across the continent. No record explains what Maltherion was, where it came from, or what it truly wanted.`,
  },
  {
    key: "age-of-magic",
    label: "The Age of Magic",
    title: "The Age of Magic",
    body: `The Age of Magic began approximately 500 years before the Wall was built (). It began when the entity known as Khaliik scattered the Power Stones across the solar system, literally summoning Magic into existence.

The forest-dwelling peoples of Aryndos benefited most. Elves quickly mastered many uses of Magic and enlisted Dwarves to mine for more stones. Only the Elves knew the proper rituals for harvesting them. Without those rituals, a Power Stone could bleed and become unstable.

Humans paid little attention to the Power Stones or the godlike entity that had changed their world. They focused instead on expansion, building, and mining. Their colonies eventually united into a nation in the eastern half of the continent.`,
  },
  {
    key: "age-of-war",
    label: "The Age of War",
    title: "The Age of War",
    body: `The Age of War began when a trifecta of intense magical energy was performed. Magical balance was permanently shaken and a prophecy was set in motion.

The Humans, after years of technological advancement due to the discovery of the Power Stones and the subsequent invention of the Power-Harness, finally had the upper hand.

Weapons that the Magi would never have even considered possible were invented and the march to the Wall began. The Humans wanted more land, and thought that the Wall had stood in place for far too long.

Through the torture of many Dwarves, the Humans now knew that they could access the Wall using the Dwarven tunnels that ran underneath the entire length of the Wall.

While the battle took place, the human commander, ARCHIBALD STELLARK, used a device to bleed the line of pure Power-Stone that ran along the Wall, permanently damaging it, breaking the elven enchantment that Niirmata had sacrificed his life for centuries before, and unleashing all manner of curses onto the tunnel due to years of corrupted Power-Stone energy.

Once the underground attack was complete, the Humans crossed the Wall and the Age of War began.`,
  },
  {
    key: "the-wall",
    label: "The Wall",
    title: "Niirmata and the Wall",
    body: `Around 400 years after the Age of Magic began, the Elven leader Niirmata grew alarmed by the rapid human expansion into central Aryndos. Niirmata built the Wall alone, it was an underwhelming sight: a 4-foot-tall stone barrier spanning from the northernmost point of the western continent to the southernmost point.

Niirmata placed a line of pure Power Stones beneath its entire length. After the Wall was completed, Niirmata performed a powerful spell, sacrificing his own life and that of his human lover to ensure that no human could cross the barrier.

Unable to understand the magic preventing them from crossing the seemingly insignificant structure, humans expanded farther east. They eventually covered the entire eastern side of the continent, and the threat of expansion into Magi territory was halted for another two centuries.`,
    imageBlocks: [
      { after: "Niirmata placed a line of pure Power Stones beneath its entire length.", source: require("@/assets/images/Aryndos map Political divide.png") },
    ],
  },
  {
    key: "power-stones",
    label: "Power-Stones",
    title: "Power-Stones",
    body: `In the Assault of Bronze universe, old magic used ingredients until the Power-Stones were introduced to the world. It was a day of reckoning: a meteor shower unlike any other. The power these stones held was second to none.

Power-Stones are the most powerful magical conduits when harvested and used in their pure form. The elves quickly became adept at making jewellery, wands, staffs, and other items with Power-Stones inside them, allowing the casting of spells without ingredients or the need to draw from one's own lifeforce.

All spellcasters must have some sort of magical conduit to perform spells in AOB lore.

In later ages, approximately 500 years after the Age of Magic, the Power-Stones eventually set off an arms race and a space race that would decimate the planet of Aryndos entirely.`,
  },
  {
    key: "map",
    label: "Map",
    title: "Aryndos Map Explorer",
    body: "Use pinch and drag gestures to zoom in and explore the full Aryndos continent map.",
  },
] as const;

function LoreMapExplorer({ colors }: { colors: ReturnType<typeof useTheme>["colors"] }) {
  const [zoom, setZoom] = React.useState(1);
  const [offset, setOffset] = React.useState({ x: 0, y: 0 });

  const clampZoom = (next: number) => Math.min(3, Math.max(1, next));
  const clampOffset = (value: number, limit: number) => Math.min(limit, Math.max(-limit, value));

  const zoomIn = () => setZoom((current) => clampZoom(current + 0.35));
  const zoomOut = () => setZoom((current) => clampZoom(current - 0.35));

  const moveMap = (dx: number, dy: number) => {
    if (zoom <= 1) return;
    setOffset((current) => ({
      x: clampOffset(current.x + dx, 120 * zoom),
      y: clampOffset(current.y + dy, 120 * zoom),
    }));
  };

  const resetMap = () => {
    setZoom(1);
    setOffset({ x: 0, y: 0 });
  };

  return (
    <View style={styles.mapExplorerContainer}>
      <Text style={[styles.helpSectionTitle, { color: colors.onSurface, fontFamily: fonts.displayBold }]}>Aryndos Map Explorer</Text>
      <Text style={[styles.helpText, { color: colors.onSurface, fontFamily: fonts.body }]}>Use the zoom buttons and direction controls to inspect the map.</Text>

      <View style={styles.mapControlRow}>
        <Pressable onPress={zoomOut} style={[styles.mapControlButton, { borderColor: colors.borderStrong, backgroundColor: colors.surfaceSecondary }]}>
          <Text style={[styles.mapControlText, { color: colors.onSurface, fontFamily: fonts.displayBold }]}>-</Text>
        </Pressable>
        <Pressable onPress={zoomIn} style={[styles.mapControlButton, { borderColor: colors.borderStrong, backgroundColor: colors.surfaceSecondary }]}>
          <Text style={[styles.mapControlText, { color: colors.onSurface, fontFamily: fonts.displayBold }]}>+</Text>
        </Pressable>
        <Pressable onPress={resetMap} style={[styles.mapResetButton, { borderColor: colors.borderStrong, backgroundColor: colors.surfaceSecondary }]}>
          <Text style={[styles.mapControlText, { color: colors.onSurface, fontFamily: fonts.displayBold }]}>Reset</Text>
        </Pressable>
      </View>

      <View style={styles.mapZoomContainer}>
        <View style={styles.mapZoomContent}>
          <Image
            source={require("@/assets/images/Aryndos map.png")}
            style={[
              styles.mapDetailImage,
              {
                transform: [{ scale: zoom }, { translateX: offset.x }, { translateY: offset.y }],
              },
            ]}
            resizeMode="contain"
          />
        </View>

        <View style={styles.compassPanel}>
          <View style={styles.dPadRow}>
            <Pressable onPress={() => moveMap(0, 30)} style={[styles.dPadButton, { borderColor: colors.borderStrong, backgroundColor: "rgba(14,18,22,0.82)" }]} accessibilityLabel="Pan north">
              <Icon name="chevron-up" size={26} color="#F2F4F7" />
            </Pressable>
          </View>
          <View style={styles.dPadMiddleRow}>
            <Pressable onPress={() => moveMap(30, 0)} style={[styles.dPadButton, { borderColor: colors.borderStrong, backgroundColor: "rgba(14,18,22,0.82)" }]} accessibilityLabel="Pan west">
              <Icon name="chevron-left" size={26} color="#F2F4F7" />
            </Pressable>
            <View style={[styles.dPadCenter, { borderColor: colors.borderStrong, backgroundColor: colors.brandPrimary }]} pointerEvents="none">
              <Icon name="crosshairs-gps" size={18} color={colors.onBrandPrimary} />
            </View>
            <Pressable onPress={() => moveMap(-30, 0)} style={[styles.dPadButton, { borderColor: colors.borderStrong, backgroundColor: "rgba(14,18,22,0.82)" }]} accessibilityLabel="Pan east">
              <Icon name="chevron-right" size={26} color="#F2F4F7" />
            </Pressable>
          </View>
          <View style={styles.dPadRow}>
            <Pressable onPress={() => moveMap(0, -30)} style={[styles.dPadButton, { borderColor: colors.borderStrong, backgroundColor: "rgba(14,18,22,0.82)" }]} accessibilityLabel="Pan south">
              <Icon name="chevron-down" size={26} color="#F2F4F7" />
            </Pressable>
          </View>
        </View>
      </View>
    </View>
  );
}

const ROTATION_PREFERENCE_KEY = "aob:allow-tablet-rotation";
const ACTIVE_AGE_KEY = "aob:active-age";

type PartyRollEntry = RollHistoryEntry & { characterId: string; characterName: string };
type PartyRollGroup = { key: string; timestamp: string; entries: PartyRollEntry[] };

function rollHistoryGroup(iso: string): string {
  const date = new Date(iso);
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);
  if (date.toDateString() === today.toDateString()) return "Today";
  if (date.toDateString() === yesterday.toDateString()) return "Yesterday";
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function rollHistoryTime(iso: string): string {
  return new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function rollHistoryTimestamp(iso: string): string {
  return `${rollHistoryGroup(iso)} ${rollHistoryTime(iso)}`;
}

export default function CharacterListScreen() {
  const { colors, mode } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { panel, returnTo, age } = useLocalSearchParams<{ panel?: "help" | "lore" | "gm"; returnTo?: string; age?: string }>();
  const party = usePartyState();
  const [characters, setCharacters] = useState<Character[]>([]);
  const [loading, setLoading] = useState(true);
  const [pendingDelete, setPendingDelete] = useState<Character | null>(null);
  const [heroesCollapsed, setHeroesCollapsed] = useState(false);
  const [monstersCollapsed, setMonstersCollapsed] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const [helpMode, setHelpMode] = useState<"help" | "lore">("help");
  const [helpTab, setHelpTab] = useState<(typeof HELP_TABS)[number]["key"]>("overview");
  const [loreTab, setLoreTab] = useState<(typeof LORE_TABS)[number]["key"]>("overview");
  const [helpTabMenuOpen, setHelpTabMenuOpen] = useState(false);
  const [rotationEnabled, setRotationEnabled] = useState(true);
  const [serverCreating, setServerCreating] = useState(false);
  const [serverInfo, setServerInfo] = useState<{ room_code: string } | null>(null);
  const [serverError, setServerError] = useState<string | null>(null);
  const [joinCode, setJoinCode] = useState("");
  const [joinedRoom, setJoinedRoom] = useState<string | null>(null);
  const [sharedHeroes, setSharedHeroes] = useState<Character[]>([]);
  const [selectedSharedHeroId, setSelectedSharedHeroId] = useState<string | null>(null);
  const selectedSharedHero = useMemo(
    () => sharedHeroes.find((hero) => hero.id === selectedSharedHeroId) ?? null,
    [sharedHeroes, selectedSharedHeroId],
  );
  const [gmToolsOpen, setGmToolsOpen] = useState(false);
  const [gmRoll, setGmRoll] = useState<RollRequest | null>(null);
  const [gmNotation, setGmNotation] = useState("");
  const [gmDamage, setGmDamage] = useState("");
  const [initiative, setInitiative] = useState<{ id: string; order: string }[]>([]);
  const [turnIndex, setTurnIndex] = useState(0);
  const [availableCombatantsCollapsed, setAvailableCombatantsCollapsed] = useState(false);
  const [partyCombatantsCollapsed, setPartyCombatantsCollapsed] = useState(false);
  const [rollNotes, setRollNotes] = useState<Record<string, string>>({});
  const [collapsedRollHistoryGroups, setCollapsedRollHistoryGroups] = useState<Record<string, boolean>>({});
  const [groupLabels, setGroupLabels] = useState<Record<string, string>>({});
  const [renamingGroupKey, setRenamingGroupKey] = useState<string | null>(null);
  const [exportTarget, setExportTarget] = useState<Character | null>(null);
  const [exportAllOpen, setExportAllOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [activeAge, setActiveAge] = useState<AgeId>(DEFAULT_AGE_ID);

  useEffect(() => {
    if (panel === "help") {
      setHelpMode("help");
      setHelpOpen(true);
    } else if (panel === "lore") {
      setHelpMode("lore");
      setLoreTab("overview");
      setHelpOpen(true);
    } else if (panel === "gm") {
      setGmToolsOpen(true);
    }
  }, [panel]);

  useEffect(() => {
    setSharedHeroes(party.sharedHeroes);
    setJoinedRoom(party.roomCode);
    setRollNotes(party.rollNotes);
    if (party.roomCode) setServerInfo({ room_code: party.roomCode });
    if (party.error) setServerError(party.error);
  }, [party]);

  useEffect(() => {
    partyManager.updateMyCharacters(characters);
  }, [characters]);

  useEffect(() => {
    AsyncStorage.getItem(ACTIVE_AGE_KEY).then((value) => {
      if (value === "age-of-war" || value === "age-of-magic") setActiveAge(value);
    });
  }, []);

  useEffect(() => {
    setThemeAge(activeAge);
  }, [activeAge]);

  const cycleTheme = () => {
    setThemeMode(mode === "dark" ? "light" : "dark");
  };

  const refresh = useCallback(async () => {
    const list = await loadAllCharacters(activeAge);
    setCharacters(list);
    setLoading(false);
  }, [activeAge]);

  useFocusEffect(useCallback(() => { refresh(); }, [refresh]));
  useEffect(() => { refresh(); }, [refresh]);

  useEffect(() => {
    AsyncStorage.getItem(ROTATION_PREFERENCE_KEY).then((value) => {
      if (value != null) setRotationEnabled(value === "true");
    });
  }, []);

  useEffect(() => {
    ScreenOrientation.lockAsync(
      rotationEnabled ? ScreenOrientation.OrientationLock.ALL : ScreenOrientation.OrientationLock.PORTRAIT_UP,
    ).catch(() => undefined);
  }, [rotationEnabled]);

  const setRotationPreference = (enabled: boolean) => {
    setRotationEnabled(enabled);
    AsyncStorage.setItem(ROTATION_PREFERENCE_KEY, String(enabled)).catch(() => undefined);
  };

  const createHero = () => {
    router.push(`/create-hero?age=${activeAge}`);
  };
  const createMonster = () => router.push(`/create-hero?kind=monster&age=${activeAge}`);

  const changeAge = (direction: -1 | 1) => {
    const currentIndex = AGE_DEFINITIONS.findIndex((age) => age.id === activeAge);
    const nextAge = AGE_DEFINITIONS[(currentIndex + direction + AGE_DEFINITIONS.length) % AGE_DEFINITIONS.length];
    setActiveAge(nextAge.id);
    setLoading(true);
    AsyncStorage.setItem(ACTIVE_AGE_KEY, nextAge.id).catch(() => undefined);
  };

  const confirmDelete = (c: Character) => setPendingDelete(c);
  const performDelete = async () => {
    if (!pendingDelete) return;
    const next = await deleteCharacter(pendingDelete.id, activeAge);
    setCharacters(next);
    setPendingDelete(null);
  };

  const duplicateCharacter = async (character: Character) => {
    const now = new Date().toISOString();
    const baseName = (character.name || "Unnamed").replace(/\s\d+$/, "");
    const existingNames = new Set(characters.map((c) => c.name));
    let n = 1;
    while (existingNames.has(`${baseName} ${n}`)) n++;
    const copy: Character = {
      ...JSON.parse(JSON.stringify(character)),
      id: genId(),
      name: `${baseName} ${n}`,
      createdAt: now,
      updatedAt: now,
      oncePerTurn: character.oncePerTurn.map((ability) => ({ ...ability, id: genId() })),
      oncePerRest: character.oncePerRest.map((ability) => ({ ...ability, id: genId() })),
      heroAbilities: character.heroAbilities.map((ability) => ({ ...ability, id: genId() })),
      inventoryItems: character.inventoryItems.map((item) => ({ ...item, id: genId() })),
      customSections: character.customSections.map((section) => ({ ...section, id: genId() })),
      weapons: character.weapons.map((weapon) => ({ ...weapon, id: genId() })),
    };
    const next = await upsertCharacter(copy, activeAge);
    setCharacters(next);
  };

  const sections = useMemo(() => {
    const heroes = characters.filter((c) => c.kind !== "monster");
    const monsters = characters.filter((c) => c.kind === "monster");
    return [
      {
        title: "Heroes",
        key: "hero" as const,
        total: heroes.length,
        collapsed: heroesCollapsed,
        data: heroesCollapsed ? [] : heroes,
      },
      {
        title: "Enemies",
        key: "monster" as const,
        total: monsters.length,
        collapsed: monstersCollapsed,
        data: monstersCollapsed ? [] : monsters,
      },
    ];
  }, [characters, heroesCollapsed, monstersCollapsed]);

  const toggleSection = (key: "hero" | "monster") => {
    if (key === "hero") setHeroesCollapsed((c) => !c);
    else setMonstersCollapsed((c) => !c);
  };

  const availableCombatants = useMemo(() => {
    const byId = new Map<string, Character>();
    characters.forEach((character) => byId.set(character.id, character));
    return [...byId.values()];
  }, [characters]);

  const allCombatants = useMemo(() => {
    const byId = new Map<string, Character>();
    [...characters, ...sharedHeroes].forEach((character) => byId.set(character.id, character));
    return [...byId.values()];
  }, [characters, sharedHeroes]);

  const partyRollHistory = useMemo(() => {
    const members = joinedRoom ? sharedHeroes : characters.filter((character) => character.kind !== "monster");
    return members
      .flatMap((character) =>
        character.rollHistory.map((entry) => ({
          ...entry,
          characterId: character.id,
          characterName: character.name || "Unnamed hero",
        })),
      )
      .sort((first, second) => new Date(second.at).getTime() - new Date(first.at).getTime());
  }, [characters, joinedRoom, sharedHeroes]);

  const partyRollGroups = useMemo(() => {
    const fiveMinutes = 5 * 60 * 1000;
    return partyRollHistory.reduce<PartyRollGroup[]>((groups, entry) => {
      const currentGroup = groups[groups.length - 1];
      if (!currentGroup || new Date(currentGroup.timestamp).getTime() - new Date(entry.at).getTime() > fiveMinutes) {
        groups.push({ key: `${entry.characterId}:${entry.id}`, timestamp: entry.at, entries: [entry] });
      } else {
        currentGroup.entries.push(entry);
      }
      return groups;
    }, []);
  }, [partyRollHistory]);

  const initiativeRows = initiative
    .map((entry) => ({ ...entry, combatant: allCombatants.find((character) => character.id === entry.id) }))
    .filter((entry): entry is typeof entry & { combatant: Character } => entry.combatant != null)
    .sort((a, b) => Number(b.order) - Number(a.order));

  const addToInitiative = (combatant: Character) => {
    if (initiative.some((entry) => entry.id === combatant.id)) return;
    setInitiative((current) => [...current, { id: combatant.id, order: "0" }]);
  };

  const addAllToInitiative = (combatants: Character[]) => {
    setInitiative((current) => {
      const existingIds = new Set(current.map((entry) => entry.id));
      const additions = combatants
        .filter((combatant) => !existingIds.has(combatant.id))
        .map((combatant) => ({ id: combatant.id, order: "0" }));
      return [...current, ...additions];
    });
  };

  const updateInitiativeOrder = (id: string, order: string) => {
    setInitiative((current) => current.map((entry) => (entry.id === id ? { ...entry, order } : entry)));
  };

  const removeFromInitiative = (id: string) => {
    setInitiative((current) => current.filter((entry) => entry.id !== id));
    setTurnIndex((current) => Math.max(0, current - 1));
  };

  const nextTurn = () => {
    if (initiativeRows.length > 0) setTurnIndex((current) => (current + 1) % initiativeRows.length);
  };

  const openCombatantSheet = (combatant: Character) => {
    setGmToolsOpen(false);
    if (sharedHeroes.some((hero) => hero.id === combatant.id)) {
      setSelectedSharedHeroId(combatant.id);
      return;
    }
    router.push(`/character/${combatant.id}?age=${activeAge}`);
  };

  const closeHeaderPanel = () => {
    setHelpOpen(false);
    setGmToolsOpen(false);
    if (!returnTo) return;
    const returnAge: AgeId = age === "age-of-war" ? "age-of-war" : DEFAULT_AGE_ID;
    router.replace({ pathname: "/character/[id]", params: { id: returnTo, age: returnAge } });
  };

  const quickRoll = (notation: string, damage?: string) => {
    const cleanNotation = notation.trim() || "1d20";
    setGmRoll({
      label: damage?.trim() ? `GM Roll · ${cleanNotation} + ${damage.trim()}` : "GM Roll",
      effect: { notation: cleanNotation, type: "damage" },
      resultLabel: damage?.trim() ? undefined : "YOU ROLLED",
    });
  };

  const createLanServer = async () => {
    setServerCreating(true);
    setServerError(null);
    await partyManager.createParty(characters);
    setServerCreating(false);
  };

  const joinLanServer = async () => {
    const code = joinCode.trim().toUpperCase();
    if (!code) return;
    setServerError(null);
    await partyManager.joinParty(code, characters);
  };

  const leaveLanServer = async () => {
    await partyManager.leaveParty();
    setServerInfo(null);
    setJoinedRoom(null);
    setSharedHeroes([]);
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.surface, paddingTop: insets.top }]}>
      <View style={[styles.header, { borderBottomColor: colors.borderStrong, backgroundColor: colors.surfaceSecondary }]}>
        <View style={styles.headerInfoButtons}>
          <Pressable
            testID="help-button"
            onPress={() => { setHelpMode("help"); setHelpOpen(true); }}
            hitSlop={8}
            style={({ pressed }) => [styles.helpBtn, { borderColor: colors.borderStrong, backgroundColor: pressed ? colors.brandTertiary : colors.surface }]}
            accessibilityLabel="Open help"
          >
            <Icon name="help-circle-outline" size={18} color={colors.onSurface} />
          </Pressable>
          <Pressable
            testID="lore-button"
            onPress={() => { setHelpMode("lore"); setLoreTab("overview"); setHelpOpen(true); }}
            hitSlop={8}
            style={({ pressed }) => [styles.helpBtn, { borderColor: colors.borderStrong, backgroundColor: pressed ? colors.brandTertiary : colors.surface }]}
            accessibilityLabel="Open lore"
          >
            <Icon name="book-open-page-variant-outline" size={18} color={colors.onSurface} />
          </Pressable>
        </View>
        <View style={styles.logoBlock}>
          <Image
            source={require("@/assets/images/aob-logo.png")}
            resizeMode="contain"
            style={styles.logo}
            accessibilityLabel="Assault of Bronze — Lightweight Roleplay System"
          />
          <View style={styles.ageSwitcher}>
            <Pressable testID="age-previous" onPress={() => changeAge(-1)} hitSlop={8} accessibilityLabel="Previous age">
              <Icon name="chevron-left" size={20} color={colors.brandPrimary} />
            </Pressable>
            <View style={styles.ageSwitcherText}>
              <Text style={[styles.ageLabel, { color: colors.brandPrimary, fontFamily: fonts.displayBold }]}>AGE</Text>
              <Text style={[styles.ageName, { color: colors.onSurface, fontFamily: fonts.displayBold }]}>
                {AGE_DEFINITIONS.find((age) => age.id === activeAge)?.label}
              </Text>
            </View>
            <Pressable testID="age-next" onPress={() => changeAge(1)} hitSlop={8} accessibilityLabel="Next age">
              <Icon name="chevron-right" size={20} color={colors.brandPrimary} />
            </Pressable>
          </View>
        </View>
        <Pressable
          testID="theme-toggle"
          onPress={cycleTheme}
          hitSlop={8}
          style={({ pressed }) => [
            styles.themeBtn,
            {
              borderColor: colors.borderStrong,
              backgroundColor: pressed ? colors.brandTertiary : colors.surface,
            },
          ]}
        >
          <Icon
            name={mode === "dark" ? "weather-night" : "white-balance-sunny"}
            size={18}
            color={colors.onSurface}
          />
        </Pressable>
        <Pressable
          testID="gm-tools-button"
          onPress={() => setGmToolsOpen(true)}
          style={({ pressed }) => [
            styles.gmToolsBtn,
            {
              borderColor: colors.borderStrong,
              backgroundColor: pressed ? colors.brandTertiary : colors.surface,
            },
          ]}
          accessibilityLabel="Open GM tools"
        >
          <Icon name="dice-multiple-outline" size={18} color={colors.onSurface} />
        </Pressable>
      </View>

      {joinedRoom && sharedHeroes.length > 0 && (
        <View style={[styles.sharedHeroesPanel, { borderColor: colors.success, backgroundColor: colors.surfaceSecondary }]}> 
          <View style={styles.sharedHeroesHeader}>
            <Icon name="wifi" size={17} color={colors.success} />
            <Text style={[styles.sharedHeroesTitle, { color: colors.onSurface, fontFamily: fonts.displayBold }]}>Party</Text>
            <Text style={[styles.sharedHeroesRoom, { color: colors.muted, fontFamily: fonts.body }]}>Room {joinedRoom}</Text>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.sharedHeroesList}>
            {sharedHeroes.map((hero) => (
              <Pressable key={hero.id} testID={`shared-hero-${hero.id}`} onPress={() => setSelectedSharedHeroId(hero.id)} style={[styles.sharedHeroChip, { borderColor: colors.borderStrong, backgroundColor: colors.surface }]}>
                <Icon name="shield-sword" size={16} color={colors.brandPrimary} />
                <Text numberOfLines={1} style={[styles.sharedHeroName, { color: colors.onSurface, fontFamily: fonts.displayBold }]}>{hero.name || "Unnamed hero"}</Text>
              </Pressable>
            ))}
          </ScrollView>
        </View>
      )}

      <SectionList
        testID="character-list"
        sections={sections}
        keyExtractor={(c) => c.id}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={refresh} tintColor={colors.brandPrimary} />}
        contentContainerStyle={{ padding: 16, paddingBottom: 155 + insets.bottom, gap: 8 }}
        stickySectionHeadersEnabled={false}
        renderSectionHeader={({ section }) => (
          <Pressable
            testID={`section-${section.key}-toggle`}
            onPress={() => toggleSection(section.key)}
            style={({ pressed }) => [
              styles.sectionHeader,
              {
                borderColor: colors.borderStrong,
                backgroundColor: pressed ? colors.brandTertiary : "transparent",
              },
            ]}
          >
            <Icon
              name={section.key === "monster" ? "spider" : "shield-sword"}
              size={16}
              color={colors.brandPrimary}
            />
            <Text style={[styles.sectionTitle, { color: colors.onSurface, fontFamily: fonts.displayBold }]}>
              {section.title}
            </Text>
            <Text style={[styles.sectionCount, { color: colors.muted, fontFamily: fonts.displayBold }]}>
              {section.total}
            </Text>
            <Icon
              name={section.collapsed ? "chevron-down" : "chevron-up"}
              size={22}
              color={colors.onSurface}
            />
          </Pressable>
        )}
        renderSectionFooter={({ section }) =>
          !section.collapsed && section.total === 0 ? (
            <Text style={[styles.emptyLine, { color: colors.muted, fontFamily: fonts.display }]}>
              {section.key === "monster" ? "No enemies yet. Add one below." : "No heroes yet. Roll a new one below."}
            </Text>
          ) : null
        }
        renderItem={({ item }) => (
          <View
            testID={`character-row-${item.id}`}
            style={[
              styles.row,
              { borderColor: colors.borderStrong, backgroundColor: colors.surfaceSecondary },
            ]}
          >
            <Pressable
              testID={`character-row-${item.id}-open`}
              onPress={() => router.push(`/character/${item.id}?age=${activeAge}`)}
              onLongPress={() => confirmDelete(item)}
              style={({ pressed }) => [
                styles.rowMain,
                { backgroundColor: pressed ? colors.brandTertiary : "transparent" },
              ]}
            >
              <View style={[styles.avatar, { borderColor: colors.borderStrong, backgroundColor: colors.surfaceTertiary }]}>
                <Icon
                  name={item.kind === "monster" ? "spider" : "shield-sword"}
                  size={28}
                  color={colors.brandPrimary}
                />
              </View>
              <View style={styles.rowInfo}>
                <Text numberOfLines={1} style={[styles.rowName, { color: colors.onSurface, fontFamily: fonts.displayBold }]}>
                  {item.name || "Unnamed"}
                </Text>
                <Text numberOfLines={1} style={[styles.rowMeta, { color: colors.muted, fontFamily: fonts.display }]}>
                  {item.className || (item.kind === "monster" ? "Enemy" : "No class")} • Lvl {item.level || "1"}
                </Text>
                <View style={styles.hpRow}>
                  <Icon name="cards-heart" size={14} color={colors.brandSecondary} />
                  <Text style={[styles.hpText, { color: colors.onSurface, fontFamily: fonts.display }]}>
                    {item.hp} / {item.maxHp}
                  </Text>
                </View>
              </View>
              <Icon name="chevron-right" size={26} color={colors.muted} />
            </Pressable>
            <View style={[styles.rowActions, { borderTopColor: colors.borderStrong }]}>
              {party.role === "client" && joinedRoom && item.kind !== "monster" && (
                <Pressable
                  testID={`character-row-${item.id}-party`}
                  onPress={() => partyManager.toggleCharacterForParty(item.id)}
                  hitSlop={6}
                  style={({ pressed }) => [
                    styles.rowActionSmall,
                    { backgroundColor: pressed ? colors.brandTertiary : "transparent" },
                  ]}
                  accessibilityLabel={`${party.selectedCharacterIds.includes(item.id) ? "Remove" : "Add"} ${item.name || "hero"} ${party.selectedCharacterIds.includes(item.id) ? "from" : "to"} party`}
                >
                  <Icon
                    name={party.selectedCharacterIds.includes(item.id) ? "account-check" : "account-plus-outline"}
                    size={16}
                    color={party.selectedCharacterIds.includes(item.id) ? colors.success : colors.brandPrimary}
                  />
                </Pressable>
              )}
              <Pressable
                testID={`character-row-${item.id}-export`}
                onPress={() => setExportTarget(item)}
                hitSlop={6}
                style={({ pressed }) => [
                  styles.rowActionSmall,
                  { backgroundColor: pressed ? colors.brandTertiary : "transparent" },
                ]}
                accessibilityLabel={`Export ${item.name || "sheet"}`}
              >
                <Icon name="file-export-outline" size={16} color={colors.brandPrimary} />
              </Pressable>
              <Pressable
                testID={`character-row-${item.id}-duplicate`}
                onPress={() => duplicateCharacter(item)}
                hitSlop={6}
                style={({ pressed }) => [
                  styles.rowActionSmall,
                  { backgroundColor: pressed ? colors.brandTertiary : "transparent" },
                ]}
                accessibilityLabel={`Duplicate ${item.name || "sheet"}`}
              >
                <Icon name="content-copy" size={16} color={colors.brandPrimary} />
              </Pressable>
              <Pressable
                testID={`character-row-${item.id}-delete`}
                onPress={() => confirmDelete(item)}
                hitSlop={6}
                style={({ pressed }) => [
                  styles.rowActionSmall,
                  { backgroundColor: pressed ? colors.brandSecondary : "transparent" },
                ]}
                accessibilityLabel={`Delete ${item.name || "sheet"}`}
              >
                <Icon name="trash-can-outline" size={16} color={colors.brandSecondary} />
              </Pressable>
            </View>
          </View>
        )}
      />

      <View style={[styles.fabBar, { bottom: 12 + insets.bottom }]} pointerEvents="box-none">
        <View style={styles.utilityRow}>
          <Pressable
            testID="import-sheets-btn"
            onPress={() => setImportOpen(true)}
            style={({ pressed }) => [
              styles.utilityBtn,
              {
                borderColor: colors.borderStrong,
                backgroundColor: pressed ? colors.brandTertiary : colors.surfaceSecondary,
              },
            ]}
            accessibilityLabel="Import hero or enemy sheets"
          >
            <Icon name="file-import-outline" size={15} color={colors.brandPrimary} />
            <Text style={[styles.utilityBtnText, { color: colors.onSurface, fontFamily: fonts.displayBold }]}>
              Import Sheet
            </Text>
          </Pressable>

          <Pressable
            testID="backup-all-sheets-btn"
            disabled={characters.length === 0}
            onPress={() => setExportAllOpen(true)}
            style={({ pressed }) => [
              styles.utilityBtn,
              {
                borderColor: colors.borderStrong,
                backgroundColor: pressed ? colors.brandTertiary : colors.surfaceSecondary,
                opacity: characters.length === 0 ? 0.4 : 1,
              },
            ]}
            accessibilityLabel="Backup all sheets"
          >
            <Icon name="archive-arrow-down-outline" size={15} color={colors.brandPrimary} />
            <Text style={[styles.utilityBtnText, { color: colors.onSurface, fontFamily: fonts.displayBold }]}>
              Backup All ({characters.length})
            </Text>
          </Pressable>
        </View>

        <View style={styles.fabRow}>
          <Pressable
            testID="create-character-fab"
            onPress={createHero}
            style={({ pressed }) => [
              styles.fab,
              {
                backgroundColor: pressed ? colors.brandSecondary : colors.brandPrimary,
                borderColor: colors.borderStrong,
              },
            ]}
          >
            <Icon name="shield-sword" size={20} color={colors.onBrandPrimary} />
            <Text style={[styles.fabText, { color: colors.onBrandPrimary, fontFamily: fonts.displayBold }]}>
              New Hero
            </Text>
          </Pressable>
          <Pressable
            testID="create-monster-fab"
            onPress={createMonster}
            style={({ pressed }) => [
              styles.fab,
              {
                backgroundColor: pressed ? colors.brandTertiary : colors.surfaceSecondary,
                borderColor: colors.borderStrong,
              },
            ]}
          >
            <Icon name="spider" size={20} color={colors.brandSecondary} />
            <Text style={[styles.fabText, { color: colors.onSurface, fontFamily: fonts.displayBold }]}>
              New Enemy
            </Text>
          </Pressable>
        </View>
      </View>

      <Modal transparent visible={pendingDelete != null} animationType="fade" onRequestClose={() => setPendingDelete(null)}>
        <Pressable
          testID="delete-confirm-backdrop"
          style={styles.confirmBackdrop}
          onPress={() => setPendingDelete(null)}
        >
          <Pressable
            style={[styles.confirmCard, { backgroundColor: colors.surface, borderColor: colors.borderStrong }]}
            onPress={(e) => e.stopPropagation()}
          >
            <Icon name="alert-circle-outline" size={36} color={colors.brandSecondary} />
            <Text style={[styles.confirmTitle, { color: colors.onSurface, fontFamily: fonts.displayBold }]}>
              Delete {pendingDelete?.kind === "monster" ? "enemy" : "hero"}?
            </Text>
            <Text style={[styles.confirmText, { color: colors.muted, fontFamily: fonts.display }]}>
              This permanently removes "{pendingDelete?.name || "Unnamed"}" and all their data.
            </Text>
            <View style={styles.confirmButtons}>
              <Pressable
                testID="delete-confirm-cancel"
                onPress={() => setPendingDelete(null)}
                style={({ pressed }) => [
                  styles.confirmBtn,
                  { borderColor: colors.borderStrong, backgroundColor: pressed ? colors.brandTertiary : colors.surfaceSecondary },
                ]}
              >
                <Text style={[styles.confirmBtnText, { color: colors.onSurface, fontFamily: fonts.displayBold }]}>
                  Cancel
                </Text>
              </Pressable>
              <Pressable
                testID="delete-confirm-delete"
                onPress={performDelete}
                style={({ pressed }) => [
                  styles.confirmBtn,
                  { borderColor: colors.borderStrong, backgroundColor: pressed ? "#6b1f20" : colors.brandSecondary },
                ]}
              >
                <Text style={[styles.confirmBtnText, { color: colors.onBrandSecondary, fontFamily: fonts.displayBold }]}>
                  Delete
                </Text>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      <Modal transparent visible={helpOpen} animationType="slide" onRequestClose={closeHeaderPanel}>
        <View style={styles.helpBackdropTop}>
          <KeyboardAvoidingView
            behavior={Platform.OS === "ios" ? "padding" : "height"}
            keyboardVerticalOffset={insets.top}
            style={styles.modalKeyboardAvoiding}
          >
          <View style={[styles.helpCard, { backgroundColor: colors.surface, borderColor: colors.borderStrong }]}> 
            <View style={styles.helpHeader}>
              <Text style={[styles.helpTitle, { color: colors.onSurface, fontFamily: fonts.displayBold }]}>{helpMode === "lore" ? "Lore" : "Help"}</Text>
              <Pressable testID="help-close" onPress={closeHeaderPanel} hitSlop={8}>
                <Icon name="close" size={22} color={colors.onSurface} />
              </Pressable>
            </View>
            {(() => {
              const tabs = helpMode === "help" ? HELP_TABS : LORE_TABS;
              const selectedKey = helpMode === "help" ? helpTab : loreTab;
              const selectedTab = tabs.find((tab) => tab.key === selectedKey) ?? tabs[0];
              return (
                <View style={styles.helpTabMenuContainer}>
                  <Pressable
                    testID={`${helpMode}-tab-menu`}
                    onPress={() => setHelpTabMenuOpen((open) => !open)}
                    style={[styles.helpTabMenuButton, { borderColor: colors.borderStrong, backgroundColor: colors.surfaceSecondary }]}
                  >
                    <Text style={[styles.helpTabText, { color: colors.onSurface, fontFamily: fonts.displayBold }]}>{selectedTab.label}</Text>
                    <Icon name={helpTabMenuOpen ? "chevron-up" : "chevron-down"} size={18} color={colors.onSurface} />
                  </Pressable>
                  {helpTabMenuOpen && (
                    <View style={[styles.helpTabMenu, { borderColor: colors.borderStrong, backgroundColor: colors.surfaceSecondary }]}>
                      {tabs.map((tab) => (
                        <Pressable
                          key={tab.key}
                          testID={`${helpMode}-tab-${tab.key}`}
                          onPress={() => {
                            if (helpMode === "help") setHelpTab(tab.key as (typeof HELP_TABS)[number]["key"]);
                            else setLoreTab(tab.key as (typeof LORE_TABS)[number]["key"]);
                            setHelpTabMenuOpen(false);
                          }}
                          style={[styles.helpTabMenuItem, { backgroundColor: selectedKey === tab.key ? colors.brandTertiary : "transparent" }]}
                        >
                          <Text style={[styles.helpTabText, { color: selectedKey === tab.key ? colors.brandPrimary : colors.onSurface, fontFamily: fonts.displayBold }]}>
                            {tab.label}
                          </Text>
                        </Pressable>
                      ))}
                    </View>
                  )}
                </View>
              );
            })()}
            {helpMode === "help" && (
              <View style={[styles.rotationSetting, { borderColor: colors.borderStrong, backgroundColor: colors.surfaceSecondary }]}> 
                <View style={styles.rotationSettingText}>
                  <Text style={[styles.gmWeaponName, { color: colors.onSurface, fontFamily: fonts.displayBold }]}>Allow tablet rotation</Text>
                  <Text style={[styles.gmHint, { color: colors.muted, fontFamily: fonts.body }]}>Use landscape or portrait orientation.</Text>
                </View>
                <Switch
                  testID="tablet-rotation-toggle"
                  value={rotationEnabled}
                  onValueChange={setRotationPreference}
                  trackColor={{ false: colors.borderStrong, true: colors.brandPrimary }}
                  thumbColor={rotationEnabled ? colors.onBrandPrimary : colors.muted}
                />
              </View>
            )}
            {helpMode === "help" && helpTab === "party" && (
              <ScrollView
                style={styles.partyScroll}
                contentContainerStyle={[styles.partyScrollContent, { paddingBottom: insets.bottom + 280 }]}
                keyboardShouldPersistTaps="handled"
                keyboardDismissMode="interactive"
              >
              <View style={[styles.serverPanel, { borderColor: colors.borderStrong, backgroundColor: colors.surfaceSecondary }]}> 
                <View style={styles.serverPanelHeader}>
                  <Icon name="lan-connect" size={20} color={colors.brandPrimary} />
                  <Text style={[styles.gmSectionTitle, { color: colors.onSurface, fontFamily: fonts.displayBold }]}>Local Wi-Fi Server</Text>
                </View>
                <Text style={[styles.helpText, { color: colors.onSurface, fontFamily: fonts.body }]}>Create or join a room directly over local Wi-Fi. No cloud server or remote database is used.</Text>
                {!party.connected && (
                  <Pressable testID="create-lan-server" onPress={createLanServer} disabled={serverCreating} style={[styles.serverButton, { borderColor: colors.borderStrong, backgroundColor: colors.brandPrimary, opacity: serverCreating ? 0.6 : 1 }]}>
                    <Icon name="server-network" size={18} color={colors.onBrandPrimary} />
                    <Text style={[styles.gmButtonText, { color: colors.onBrandPrimary, fontFamily: fonts.displayBold }]}>{serverCreating ? "Starting…" : "Host Local Party"}</Text>
                  </Pressable>
                )}
                {serverInfo && (
                  <View
                    style={[styles.serverResult, { borderColor: colors.success, backgroundColor: "rgba(46,111,64,0.12)" }]}
                  >
                    <Text style={[styles.serverResultText, { color: colors.onSurface, fontFamily: fonts.displayBold }]}>Room code: {serverInfo.room_code}</Text>
                    <Text style={[styles.serverUrl, { color: colors.muted, fontFamily: fonts.body }]}>Local Wi-Fi only</Text>
                    <Pressable testID="leave-lan-server" onPress={leaveLanServer} style={[styles.serverJoinButton, { borderColor: colors.borderStrong, backgroundColor: colors.surfaceSecondary }]}>
                      <Icon name="logout" size={18} color={colors.brandSecondary} />
                      <Text style={[styles.gmButtonText, { color: colors.onSurface, fontFamily: fonts.displayBold }]}>Leave</Text>
                    </Pressable>
                  </View>
                )}
                {serverError && <Text style={[styles.serverError, { color: colors.error, fontFamily: fonts.body }]}>{serverError}</Text>}
                {!party.connected && <>
                  <View style={[styles.serverJoinDivider, { borderTopColor: colors.divider }]} />
                  <Text style={[styles.gmSectionTitle, { color: colors.onSurface, fontFamily: fonts.displayBold }]}>Join a Local Party</Text>
                  <Text style={[styles.gmHint, { color: colors.muted, fontFamily: fonts.body }]}>Enter the room code shown on the host device while connected to the same Wi-Fi.</Text>
                  <View style={styles.serverJoinRow}>
                    <TextInput
                      testID="join-lan-code"
                      value={joinCode}
                      onChangeText={(value) => setJoinCode(value.replace(/[^a-zA-Z0-9]/g, "").slice(0, 6).toUpperCase())}
                      placeholder="ABC123"
                      placeholderTextColor={colors.muted}
                      autoCapitalize="characters"
                      autoCorrect={false}
                      style={[styles.serverCodeInput, { color: colors.onSurface, borderColor: colors.borderStrong, fontFamily: fonts.displayBold }]}
                    />
                    <Pressable testID="join-lan-server" onPress={joinLanServer} style={[styles.serverJoinButton, { borderColor: colors.borderStrong, backgroundColor: colors.surfaceSecondary }]}>
                      <Icon name="login" size={18} color={colors.brandPrimary} />
                      <Text style={[styles.gmButtonText, { color: colors.onSurface, fontFamily: fonts.displayBold }]}>Join</Text>
                    </Pressable>
                  </View>
                </>}
                {party.connected && <Text style={[styles.serverJoined, { color: colors.success, fontFamily: fonts.displayBold }]}>{party.role === "host" ? "Hosting locally" : "Connected locally"}</Text>}
              </View>
              </ScrollView>
            )}
            {(helpMode === "lore" || helpTab !== "party") && <ScrollView
              contentContainerStyle={
                helpMode === "lore" && loreTab === "map"
                  ? [styles.helpBody, styles.mapHelpBody]
                  : styles.helpBody
              }
              scrollEnabled={!(helpMode === "lore" && loreTab === "map")}
            >
              {(() => {
                if (helpMode === "help") {
                  const tab = HELP_TABS.find((entry) => entry.key === helpTab) ?? HELP_TABS[0];
                  return <Text style={[styles.helpText, { color: colors.onSurface, fontFamily: fonts.body }]}>{tab.body}</Text>;
                }
                const tab = LORE_TABS.find((entry) => entry.key === loreTab) ?? LORE_TABS[0];
                if (tab.key === "map") {
                  return <LoreMapExplorer colors={colors} />;
                }
                const blocks = tab.body.split(/\n\n+/);
                return (
                  <>
                    <Text style={[styles.helpSectionTitle, { color: colors.onSurface, fontFamily: fonts.displayBold }]}>{tab.title}</Text>
                    {blocks.map((block, index) => {
                      const image = "imageBlocks" in tab ? tab.imageBlocks?.find((entry: any) => block.includes(entry.after)) : undefined;
                      return (
                        <React.Fragment key={`${block.slice(0, 20)}-${index}`}>
                          <Text style={[styles.helpText, { color: colors.onSurface, fontFamily: fonts.body }]}>{block}</Text>
                          {image && (
                            <View style={[styles.helpImagePlaceholder, { borderColor: colors.borderStrong, backgroundColor: colors.surfaceSecondary }]}>
                              <Image source={image.source} style={styles.helpImage} resizeMode="contain" />
                            </View>
                          )}
                        </React.Fragment>
                      );
                    })}
                  </>
                );
              })()}
            </ScrollView>}
          </View>
          </KeyboardAvoidingView>
        </View>
      </Modal>

      <Modal transparent visible={gmToolsOpen} animationType="slide" onRequestClose={closeHeaderPanel}>
        <View style={styles.helpBackdrop}>
          <KeyboardAvoidingView
            behavior={Platform.OS === "ios" ? "padding" : undefined}
            keyboardVerticalOffset={Platform.OS === "ios" ? insets.top : 0}
            style={styles.modalKeyboardAvoiding}
          >
          <View style={[styles.gmCard, { backgroundColor: colors.surface, borderColor: colors.borderStrong, paddingTop: insets.top, paddingBottom: insets.bottom + 12 }]}> 
            <View style={styles.helpHeader}>
              <Text style={[styles.helpTitle, { color: colors.onSurface, fontFamily: fonts.displayBold }]}>GM Tools</Text>
              <Pressable testID="gm-tools-close" onPress={closeHeaderPanel} hitSlop={8}>
                <Icon name="close" size={22} color={colors.onSurface} />
              </Pressable>
            </View>

            <ScrollView contentContainerStyle={styles.gmBody} keyboardShouldPersistTaps="handled">
              <Text style={[styles.gmSectionTitle, { color: colors.onSurface, fontFamily: fonts.displayBold }]}>Quick Dice Roller</Text>
              <View style={styles.gmFieldRow}>
                <Text style={[styles.gmLabel, { color: colors.muted, fontFamily: fonts.displayBold }]}>Roll</Text>
                <TextInput
                  testID="gm-roll-input"
                  value={gmNotation}
                  onChangeText={setGmNotation}
                  placeholder="1d20"
                  placeholderTextColor={colors.muted}
                  autoCapitalize="none"
                  autoCorrect={false}
                  disableFullscreenUI
                  style={[styles.gmInput, { color: colors.onSurface, borderColor: colors.borderStrong, fontFamily: fonts.body }]}
                />
              </View>
              <View style={styles.gmFieldRow}>
                <Text style={[styles.gmLabel, { color: colors.muted, fontFamily: fonts.displayBold }]}>Damage</Text>
                <TextInput
                  testID="gm-damage-input"
                  value={gmDamage}
                  onChangeText={setGmDamage}
                  placeholder="Optional, e.g. 1d8+2"
                  placeholderTextColor={colors.muted}
                  autoCapitalize="none"
                  autoCorrect={false}
                  disableFullscreenUI
                  style={[styles.gmInput, { color: colors.onSurface, borderColor: colors.borderStrong, fontFamily: fonts.body }]}
                />
              </View>
              <Pressable testID="gm-roll-button" onPress={() => quickRoll(gmNotation)} style={[styles.gmPrimaryBtn, { backgroundColor: colors.brandPrimary, borderColor: colors.borderStrong }]}> 
                <Icon name="dice-d20" size={18} color={colors.onBrandPrimary} />
                <Text style={[styles.gmButtonText, { color: colors.onBrandPrimary, fontFamily: fonts.displayBold }]}>Roll Dice</Text>
              </Pressable>
              {!!gmDamage.trim() && (
                <Pressable testID="gm-damage-button" onPress={() => quickRoll(gmDamage)} style={[styles.gmSecondaryBtn, { backgroundColor: colors.surfaceSecondary, borderColor: colors.borderStrong }]}> 
                  <Icon name="sword-cross" size={17} color={colors.brandSecondary} />
                  <Text style={[styles.gmButtonText, { color: colors.onSurface, fontFamily: fonts.displayBold }]}>Roll Damage</Text>
                </Pressable>
              )}

              <Text style={[styles.gmHint, { color: colors.muted, fontFamily: fonts.body }]}>Weapon rolls from your character sheets:</Text>
              <View style={styles.gmWeaponList}>
                {characters.flatMap((character) => character.weapons.map((weapon) => ({ character, weapon }))).map(({ character, weapon }) => (
                  <Pressable
                    key={`${character.id}-${weapon.id}`}
                    testID={`gm-weapon-${weapon.id}`}
                    onPress={() => { setGmNotation("1d20"); setGmDamage(weapon.damageRoll); }}
                    style={[styles.gmWeaponBtn, { borderColor: colors.borderStrong, backgroundColor: colors.surfaceSecondary }]}
                  >
                    <Text style={[styles.gmWeaponName, { color: colors.onSurface, fontFamily: fonts.displayBold }]}>{weapon.name || "Unnamed weapon"}</Text>
                    <Text style={[styles.gmWeaponMeta, { color: colors.muted, fontFamily: fonts.body }]}>{character.name || "Unnamed"} · {weapon.damageRoll}</Text>
                  </Pressable>
                ))}
              </View>

              <View style={styles.gmSectionHeader}>
                <Text style={[styles.gmSectionTitle, { color: colors.onSurface, fontFamily: fonts.displayBold }]}>Initiative</Text>
                <Pressable testID="gm-next-turn" onPress={nextTurn} style={[styles.nextTurnBtn, { backgroundColor: colors.success, borderColor: colors.borderStrong }]}>
                  <Icon name="skip-next" size={16} color={colors.onSuccess} />
                  <Text style={[styles.gmButtonText, { color: colors.onSuccess, fontFamily: fonts.displayBold }]}>Next Turn</Text>
                </Pressable>
              </View>
              <Text style={[styles.gmHint, { color: colors.muted, fontFamily: fonts.body }]}>Higher numbers act first. Tap an enemy to open its sheet.</Text>
              {initiativeRows.map((entry, index) => (
                <View key={entry.id} style={[styles.initiativeRow, { borderColor: index === turnIndex ? colors.success : colors.borderStrong, backgroundColor: index === turnIndex ? "rgba(46,111,64,0.14)" : colors.surfaceSecondary }]}>
                  <Pressable testID={`gm-initiative-open-${entry.id}`} onPress={() => openCombatantSheet(entry.combatant)} style={styles.initiativeName}>
                    <Icon name={entry.combatant.kind === "monster" ? "spider" : "shield-sword"} size={17} color={index === turnIndex ? colors.success : colors.brandPrimary} />
                    <Text numberOfLines={1} style={[styles.gmWeaponName, { color: colors.onSurface, fontFamily: fonts.displayBold }]}>{entry.combatant.name || "Unnamed combatant"}</Text>
                  </Pressable>
                  <TextInput testID={`gm-initiative-order-${entry.id}`} value={entry.order} onChangeText={(value) => updateInitiativeOrder(entry.id, value.replace(/\D/g, ""))} keyboardType="number-pad" style={[styles.initiativeInput, { color: colors.onSurface, borderColor: colors.borderStrong, fontFamily: fonts.displayBold }]} />
                  <Pressable testID={`gm-remove-initiative-${entry.id}`} onPress={() => removeFromInitiative(entry.id)} hitSlop={6}><Icon name="close" size={18} color={colors.brandSecondary} /></Pressable>
                </View>
              ))}
              <View style={[styles.availableCombatantsHeader, { borderColor: colors.borderStrong, backgroundColor: colors.surfaceSecondary }]}>
                <Pressable
                  testID="gm-party-toggle"
                  onPress={() => setPartyCombatantsCollapsed((collapsed) => !collapsed)}
                  style={styles.availableCombatantsToggle}
                >
                  <Icon name="wifi" size={17} color={colors.success} />
                  <Text style={[styles.gmWeaponName, { color: colors.onSurface, fontFamily: fonts.displayBold }]}>Party</Text>
                  <Text style={[styles.gmWeaponMeta, { color: colors.muted, fontFamily: fonts.body }]}>{sharedHeroes.length}</Text>
                  <Icon name={partyCombatantsCollapsed ? "chevron-down" : "chevron-up"} size={20} color={colors.onSurface} />
                </Pressable>
                <Pressable
                  testID="gm-add-all-party"
                  onPress={() => addAllToInitiative(sharedHeroes)}
                  style={[styles.quickAddButton, { borderColor: colors.borderStrong, backgroundColor: colors.brandPrimary }]}
                >
                  <Icon name="plus-box-multiple-outline" size={16} color={colors.onBrandPrimary} />
                  <Text style={[styles.quickAddText, { color: colors.onBrandPrimary, fontFamily: fonts.displayBold }]}>Add all</Text>
                </Pressable>
              </View>
              {!partyCombatantsCollapsed && sharedHeroes.map((combatant) => (
                <Pressable key={combatant.id} testID={`gm-add-party-${combatant.id}`} onPress={() => addToInitiative(combatant)} style={[styles.addInitiativeBtn, { borderColor: colors.borderStrong, backgroundColor: colors.surfaceSecondary }]}>
                  <Icon name="shield-sword" size={16} color={colors.success} />
                  <Text style={[styles.gmWeaponName, { color: colors.onSurface, fontFamily: fonts.displayBold }]}>{combatant.name || "Unnamed party member"}</Text>
                  <Text style={[styles.gmWeaponMeta, { color: colors.muted, fontFamily: fonts.body }]}>Party member</Text>
                </Pressable>
              ))}
              <View style={[styles.availableCombatantsHeader, { borderColor: colors.borderStrong, backgroundColor: colors.surfaceSecondary }]}>
                <Pressable
                  testID="gm-available-combatants-toggle"
                  onPress={() => setAvailableCombatantsCollapsed((collapsed) => !collapsed)}
                  style={styles.availableCombatantsToggle}
                >
                  <Icon name="account-multiple-outline" size={17} color={colors.brandPrimary} />
                  <Text style={[styles.gmWeaponName, { color: colors.onSurface, fontFamily: fonts.displayBold }]}>Available Combatants</Text>
                  <Text style={[styles.gmWeaponMeta, { color: colors.muted, fontFamily: fonts.body }]}>{availableCombatants.length}</Text>
                  <Icon name={availableCombatantsCollapsed ? "chevron-down" : "chevron-up"} size={20} color={colors.onSurface} />
                </Pressable>
                <Pressable
                  testID="gm-add-all-combatants"
                  onPress={() => addAllToInitiative(availableCombatants)}
                  style={[styles.quickAddButton, { borderColor: colors.borderStrong, backgroundColor: colors.brandPrimary }]}
                >
                  <Icon name="plus-box-multiple-outline" size={16} color={colors.onBrandPrimary} />
                  <Text style={[styles.quickAddText, { color: colors.onBrandPrimary, fontFamily: fonts.displayBold }]}>Add all</Text>
                </Pressable>
              </View>
              {!availableCombatantsCollapsed && availableCombatants.map((combatant) => (
                <Pressable key={combatant.id} testID={`gm-add-combatant-${combatant.id}`} onPress={() => addToInitiative(combatant)} style={[styles.addInitiativeBtn, { borderColor: colors.borderStrong, backgroundColor: colors.surfaceSecondary }]}>
                  <Icon name={combatant.kind === "monster" ? "spider" : "shield-sword"} size={16} color={colors.brandPrimary} />
                  <Text style={[styles.gmWeaponName, { color: colors.onSurface, fontFamily: fonts.displayBold }]}>{combatant.name || "Unnamed combatant"}</Text>
                  <Text style={[styles.gmWeaponMeta, { color: colors.muted, fontFamily: fonts.body }]}>{combatant.kind === "monster" ? "Enemy" : "Hero"}</Text>
                </Pressable>
              ))}

              <View style={[styles.gmHistoryHeader, { borderTopColor: colors.divider }]}>
                <Icon name="history" size={19} color={colors.brandPrimary} />
                <Text style={[styles.gmSectionTitle, { color: colors.onSurface, fontFamily: fonts.displayBold }]}>Party Roll History</Text>
              </View>
              {partyRollHistory.length === 0 ? (
                <Text style={[styles.gmHint, { color: colors.muted, fontFamily: fonts.body }]}>No party rolls recorded yet.</Text>
              ) : (
                partyRollGroups.map((group) => (
                  <View key={group.key} style={styles.gmHistoryGroup}>
                    <View style={styles.gmHistoryGroupToggle}>
                      <Pressable
                        onPress={() => setCollapsedRollHistoryGroups((current) => ({ ...current, [group.key]: !current[group.key] }))}
                        style={styles.gmHistoryGroupToggleMain}
                      >
                        <Text numberOfLines={1} style={[styles.gmHistoryDate, { color: colors.muted, fontFamily: fonts.displayBold }]}>
                          {(groupLabels[group.key] || rollHistoryTimestamp(group.timestamp))} ({group.entries.length})
                        </Text>
                        <Icon name={collapsedRollHistoryGroups[group.key] ? "chevron-down" : "chevron-up"} size={18} color={colors.muted} />
                      </Pressable>
                      <Pressable
                        onPress={() => setRenamingGroupKey((current) => (current === group.key ? null : group.key))}
                        hitSlop={8}
                      >
                        <Icon name="pencil-outline" size={15} color={colors.muted} />
                      </Pressable>
                    </View>
                    {renamingGroupKey === group.key && (
                      <TextInput
                        value={groupLabels[group.key] ?? ""}
                        onChangeText={(name) => setGroupLabels((current) => ({ ...current, [group.key]: name }))}
                        onSubmitEditing={() => setRenamingGroupKey(null)}
                        onBlur={() => setRenamingGroupKey(null)}
                        placeholder={rollHistoryTimestamp(group.timestamp)}
                        placeholderTextColor={colors.muted}
                        disableFullscreenUI
                        style={[styles.gmHistoryGroupNameInput, { borderColor: colors.divider, color: colors.onSurface, fontFamily: fonts.body }]}
                      />
                    )}
                    {!collapsedRollHistoryGroups[group.key] && group.entries.map((entry) => (
                      <View key={`${entry.characterId}-${entry.id}`} style={[styles.gmHistoryRow, { borderColor: colors.borderStrong, backgroundColor: colors.surfaceSecondary }]}>
                        <View style={styles.gmHistoryTopRow}>
                          <View style={styles.gmHistoryDetails}>
                            <Text numberOfLines={1} style={[styles.gmWeaponName, { color: colors.onSurface, fontFamily: fonts.displayBold }]}>{entry.label}</Text>
                            <Text numberOfLines={1} style={[styles.gmWeaponMeta, { color: colors.muted, fontFamily: fonts.body }]}>{entry.characterName}</Text>
                          </View>
                          <Text style={[styles.gmHistoryResult, { color: colors.brandPrimary, fontFamily: fonts.displayBold }]}>
                            {entry.effect ? `${entry.effect.type === "healing" ? "HEAL" : "DMG"} ${entry.effect.total}` : entry.rolled != null ? `d20 ${entry.rolled}` : "Roll"}
                          </Text>
                          <Text style={[styles.gmHistoryTime, { color: colors.muted, fontFamily: fonts.body }]}>{rollHistoryTime(entry.at)}</Text>
                        </View>
                        <TextInput
                          value={rollNotes[`${entry.characterId}:${entry.id}`] ?? ""}
                          onChangeText={(description) => setRollNotes((current) => ({ ...current, [`${entry.characterId}:${entry.id}`]: description }))}
                          onBlur={() => partyManager.updateRollNotes(rollNotes)}
                          placeholder="Add a note about this roll"
                          placeholderTextColor={colors.muted}
                          multiline
                          disableFullscreenUI
                          style={[styles.gmHistoryNote, { borderColor: colors.divider, color: colors.onSurface, fontFamily: fonts.body }]}
                        />
                      </View>
                    ))}
                  </View>
                ))
              )}
            </ScrollView>
          </View>
          </KeyboardAvoidingView>
        </View>
      </Modal>
      <DiceRollModal request={gmRoll} onClose={() => setGmRoll(null)} />

      <Modal transparent visible={selectedSharedHero != null} animationType="slide" onRequestClose={() => setSelectedSharedHeroId(null)}>
        <View style={styles.helpBackdrop}>
          <View style={[styles.sharedHeroCard, { backgroundColor: colors.surface, borderColor: colors.borderStrong }]}>
            <View style={styles.helpHeader}>
              <Text style={[styles.helpTitle, { color: colors.onSurface, fontFamily: fonts.displayBold }]}>{selectedSharedHero?.name || "Shared Hero"}</Text>
              <Pressable testID="shared-hero-close" onPress={() => setSelectedSharedHeroId(null)} hitSlop={8}><Icon name="close" size={22} color={colors.onSurface} /></Pressable>
            </View>
            <Text style={[styles.sharedHeroReadOnly, { color: colors.muted, fontFamily: fonts.displayBold }]}>READ ONLY · LIVE LAN VIEW</Text>
            <ScrollView contentContainerStyle={styles.sharedHeroBody}>
              <Text style={[styles.sharedHeroClass, { color: colors.onSurface, fontFamily: fonts.displayBold }]}>{selectedSharedHero?.className || "Hero"} · Level {selectedSharedHero?.level || "1"}</Text>
              <Text style={[styles.sharedHeroHp, { color: colors.brandSecondary, fontFamily: fonts.displayBold }]}>HP {selectedSharedHero?.hp} / {selectedSharedHero?.maxHp}</Text>
              {selectedSharedHero?.stats.map((stat) => (
                <View key={stat.key} style={[styles.sharedStatRow, { borderColor: colors.borderStrong }]}>
                  <Text style={[styles.sharedStatName, { color: colors.onSurface, fontFamily: fonts.displayBold }]}>{stat.name}</Text>
                  <Text style={[styles.sharedStatValue, { color: colors.brandPrimary, fontFamily: fonts.displayBold }]}>{stat.value}</Text>
                </View>
              ))}
              <Text style={[styles.sharedHeroNote, { color: colors.muted, fontFamily: fonts.body }]}>This view updates from the LAN room. Editing is disabled for shared heroes.</Text>
            </ScrollView>
          </View>
        </View>
      </Modal>

      <ExportSheetModal
        visible={exportTarget != null}
        onClose={() => setExportTarget(null)}
        character={exportTarget}
      />

      <ExportSheetModal
        visible={exportAllOpen}
        onClose={() => setExportAllOpen(false)}
        characters={characters}
      />

      <ImportSheetModal
        visible={importOpen}
        onClose={() => setImportOpen(false)}
        onImportSuccess={() => refresh()}
        age={activeAge}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 3,
    alignItems: "center",
    position: "relative",
  },
  helpBtn: {
    width: 36,
    height: 36,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
  },
  headerInfoButtons: {
    position: "absolute",
    left: 12,
    top: 8,
    flexDirection: "column",
    gap: 6,
    zIndex: 1,
  },
  headerInfoText: { fontSize: 11 },
  themeBtn: {
    position: "absolute",
    right: 12,
    top: 8,
    width: 36,
    height: 36,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
  },
  logoBlock: { alignItems: "center", width: "100%" },
  logo: { width: "100%", maxWidth: 384, height: 96 },
  ageSwitcher: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    marginTop: -4,
    marginBottom: 2,
  },
  ageSwitcherText: { alignItems: "center", minWidth: 150 },
  ageLabel: { fontSize: 9, letterSpacing: 2 },
  ageName: { fontSize: 16, letterSpacing: 1 },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderBottomWidth: 2,
    paddingVertical: 8,
    marginTop: 8,
  },
  sectionTitle: { fontSize: 20, letterSpacing: 1.5, flex: 1 },
  sectionCount: { fontSize: 14 },
  emptyLine: { fontStyle: "italic", fontSize: 14, textAlign: "center", paddingVertical: 8 },
  row: {
    borderWidth: 2.5,
    overflow: "hidden",
  },
  rowMain: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 12,
  },
  rowActions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    alignItems: "center",
    borderTopWidth: 1.5,
    paddingHorizontal: 4,
  },
  rowActionSmall: {
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  avatar: {
    width: 54,
    height: 54,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
  },
  rowInfo: { flex: 1, gap: 2 },
  rowName: { fontSize: 20, fontWeight: "700" },
  rowMeta: { fontSize: 14, letterSpacing: 0.5 },
  hpRow: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 2 },
  hpText: { fontSize: 13 },
  fabBar: {
    position: "absolute",
    left: 16,
    right: 16,
    gap: 8,
  },
  utilityRow: {
    flexDirection: "row",
    gap: 10,
  },
  utilityBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 7,
    paddingHorizontal: 10,
    borderWidth: 2,
    borderRadius: 6,
  },
  utilityBtnText: {
    fontSize: 12,
    letterSpacing: 0.5,
  },
  fabRow: {
    flexDirection: "row",
    gap: 10,
  },
  fab: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderWidth: 2.5,
  },
  fabText: { fontSize: 14, fontWeight: "700", letterSpacing: 1 },
  confirmBackdrop: {
    flex: 1,
    backgroundColor: "rgba(20,14,8,0.85)",
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  confirmCard: {
    width: "100%",
    maxWidth: 340,
    borderWidth: 3,
    padding: 20,
    alignItems: "center",
    gap: 10,
  },
  confirmTitle: { fontSize: 22, fontWeight: "700", letterSpacing: 1 },
  confirmText: { fontSize: 14, textAlign: "center" },
  confirmButtons: { flexDirection: "row", gap: 10, marginTop: 8, alignSelf: "stretch" },
  confirmBtn: {
    flex: 1,
    borderWidth: 2,
    paddingVertical: 12,
    alignItems: "center",
  },
  helpBackdrop: {
    flex: 1,
    backgroundColor: "rgba(20,14,8,0.85)",
    justifyContent: "flex-end",
  },
  helpBackdropTop: {
    flex: 1,
    backgroundColor: "rgba(20,14,8,0.85)",
    justifyContent: "flex-start",
  },
  modalKeyboardAvoiding: { flex: 1, width: "100%" },
  helpCard: {
    width: "100%",
    flex: 1,
    maxHeight: "100%",
    minHeight: "100%",
    height: "100%",
    borderWidth: 3,
    padding: 16,
  },
  helpHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingBottom: 12,
  },
  helpTitle: { fontSize: 22, letterSpacing: 1.5 },
  helpTabs: {
    flexDirection: "row",
    borderBottomWidth: 2,
  },
  helpTabMenuContainer: { position: "relative", zIndex: 2, marginBottom: 10 },
  helpTabMenuButton: {
    minHeight: 44,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderWidth: 1.5,
    paddingHorizontal: 12,
  },
  helpTabMenu: {
    position: "absolute",
    top: 48,
    left: 0,
    right: 0,
    borderWidth: 1.5,
    paddingVertical: 4,
  },
  helpTabMenuItem: { minHeight: 42, justifyContent: "center", paddingHorizontal: 12 },
  helpTab: {
    flex: 1,
    alignItems: "center",
    borderBottomWidth: 3,
    paddingVertical: 10,
  },
  helpTabText: { fontSize: 12 },
  rotationSetting: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12, borderWidth: 1.5, padding: 10, marginTop: 10 },
  rotationSettingText: { flex: 1, gap: 2 },
  helpBody: { paddingVertical: 22, gap: 10 },
  mapHelpBody: { paddingBottom: 40, paddingTop: 16 },
  helpSectionTitle: { fontSize: 20, letterSpacing: 1 },
  helpText: { fontSize: 15, lineHeight: 23 },
  helpImagePlaceholder: {
    width: "100%",
    minHeight: 150,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
    padding: 8,
    gap: 8,
  },
  mapExplorerContainer: { gap: 12 },
  mapControlRow: { flexDirection: "row", gap: 8, alignItems: "center" },
  mapControlButton: { minWidth: 52, minHeight: 42, borderWidth: 2, alignItems: "center", justifyContent: "center" },
  mapResetButton: { flex: 1, minHeight: 42, borderWidth: 2, alignItems: "center", justifyContent: "center" },
  mapControlText: { fontSize: 18 },
  mapZoomContainer: {
    width: "100%",
    height: 420,
    borderWidth: 2,
    borderRadius: 12,
    overflow: "hidden",
    backgroundColor: "#0b1015",
  },
  mapZoomContent: {
    width: "100%",
    height: "100%",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  mapDetailImage: { width: 520, height: 520, maxWidth: "180%", maxHeight: "180%" },
  compassPanel: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 12,
    alignSelf: "center",
    width: 126,
    gap: 2,
    pointerEvents: "box-none",
  },
  dPadRow: { flexDirection: "row", justifyContent: "center" },
  dPadMiddleRow: { flexDirection: "row", justifyContent: "space-between" },
  dPadButton: {
    width: 40,
    height: 40,
    borderWidth: 2,
    borderRadius: 6,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOpacity: 0.2,
    shadowRadius: 3,
    shadowOffset: { width: 0, height: 1 },
    backgroundColor: "rgba(14,18,22,0.82)",
  },
  dPadCenter: {
    width: 40,
    height: 40,
    borderWidth: 2,
    borderRadius: 6,
    alignItems: "center",
    justifyContent: "center",
  },
  helpImage: { width: "100%", height: 180 },
  helpImageLabel: { fontSize: 12, textAlign: "center" },
  serverPanel: { borderWidth: 2, padding: 12, gap: 9, marginTop: 12 },
  partyScroll: { flex: 1 },
  partyScrollContent: { flexGrow: 1 },
  serverPanelHeader: { flexDirection: "row", alignItems: "center", gap: 7 },
  serverButton: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 7, borderWidth: 2, paddingVertical: 10 },
  serverResult: { borderWidth: 2, padding: 10, gap: 5 },
  serverResultText: { fontSize: 16, letterSpacing: 0.6 },
  serverUrl: { fontSize: 12 },
  serverError: { fontSize: 12, lineHeight: 18 },
  serverJoinDivider: { borderTopWidth: 1.5, marginTop: 4, paddingTop: 10 },
  serverJoinRow: { flexDirection: "row", gap: 8 },
  serverCodeInput: { flex: 1, minWidth: 0, height: 40, borderWidth: 1.5, paddingHorizontal: 10, fontSize: 16, letterSpacing: 2 },
  serverJoinButton: { flexShrink: 0, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 5, borderWidth: 2, paddingHorizontal: 10, minWidth: 72 },
  serverJoined: { fontSize: 13 },
  sharedHeroesPanel: { borderWidth: 2, marginHorizontal: 16, marginBottom: 8, padding: 10, gap: 8 },
  sharedHeroesHeader: { flexDirection: "row", alignItems: "center", gap: 6 },
  sharedHeroesTitle: { fontSize: 15, flex: 1 },
  sharedHeroesRoom: { fontSize: 11 },
  sharedHeroesList: { gap: 7 },
  sharedHeroChip: { flexDirection: "row", alignItems: "center", gap: 6, borderWidth: 1.5, paddingHorizontal: 9, paddingVertical: 8, maxWidth: 180 },
  sharedHeroName: { flexShrink: 1, minWidth: 0, fontSize: 13 },
  sharedHeroCard: { width: "100%", maxHeight: "86%", borderTopWidth: 3, padding: 16 },
  sharedHeroReadOnly: { fontSize: 11, letterSpacing: 1.2 },
  sharedHeroBody: { paddingVertical: 18, gap: 10 },
  sharedHeroClass: { fontSize: 17 },
  sharedHeroHp: { fontSize: 22 },
  sharedStatRow: { flexDirection: "row", justifyContent: "space-between", borderWidth: 1.5, padding: 9 },
  sharedStatName: { fontSize: 13 },
  sharedStatValue: { fontSize: 17 },
  sharedHeroNote: { fontSize: 13, lineHeight: 19, marginTop: 8 },
  gmToolsBtn: {
    position: "absolute",
    right: 12,
    top: 50,
    width: 36,
    height: 36,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 1,
  },
  gmCard: {
    width: "100%",
    flex: 1,
    borderWidth: 3,
    padding: 16,
  },
  gmBody: { paddingBottom: 24, gap: 10 },
  gmSectionTitle: { fontSize: 18, letterSpacing: 1 },
  gmSectionHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 12 },
  gmFieldRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  gmLabel: { width: 62, fontSize: 13 },
  gmInput: { flex: 1, minHeight: 38, borderWidth: 1.5, paddingHorizontal: 10, paddingVertical: 7, fontSize: 15 },
  gmPrimaryBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 7, borderWidth: 2, paddingVertical: 10 },
  gmSecondaryBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 7, borderWidth: 2, paddingVertical: 9 },
  gmButtonText: { fontSize: 13, letterSpacing: 0.5 },
  gmHint: { fontSize: 12, lineHeight: 17, marginTop: 3 },
  gmWeaponList: { gap: 6 },
  gmWeaponBtn: { padding: 9, borderWidth: 1.5 },
  gmWeaponName: { fontSize: 14 },
  gmWeaponMeta: { fontSize: 12, marginTop: 2 },
  gmHistoryHeader: { flexDirection: "row", alignItems: "center", gap: 7, borderTopWidth: 1.5, paddingTop: 16, marginTop: 14 },
  gmHistoryGroup: { gap: 5, marginTop: 8 },
  gmHistoryGroupToggle: { flexDirection: "row", alignItems: "center", gap: 8, paddingVertical: 2 },
  gmHistoryGroupToggleMain: { flex: 1, minWidth: 0, flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 6 },
  gmHistoryGroupNameInput: { borderWidth: 1, paddingVertical: 4, paddingHorizontal: 6, fontSize: 12, marginTop: 2 },
  gmHistoryDate: { flexShrink: 1, fontSize: 12, letterSpacing: 0.5 },
  gmHistoryRow: { gap: 7, borderWidth: 1.5, padding: 8 },
  gmHistoryTopRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  gmHistoryDetails: { flex: 1, minWidth: 0 },
  gmHistoryResult: { fontSize: 12 },
  gmHistoryTime: { fontSize: 11, width: 46, textAlign: "right" },
  gmHistoryNote: { minHeight: 34, maxHeight: 82, borderTopWidth: 1, paddingTop: 6, paddingHorizontal: 0, fontSize: 12, lineHeight: 17, textAlignVertical: "top" },
  nextTurnBtn: { flexDirection: "row", alignItems: "center", gap: 4, borderWidth: 1.5, paddingHorizontal: 9, paddingVertical: 7 },
  addInitiativeBtn: { flexDirection: "row", alignItems: "center", gap: 7, padding: 9, borderWidth: 1.5 },
  availableCombatantsHeader: { flexDirection: "row", alignItems: "center", gap: 7, padding: 6, borderWidth: 2, marginTop: 10 },
  availableCombatantsToggle: { flex: 1, flexDirection: "row", alignItems: "center", gap: 7, padding: 4 },
  quickAddButton: { flexDirection: "row", alignItems: "center", gap: 4, borderWidth: 1.5, paddingHorizontal: 7, paddingVertical: 6 },
  quickAddText: { fontSize: 11, letterSpacing: 0.3 },
  initiativeRow: { flexDirection: "row", alignItems: "center", gap: 8, borderWidth: 2.5, padding: 8 },
  initiativeName: { flex: 1, flexDirection: "row", alignItems: "center", gap: 7, minWidth: 0 },
  initiativeInput: { width: 52, height: 34, borderWidth: 1.5, textAlign: "center", paddingVertical: 3 },
  confirmBtnText: { fontSize: 15, fontWeight: "700", letterSpacing: 0.8 },
});
