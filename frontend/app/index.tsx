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
} from "react-native";
import { useRouter, useFocusEffect } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as ScreenOrientation from "expo-screen-orientation";
import AsyncStorage from "@react-native-async-storage/async-storage";
import Icon from "@react-native-vector-icons/material-design-icons";
import { fonts, setThemeMode, useTheme } from "@/src/theme";
import { Character, RollHistoryEntry } from "@/src/types";
import { deleteCharacter, loadAllCharacters, upsertCharacter } from "@/src/storage/characters";
import { genId } from "@/src/types";
import DiceRollModal, { RollRequest } from "@/src/components/DiceRollModal";
import { partyManager } from "@/src/party/PartyManager";
import { usePartyState } from "@/src/party/usePartyState";
import { PARTY_UNSUPPORTED_REASON } from "@/src/party/nativeSupport";

const HELP_TABS = [
  {
    key: "overview",
    label: "Overview",
    title: "Assault of Bronze",
    body: "Create heroes and monsters, then open their sheets to manage stats, equipment, abilities, health, and rolls. Open Lore to explore Aryndos, or Party to create and join a local Wi-Fi room. GM Tools includes a quick dice roller, weapon-roll shortcuts, and an initiative tracker for heroes, monsters, and connected party members.",
  },
  {
    key: "logical-roleplay",
    label: "Logical Roleplay",
    title: "Logical Roleplay",
    body: `Logical roleplay means every decision in the game, whether resolving an action, determining consequences, or handling an unexpected event, should be grounded in reasonable logic. If the rules directly cover the situation, follow them. If there is no specific rule, apply the spirit of the system and use the stat or skill that best fits the action.

Match actions to the most appropriate stat or skill on the sheet, rather than whichever roll is convenient. When a player tries something, the GM should choose the stat that most accurately represents that ability: use Ranged Attack for shooting, First Aid for patching a wound, and Vitality for shrugging off toxins. This keeps outcomes believable and the game internally consistent.

The stats on the AoB character sheet are intentionally broad. They are shorthand for a character's general capabilities across any genre or setting. Treat each stat as a wide umbrella for many situations, not a checkbox for one specific stunt.

When an unforeseen situation does not fit neatly into a stat, apply common sense. Briefly discuss which existing skill is the closest fit and agree on it. If the table cannot reach consensus, the GM should make a prompt ruling so play continues. The goal is to keep players invested in the unfolding story rather than stalling over skill-check debates. Quick, reasonable decisions preserve pace and fun.

Debates can be revisited after the game, and not all debates are a problem. Let players debate where to go or whom to trust when they are immersed in the story; avoid arguments that pull the table away from the game rules and narrative.`,
  },
  {
    key: "combat",
    label: "Combat",
    title: "Rolling in a fight",
    body: `COMBAT

Combat typically begins with the enemies' first attack unless the players perform a sneak attack. On that first attack, players may make a DEX save to dodge it.

INITIATIVE

Initiative decides who acts when during combat. At the start of a fight, everyone rolls a d20 for turn order. Players, enemies, and NPCs act from the highest roll to the lowest. If the enemy attacked first, its initiative is 20; if it was sneaked upon, its initiative is 0. For identical creatures such as a pack of drones or guards, the GM rolls once for the entire group and they act on the same turn.

During combat, players may take one action, such as a once-per-turn or once-per-rest ability, move, and take a bonus action such as drinking a potion, pressing a button, or pulling a lever. These can be performed in any order. Some targets have stronger armour or defensive abilities at higher levels to balance a higher-level party's improved ATK checks.

WEAPONS AND DAMAGE

To damage an enemy, a player may need to roll a d20 based on their attack. They can use a once-per-turn action, a once-per-rest action, or a Melee ATK or Ranged ATK stat roll with a weapon they possess. Weapon modifiers are typically added to damage rolls: a basic dagger might deal 1d4, while a better dagger might deal 1d4+5. The +5 guarantees at least 5 damage on every successful ATK roll.

Modifiers are never added to stat rolls. Instead, use Advantage or Disadvantage. See Dice and Stat Checks for more detail, and Weapon Table for a premade weapon list.

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
    body: "Easy Creation guides you through a profile, rolls, and assignment. Custom Creation opens a blank sheet so you can enter everything yourself.",
  },
  {
    key: "party",
    label: "Party",
    title: "Party server",
    body: "Create or join a private room for nearby players.",
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
    label: "Age of Magic",
    title: "The Age of Magic",
    body: `The Age of Magic began approximately 500 years before the Wall was built. It began when the entity known as Khaliik scattered the Power Stones across the solar system, literally summoning Magic into existence.

The forest-dwelling peoples of Aryndos benefited most. Elves quickly mastered many uses of Magic and enlisted Dwarves to mine for more stones. Only the Elves knew the proper rituals for harvesting them. Without those rituals, a Power Stone could bleed and become unstable.

Humans paid little attention to the Power Stones or the godlike entity that had changed their world. They focused instead on expansion, building, and mining. Their colonies eventually united into a nation in the eastern half of the continent.`,
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
] as const;

const ROTATION_PREFERENCE_KEY = "aob:allow-tablet-rotation";

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
  const [characters, setCharacters] = useState<Character[]>([]);
  const [loading, setLoading] = useState(true);
  const [pendingDelete, setPendingDelete] = useState<Character | null>(null);
  const [heroesCollapsed, setHeroesCollapsed] = useState(false);
  const [monstersCollapsed, setMonstersCollapsed] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const [helpMode, setHelpMode] = useState<"help" | "lore">("help");
  const [helpTab, setHelpTab] = useState<(typeof HELP_TABS)[number]["key"]>("overview");
  const [loreTab, setLoreTab] = useState<(typeof LORE_TABS)[number]["key"]>("overview");
  const [rotationEnabled, setRotationEnabled] = useState(true);
  const [serverError, setServerError] = useState<string | null>(null);
  const [joinCode, setJoinCode] = useState("");
  const [selectedSharedHero, setSelectedSharedHero] = useState<Character | null>(null);
  const [gmToolsOpen, setGmToolsOpen] = useState(false);
  const [gmRoll, setGmRoll] = useState<RollRequest | null>(null);
  const [gmDamage, setGmDamage] = useState("");
  const [gmNotation, setGmNotation] = useState("");
  const [initiative, setInitiative] = useState<{ id: string; order: string }[]>([]);
  const [turnIndex, setTurnIndex] = useState(0);
  const [availableCombatantsCollapsed, setAvailableCombatantsCollapsed] = useState(false);
  const [partyCombatantsCollapsed, setPartyCombatantsCollapsed] = useState(false);
  const [collapsedRollHistoryGroups, setCollapsedRollHistoryGroups] = useState<Record<string, boolean>>({});
  const [groupLabels, setGroupLabels] = useState<Record<string, string>>({});
  const [renamingGroupKey, setRenamingGroupKey] = useState<string | null>(null);
  const [localRollNotes, setLocalRollNotes] = useState<Record<string, string>>({});

  // Party state comes from the PartyManager (host or client role).
  const party = usePartyState();
  const partySupported = useMemo(() => partyManager.isSupported(), []);
  const serverCreating = party.connecting && party.role === "host";
  const serverInfo = party.role === "host" && party.roomCode
    ? {
        room_code: party.roomCode,
        join_url:
          party.hostPort != null
            ? `Room code ${party.roomCode} · port ${party.hostPort}`
            : `Room code ${party.roomCode}`,
      }
    : null;
  const joinedRoom = party.connected ? party.roomCode : null;
  const sharedHeroes = party.sharedHeroes;
  const rollNotes = party.connected ? party.rollNotes : localRollNotes;
  const partyError = party.error ?? serverError;

  const cycleTheme = () => {
    setThemeMode(mode === "dark" ? "light" : "dark");
  };

  const refresh = useCallback(async () => {
    const list = await loadAllCharacters();
    setCharacters(list);
    setLoading(false);
  }, []);

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
    router.push("/create-hero");
  };
  const createMonster = () => router.push("/create-hero?kind=monster");

  const confirmDelete = (c: Character) => setPendingDelete(c);
  const performDelete = async () => {
    if (!pendingDelete) return;
    const next = await deleteCharacter(pendingDelete.id);
    setCharacters(next);
    setPendingDelete(null);
  };

  const duplicateCharacter = async (character: Character) => {
    const now = new Date().toISOString();
    const copy: Character = {
      ...JSON.parse(JSON.stringify(character)),
      id: genId(),
      name: `${character.name || "Unnamed"} Copy`,
      createdAt: now,
      updatedAt: now,
      oncePerTurn: character.oncePerTurn.map((ability) => ({ ...ability, id: genId() })),
      oncePerRest: character.oncePerRest.map((ability) => ({ ...ability, id: genId() })),
      heroAbilities: character.heroAbilities.map((ability) => ({ ...ability, id: genId() })),
      inventoryItems: character.inventoryItems.map((item) => ({ ...item, id: genId() })),
      customSections: character.customSections.map((section) => ({ ...section, id: genId() })),
      weapons: character.weapons.map((weapon) => ({ ...weapon, id: genId() })),
    };
    const next = await upsertCharacter(copy);
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
        title: "Monsters",
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
      setSelectedSharedHero(combatant);
      return;
    }
    router.push(`/character/${combatant.id}`);
  };

  const quickRoll = (notation: string, damage?: string) => {
    const cleanNotation = notation.trim() || "1d20";
    setGmRoll({
      label: damage?.trim() ? `GM Roll · ${cleanNotation} + ${damage.trim()}` : "GM Roll",
      effect: { notation: cleanNotation, type: "damage" },
    });
  };

  const createLanServer = async () => {
    setServerError(null);
    if (!partyManager.isSupported()) {
      setServerError(PARTY_UNSUPPORTED_REASON);
      return;
    }
    try {
      await partyManager.createParty(characters, "Game Master");
    } catch (err) {
      console.warn("createParty failed", err);
      setServerError("Could not start the party host.");
    }
  };

  const joinLanServer = async () => {
    const code = joinCode.trim().toUpperCase();
    if (!code) return;
    setServerError(null);
    if (!partyManager.isSupported()) {
      setServerError(PARTY_UNSUPPORTED_REASON);
      return;
    }
    try {
      await partyManager.joinParty(code, characters, "Player");
    } catch (err) {
      console.warn("joinParty failed", err);
      setServerError("Could not reach the party.");
    }
  };

  const leaveParty = async () => {
    await partyManager.leaveParty();
    setServerError(null);
  };

  const saveRollNotes = (nextNotes: Record<string, string>) => {
    if (party.connected) partyManager.updateRollNotes(nextNotes);
  };

  const setRollNotes = (
    updater: Record<string, string> | ((prev: Record<string, string>) => Record<string, string>),
  ) => {
    const prev = party.connected ? party.rollNotes : localRollNotes;
    const next = typeof updater === "function" ? updater(prev) : updater;
    if (party.connected) {
      partyManager.updateRollNotes(next);
    } else {
      setLocalRollNotes(next);
    }
  };

  // Push local character changes to peers whenever we're in a party.
  useEffect(() => {
    if (party.connected) partyManager.updateMyCharacters(characters);
  }, [characters, party.connected]);

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
        <Image
          source={require("@/assets/images/aob-logo.png")}
          resizeMode="contain"
          style={styles.logo}
          accessibilityLabel="Assault of Bronze — Lightweight Roleplay System"
        />
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
              <Pressable key={hero.id} testID={`shared-hero-${hero.id}`} onPress={() => setSelectedSharedHero(hero)} style={[styles.sharedHeroChip, { borderColor: colors.borderStrong, backgroundColor: colors.surface }]}>
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
        contentContainerStyle={{ padding: 16, paddingBottom: 120 + insets.bottom, gap: 8 }}
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
              {section.key === "monster" ? "No monsters yet. Add one below." : "No heroes yet. Roll a new one below."}
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
              onPress={() => router.push(`/character/${item.id}`)}
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
                  {item.className || (item.kind === "monster" ? "Monster" : "No class")} • Lvl {item.level || "1"}
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
            <Pressable
              testID={`character-row-${item.id}-duplicate`}
              onPress={() => duplicateCharacter(item)}
              hitSlop={6}
              style={({ pressed }) => [
                styles.rowAction,
                {
                  borderLeftColor: colors.borderStrong,
                  backgroundColor: pressed ? colors.brandTertiary : "transparent",
                },
              ]}
            >
              <Icon name="content-copy" size={20} color={colors.brandPrimary} />
            </Pressable>
            <Pressable
              testID={`character-row-${item.id}-delete`}
              onPress={() => confirmDelete(item)}
              hitSlop={6}
              style={({ pressed }) => [
                styles.rowDelete,
                {
                  borderLeftColor: colors.borderStrong,
                  backgroundColor: pressed ? colors.brandSecondary : "transparent",
                },
              ]}
            >
              <Icon name="trash-can-outline" size={20} color={colors.brandSecondary} />
            </Pressable>
          </View>
        )}
      />

      <View style={[styles.fabBar, { bottom: 20 + insets.bottom }]} pointerEvents="box-none">
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
            New Monster
          </Text>
        </Pressable>
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
              Delete {pendingDelete?.kind === "monster" ? "monster" : "hero"}?
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

      <Modal transparent visible={helpOpen} animationType="slide" onRequestClose={() => setHelpOpen(false)}>
        <View style={styles.helpBackdropTop}>
          <KeyboardAvoidingView
            behavior={Platform.OS === "ios" ? "padding" : "height"}
            keyboardVerticalOffset={insets.top}
            style={styles.modalKeyboardAvoiding}
          >
          <View style={[styles.helpCard, { backgroundColor: colors.surface, borderColor: colors.borderStrong }]}> 
            <View style={styles.helpHeader}>
              <Text style={[styles.helpTitle, { color: colors.onSurface, fontFamily: fonts.displayBold }]}>{helpMode === "lore" ? "Lore" : "Help"}</Text>
              <Pressable testID="help-close" onPress={() => setHelpOpen(false)} hitSlop={8}>
                <Icon name="close" size={22} color={colors.onSurface} />
              </Pressable>
            </View>
            {helpMode === "help" && <View style={[styles.helpTabs, { borderBottomColor: colors.divider }]}> 
              {HELP_TABS.map((tab) => (
                <Pressable
                  key={tab.key}
                  testID={`help-tab-${tab.key}`}
                  onPress={() => setHelpTab(tab.key)}
                  style={[
                    styles.helpTab,
                    { borderBottomColor: helpTab === tab.key ? colors.brandPrimary : "transparent" },
                  ]}
                >
                  <Text style={[styles.helpTabText, { color: helpTab === tab.key ? colors.brandPrimary : colors.muted, fontFamily: fonts.displayBold }]}>
                    {tab.label}
                  </Text>
                </Pressable>
              ))}
            </View>}
            {helpMode === "lore" && <View style={[styles.helpTabs, { borderBottomColor: colors.divider }]}> 
              {LORE_TABS.map((tab) => (
                <Pressable
                  key={tab.key}
                  testID={`lore-tab-${tab.key}`}
                  onPress={() => setLoreTab(tab.key)}
                  style={[
                    styles.helpTab,
                    { borderBottomColor: loreTab === tab.key ? colors.brandPrimary : "transparent" },
                  ]}
                >
                  <Text style={[styles.helpTabText, { color: loreTab === tab.key ? colors.brandPrimary : colors.muted, fontFamily: fonts.displayBold }]}>
                    {tab.label}
                  </Text>
                </Pressable>
              ))}
            </View>}
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
                  <Text style={[styles.gmSectionTitle, { color: colors.onSurface, fontFamily: fonts.displayBold }]}>Local Wi-Fi Party</Text>
                </View>
                <Text style={[styles.helpText, { color: colors.onSurface, fontFamily: fonts.body }]}>Create a private room for nearby players. Everyone must be on the same Wi-Fi (no internet required).</Text>
                {!partySupported && (
                  <View style={[styles.serverResult, { borderColor: colors.error, backgroundColor: "rgba(155,45,45,0.10)" }]}>
                    <Text style={[styles.serverError, { color: colors.error, fontFamily: fonts.displayBold }]}>Not available here</Text>
                    <Text style={[styles.serverUrl, { color: colors.onSurface, fontFamily: fonts.body }]}>{PARTY_UNSUPPORTED_REASON}</Text>
                  </View>
                )}
                <Pressable testID="create-lan-server" onPress={createLanServer} disabled={serverCreating || !partySupported || party.role !== "idle"} style={[styles.serverButton, { borderColor: colors.borderStrong, backgroundColor: colors.brandPrimary, opacity: (serverCreating || !partySupported || party.role !== "idle") ? 0.5 : 1 }]}>
                  <Icon name="server-network" size={18} color={colors.onBrandPrimary} />
                  <Text style={[styles.gmButtonText, { color: colors.onBrandPrimary, fontFamily: fonts.displayBold }]}>{serverCreating ? "Starting…" : "Create Party"}</Text>
                </Pressable>
                {serverInfo && (
                  <View style={[styles.serverResult, { borderColor: colors.success, backgroundColor: "rgba(46,111,64,0.12)" }]}>
                    <Text style={[styles.serverResultText, { color: colors.onSurface, fontFamily: fonts.displayBold }]}>Room code: {serverInfo.room_code}</Text>
                    <Text selectable style={[styles.serverUrl, { color: colors.onSurface, fontFamily: fonts.body }]}>{serverInfo.join_url}</Text>
                    <Text style={[styles.serverUrl, { color: colors.muted, fontFamily: fonts.body }]}>Players in room: {party.peers.length}</Text>
                  </View>
                )}
                {partyError && <Text style={[styles.serverError, { color: colors.error, fontFamily: fonts.body }]}>{partyError}</Text>}
                <View style={[styles.serverJoinDivider, { borderTopColor: colors.divider }]} />
                <Text style={[styles.gmSectionTitle, { color: colors.onSurface, fontFamily: fonts.displayBold }]}>Join a Party</Text>
                <Text style={[styles.gmHint, { color: colors.muted, fontFamily: fonts.body }]}>Enter the room code shared by the Game Master.</Text>
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
                  <Pressable testID="join-lan-server" onPress={joinLanServer} disabled={!partySupported || party.role !== "idle"} style={[styles.serverJoinButton, { borderColor: colors.borderStrong, backgroundColor: colors.surfaceSecondary, opacity: (!partySupported || party.role !== "idle") ? 0.5 : 1 }]}>
                    <Icon name="login" size={18} color={colors.brandPrimary} />
                    <Text style={[styles.gmButtonText, { color: colors.onSurface, fontFamily: fonts.displayBold }]}>Join</Text>
                  </Pressable>
                </View>
                {joinedRoom && <Text style={[styles.serverJoined, { color: colors.success, fontFamily: fonts.displayBold }]}>Joined room {joinedRoom} · {party.peers.length} player{party.peers.length === 1 ? "" : "s"}</Text>}
                {party.role !== "idle" && (
                  <Pressable testID="leave-party" onPress={leaveParty} style={[styles.serverButton, { borderColor: colors.borderStrong, backgroundColor: colors.surface, marginTop: 4 }]}>
                    <Icon name="exit-run" size={18} color={colors.error} />
                    <Text style={[styles.gmButtonText, { color: colors.error, fontFamily: fonts.displayBold }]}>Leave Party</Text>
                  </Pressable>
                )}
              </View>
              </ScrollView>
            )}
            {(helpMode === "lore" || helpTab !== "party") && <ScrollView contentContainerStyle={styles.helpBody}>
              {(() => {
                if (helpMode === "help") {
                  const tab = HELP_TABS.find((entry) => entry.key === helpTab) ?? HELP_TABS[0];
                  return <Text style={[styles.helpText, { color: colors.onSurface, fontFamily: fonts.body }]}>{tab.body}</Text>;
                }
                const tab = LORE_TABS.find((entry) => entry.key === loreTab) ?? LORE_TABS[0];
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

      <Modal transparent visible={gmToolsOpen} animationType="slide" onRequestClose={() => setGmToolsOpen(false)}>
        <View style={styles.helpBackdrop}>
          <KeyboardAvoidingView
            behavior={Platform.OS === "ios" ? "padding" : undefined}
            keyboardVerticalOffset={Platform.OS === "ios" ? insets.top : 0}
            style={styles.modalKeyboardAvoiding}
          >
          <View style={[styles.gmCard, { backgroundColor: colors.surface, borderColor: colors.borderStrong, paddingTop: insets.top, paddingBottom: insets.bottom + 12 }]}> 
            <View style={styles.helpHeader}>
              <Text style={[styles.helpTitle, { color: colors.onSurface, fontFamily: fonts.displayBold }]}>GM Tools</Text>
              <Pressable testID="gm-tools-close" onPress={() => setGmToolsOpen(false)} hitSlop={8}>
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
              <Text style={[styles.gmHint, { color: colors.muted, fontFamily: fonts.body }]}>Higher numbers act first. Tap a monster to open its sheet.</Text>
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
                  <Text style={[styles.gmWeaponMeta, { color: colors.muted, fontFamily: fonts.body }]}>{combatant.kind === "monster" ? "Monster" : "Hero"}</Text>
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
                          onBlur={() => saveRollNotes(rollNotes)}
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

      <Modal transparent visible={selectedSharedHero != null} animationType="slide" onRequestClose={() => setSelectedSharedHero(null)}>
        <View style={styles.helpBackdrop}>
          <View style={[styles.sharedHeroCard, { backgroundColor: colors.surface, borderColor: colors.borderStrong }]}>
            <View style={styles.helpHeader}>
              <Text style={[styles.helpTitle, { color: colors.onSurface, fontFamily: fonts.displayBold }]}>{selectedSharedHero?.name || "Shared Hero"}</Text>
              <Pressable testID="shared-hero-close" onPress={() => setSelectedSharedHero(null)} hitSlop={8}><Icon name="close" size={22} color={colors.onSurface} /></Pressable>
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
  logo: { width: "100%", maxWidth: 320, height: 80 },
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
    flexDirection: "row",
    alignItems: "stretch",
    borderWidth: 2.5,
    overflow: "hidden",
  },
  rowMain: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 12,
  },
  rowDelete: {
    width: 52,
    borderLeftWidth: 2,
    alignItems: "center",
    justifyContent: "center",
  },
  rowAction: {
    width: 52,
    borderLeftWidth: 2,
    alignItems: "center",
    justifyContent: "center",
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
