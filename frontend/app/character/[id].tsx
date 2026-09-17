import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  KeyboardAvoidingView,
  Platform,
  TextInput,
  ActivityIndicator,
  Image,
  Modal,
  useWindowDimensions,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Icon from "@react-native-vector-icons/material-design-icons";
import * as ImagePicker from "expo-image-picker";
import * as Haptics from "expo-haptics";
import { fonts, setThemeAge, useTheme } from "@/src/theme";
import {
  Ability,
  Character,
  CustomSection,
  InventoryItem,
  RollHistoryEntry,
  RollMode,
  RollVerdict,
  StatBlock,
  Weapon,
  ROLL_HISTORY_MAX,
  createEmptyAbility,
  createEmptyInventoryItem,
  createEmptyWeapon,
  genId,
} from "@/src/types";
import { deleteCharacter, getCharacter, upsertCharacter } from "@/src/storage/characters";
import HpTracker from "@/src/components/HpTracker";
import StatCard from "@/src/components/StatCard";
import FlatStatCard, { abbreviateStat } from "@/src/components/FlatStatCard";
import LabeledField from "@/src/components/LabeledField";
import AbilityCard from "@/src/components/AbilityCard";
import CustomSectionCard from "@/src/components/CustomSectionCard";
import DiceRollModal, { RollRequest } from "@/src/components/DiceRollModal";
import MeleeDmgCell from "@/src/components/MeleeDmgCell";
import WeaponCard, { getAttackTarget } from "@/src/components/WeaponCard";
import InventoryList from "@/src/components/InventoryList";
import RollHistoryList from "@/src/components/RollHistoryList";
import PickerSheet, { PickerEntry } from "@/src/components/PickerSheet";
import CurrencyPurse from "@/src/components/CurrencyPurse";
import ExportSheetModal from "@/src/components/ExportSheetModal";
import ImportEntityModal from "@/src/components/ImportEntityModal";
import { ExportEntity, ExportEntityType } from "@/src/storage/sheetTransfer";
import { valueForRef, labelForRef } from "@/src/components/StatPickerModal";
import { useKeyboardBottomSpace } from "@/src/utils/useKeyboardBottomSpace";
import { AgeId, DEFAULT_AGE_ID } from "@/src/ages";
import { getAgeCatalog } from "@/src/ageCatalog";

type AbilityKey = "oncePerTurn" | "oncePerRest" | "heroAbilities";

export default function CharacterSheetScreen() {
  const { colors } = useTheme();
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const isWideScreen = width >= 768;
  const { id, age } = useLocalSearchParams<{ id: string; age?: string }>();
  const characterAge: AgeId = age === "age-of-war" ? "age-of-war" : DEFAULT_AGE_ID;
  const ageCatalog = getAgeCatalog(characterAge);

  useEffect(() => {
    setThemeAge(characterAge);
  }, [characterAge]);
  const [char, setChar] = useState<Character | null>(null);
  const [roll, setRoll] = useState<RollRequest | null>(null);
  const [rollMode, setRollMode] = useState<RollMode>("normal");
  const [boostPending, setBoostPending] = useState(false);
  const [heroPointsWarning, setHeroPointsWarning] = useState<string | null>(null);
  const [actionMarkers, setActionMarkers] = useState({ movement: false, attackAbility: false, bonus: false });
  const [weaponPickerOpen, setWeaponPickerOpen] = useState(false);
  const [itemPickerOpen, setItemPickerOpen] = useState(false);
  const [abilityPickerFor, setAbilityPickerFor] = useState<AbilityKey | null>(null);
  const [exportModalOpen, setExportModalOpen] = useState(false);
  const [entityToExport, setEntityToExport] = useState<{ type: ExportEntityType; value: ExportEntity } | null>(null);
  const [entityImportType, setEntityImportType] = useState<ExportEntityType | null>(null);
  const [deathSaveState, setDeathSaveState] = useState({
    open: false,
    failures: 0,
    successes: 0,
    dead: false,
  });
  const keyboardSpace = useKeyboardBottomSpace(320);
  const saveTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  const vitalitySaveTarget = useMemo(() => {
    if (!char || char.kind !== "hero") return 15;
    return valueForRef(char.stats, { kind: "sub", statKey: "STR", subIndex: 3 }) ?? 15;
  }, [char]);

  useEffect(() => {
    if (!char || char.kind !== "hero") {
      setDeathSaveState({ open: false, failures: 0, successes: 0, dead: false });
      return;
    }

    if (char.hp <= 0) {
      setDeathSaveState((prev) => (prev.open ? prev : { ...prev, open: true, dead: false }));
      return;
    }

    setDeathSaveState({ open: false, failures: 0, successes: 0, dead: false });
  }, [char]);

  useEffect(() => {
    (async () => {
      if (!id) return;
      const c = await getCharacter(id, characterAge);
      setChar(c);
    })();
  }, [id, characterAge]);

  const update = (patch: Partial<Character>) => {
    setChar((prev) => {
      if (!prev) return prev;
      const next = { ...prev, ...patch };
      if (saveTimeout.current) clearTimeout(saveTimeout.current);
      saveTimeout.current = setTimeout(() => {
        upsertCharacter(next, next.age);
      }, 400);
      return next;
    });
  };

  const exportEntity = (type: ExportEntityType, value: ExportEntity) => {
    setEntityToExport({ type, value });
  };
  const importEntity = (entity: ExportEntity) => {
    if (!char || !entityImportType) return;
    if (entityImportType === "weapon") update({ weapons: [...char.weapons, entity as Weapon] });
    if (entityImportType === "item") update({ inventoryItems: [...char.inventoryItems, entity as InventoryItem] });
    if (entityImportType === "ability" && abilityPickerFor) {
      setAbilities(abilityPickerFor, [...(char[abilityPickerFor] as Ability[]), entity as Ability]);
    }
  };

  const triggerStatRoll = (label: string, target: number) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setRoll({ label, target, mode: rollMode, boost: boostPending });
    if (rollMode !== "normal") setRollMode("normal");
    if (boostPending) setBoostPending(false);
  };

  const pickPortrait = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) return;
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.6,
      base64: true,
    });
    if (!result.canceled && result.assets?.[0]) {
      const asset = result.assets[0];
      // Persist as a data URI so it survives beyond the picker's temp file lifetime.
      const uri = asset.base64
        ? `data:image/jpeg;base64,${asset.base64}`
        : asset.uri;
      update({ portraitUri: uri });
    }
  };

  const updateStat = (idx: number, next: StatBlock) => {
    if (!char) return;
    const stats = char.stats.map((s, i) => (i === idx ? next : s));
    update({ stats });
  };

  const changeHeroPoints = (delta: number) => {
    if (!char) return;
    const newVal = Math.max(0, Math.min(10, char.heroPoints + delta));
    update({ heroPoints: newVal });
    Haptics.selectionAsync();
  };

  const setAbilities = (key: AbilityKey, list: Ability[]) => update({ [key]: list } as any);

  const addAbility = (key: AbilityKey) => {
    if (!char) return;
    Haptics.selectionAsync();
    setAbilityPickerFor(key);
  };

  const addCustomAbility = (key: AbilityKey) => {
    if (!char) return;
    const cur = char[key] as Ability[];
    setAbilities(key, [...cur, createEmptyAbility()]);
    Haptics.selectionAsync();
  };

  const addPresetAbility = (key: AbilityKey, entry: PickerEntry) => {
    if (!char) return;
    const preset = ageCatalog.abilities.find((a) => a.id === entry.id);
    if (!preset) return;
    const cur = char[key] as Ability[];
    setAbilities(key, [
      ...cur,
      {
        id: genId(),
        title: preset.name,
        description: preset.description,
        linkedStat: preset.linkedStat,
        effectRoll: preset.effectRoll ?? "",
        effectType: preset.effectType,
        used: false,
      },
    ]);
    Haptics.selectionAsync();
  };

  const updateAbility = (key: AbilityKey, idx: number, next: Ability) => {
    if (!char) return;
    const cur = char[key] as Ability[];
    setAbilities(
      key,
      cur.map((a, i) => (i === idx ? next : a)),
    );
  };

  const deleteAbility = (key: AbilityKey, idx: number) => {
    if (!char) return;
    const cur = char[key] as Ability[];
    setAbilities(
      key,
      cur.filter((_, i) => i !== idx),
    );
    Haptics.selectionAsync();
  };

  const useAbility = (ability: Ability) => {
    if (!char) return;
    const isHero = char.heroAbilities.some((a) => a.id === ability.id);
    const isOncePerRest = char.oncePerRest.some((a) => a.id === ability.id);

    if (isHero && char.heroPoints < 1) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      setHeroPointsWarning("You need at least 1 Hero Point to use a Hero Ability.");
      return;
    }
    if (isOncePerRest && ability.used) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      setHeroPointsWarning("Already used. Take a Long Rest to refresh this ability.");
      return;
    }
    if (isHero && ability.used) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      setHeroPointsWarning("Already used. Take a Long Rest to refresh this ability.");
      return;
    }

    const target = valueForRef(char.stats, ability.linkedStat) ?? undefined;
    const label = ability.title || "Ability";
    const effect =
      ability.effectType !== "none" && ability.effectRoll.trim()
        ? { notation: ability.effectRoll.trim(), type: ability.effectType as "damage" | "healing" }
        : undefined;

    if (target == null && !effect) {
      if (!isHero && !char.oncePerTurn.some((a) => a.id === ability.id)) return;
      if (isHero) update({ heroPoints: Math.max(0, char.heroPoints - 1) });
      if (isHero) {
        update({
          heroAbilities: char.heroAbilities.map((a) =>
            a.id === ability.id ? { ...a, used: true } : a,
          ),
        });
      } else {
        update({
          oncePerTurn: char.oncePerTurn.map((a) =>
            a.id === ability.id ? { ...a, used: true } : a,
          ),
        });
      }
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      return;
    }

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    // Spend the Hero Point *after* validation succeeds.
    if (isHero) {
      update({ heroPoints: Math.max(0, char.heroPoints - 1) });
    }
    // Lock Once Per Rest abilities until the next Long Rest.
    if (isOncePerRest) {
      const nextList = char.oncePerRest.map((a) =>
        a.id === ability.id ? { ...a, used: true } : a,
      );
      update({ oncePerRest: nextList });
    }

    if (target == null) {
      setRoll({ label, effect });
      return;
    }

    const linkedLabel = labelForRef(char.stats, ability.linkedStat);
    setRoll({
      label: `${label} · ${linkedLabel}`,
      target,
      effect,
      mode: rollMode,
      boost: boostPending,
    });
    if (rollMode !== "normal") setRollMode("normal");
    if (boostPending) setBoostPending(false);
  };

  const addCustomSection = () => {
    if (!char) return;
    const newSection: CustomSection = { id: genId(), title: "", content: "" };
    update({ customSections: [...char.customSections, newSection] });
    Haptics.selectionAsync();
  };

  const addWeapon = () => {
    if (!char) return;
    Haptics.selectionAsync();
    setWeaponPickerOpen(true);
  };

  const addCustomWeapon = () => {
    if (!char) return;
    update({ weapons: [...char.weapons, createEmptyWeapon()] });
    Haptics.selectionAsync();
  };

  const addPresetWeapon = (p: PickerEntry) => {
    if (!char) return;
    const preset = ageCatalog.weapons.find((w) => w.id === p.id);
    if (!preset) return;
    update({
      weapons: [
        ...char.weapons,
        {
          id: genId(),
          name: `${preset.name} (${preset.price})`,
          description: preset.notes ?? "",
          attackKind: preset.attackKind,
          damageRoll: preset.damageRoll,
        },
      ],
    });
    Haptics.selectionAsync();
  };

  const updateWeapon = (idx: number, next: Weapon) => {
    if (!char) return;
    update({ weapons: char.weapons.map((w, i) => (i === idx ? next : w)) });
  };

  const deleteWeapon = (idx: number) => {
    if (!char) return;
    update({ weapons: char.weapons.filter((_, i) => i !== idx) });
    Haptics.selectionAsync();
  };

  const useWeapon = (weapon: Weapon) => {
    if (!char) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const { label, target } = getAttackTarget(char.stats, weapon.attackKind);
    const notation = weapon.damageRoll.trim();
    const effect = notation ? { notation, type: "damage" as const } : undefined;
    const weaponName = weapon.name.trim() || (weapon.attackKind === "melee" ? "Melee weapon" : "Ranged weapon");
    setRoll({ label: `${weaponName} · ${label}`, target, effect, mode: rollMode, boost: boostPending });
    if (rollMode !== "normal") setRollMode("normal");
    if (boostPending) setBoostPending(false);
  };

  const spendBoost = () => {
    if (!char) return;
    if (boostPending) {
      // Already pending — allow cancelling to reclaim... actually just toggle off silently.
      setBoostPending(false);
      Haptics.selectionAsync();
      return;
    }
    if (char.heroPoints < 1) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      setHeroPointsWarning("You need at least 1 Hero Point to boost a roll.");
      return;
    }
    update({ heroPoints: Math.max(0, char.heroPoints - 1) });
    setBoostPending(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  };

  const logRoll = (entry: RollHistoryEntry) => {
    setChar((prev) => {
      if (!prev) return prev;
      const next: Character = {
        ...prev,
        rollHistory: [entry, ...prev.rollHistory].slice(0, ROLL_HISTORY_MAX),
      };
      if (saveTimeout.current) clearTimeout(saveTimeout.current);
      saveTimeout.current = setTimeout(() => upsertCharacter(next, next.age), 400);
      return next;
    });
  };

  const clearHistory = () => {
    if (!char) return;
    update({ rollHistory: [] });
    Haptics.selectionAsync();
  };

  const applyLongRest = (nextChar?: Character) => {
    const source = nextChar ?? char;
    if (!source || source.kind !== "hero") return;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    const clearUsed = (list: Ability[]) => list.map((a) => ({ ...a, used: false }));
    update({
      hp: source.maxHp,
      oncePerTurn: clearUsed(source.oncePerTurn),
      oncePerRest: clearUsed(source.oncePerRest),
      heroAbilities: clearUsed(source.heroAbilities),
    });
  };

  const longRest = () => {
    applyLongRest();
  };

  const triggerDeathSave = () => {
    if (!char || char.kind !== "hero") return;
    setRoll({
      label: "Vitality Save",
      target: vitalitySaveTarget,
      mode: "normal",
    });
  };

  const handleDeathSaveResult = (verdict: RollVerdict) => {
    if (!char || char.kind !== "hero") return;

    setDeathSaveState((prev) => {
      let failures = prev.failures;
      let successes = prev.successes;

      if (verdict === "success") {
        successes += 1;
      } else if (verdict === "crit-success") {
        successes += 2;
      } else if (verdict === "crit-fail") {
        failures += 2;
      } else {
        failures += 1;
      }

      if (successes >= 3) {
        update({ hp: 1 });
        setRoll(null);
        return { open: false, failures: 0, successes: 0, dead: false };
      }

      if (failures >= 3) {
        update({ hp: 0 });
        setRoll(null);
        return { open: true, failures: 3, successes: 0, dead: true };
      }

      return { open: true, failures, successes, dead: false };
    });
  };

  const finishDeadCharacter = async () => {
    if (!char || char.kind !== "hero") return;
    await deleteCharacter(char.id, char.age);
    router.replace("/");
  };

  const recoverFromDeath = () => {
    if (!char || char.kind !== "hero") return;
    applyLongRest();
    setDeathSaveState({ open: false, failures: 0, successes: 0, dead: false });
    setRoll(null);
  };

  const cycleRollMode = () => {
    const order: RollMode[] = ["normal", "advantage", "disadvantage"];
    const idx = order.indexOf(rollMode);
    setRollMode(order[(idx + 1) % order.length]);
    Haptics.selectionAsync();
  };

  const addInventoryItem = () => {
    if (!char) return;
    Haptics.selectionAsync();
    setItemPickerOpen(true);
  };

  const addCustomInventoryItem = () => {
    if (!char) return;
    update({ inventoryItems: [...char.inventoryItems, createEmptyInventoryItem()] });
    Haptics.selectionAsync();
  };

  const addPresetItem = (p: PickerEntry) => {
    if (!char) return;
    const preset = ageCatalog.items.find((it) => it.id === p.id);
    if (!preset) return;
    const label = preset.price ? `${preset.name} (${preset.price})` : preset.name;
    update({
      inventoryItems: [...char.inventoryItems, createEmptyInventoryItem(label, preset.notes ?? "")],
    });
    Haptics.selectionAsync();
  };

  const setInventoryItems = (items: InventoryItem[]) => {
    update({ inventoryItems: items });
  };

  const useInventoryItem = (item: InventoryItem) => {
    if (!char || !item.description) return;
    const diceMatch = item.description.match(/\b(\d+\s*[xX*]?\s*d\s*\d+(?:(?:\s*[+-]\s*)(?:\d+\s*[xX*]?\s*d\s*\d+|\d+))*)\b/i);
    if (!diceMatch) return;
    const type = /\b(heal|heals|healing|healed|restore|restores|restored)\b/i.test(item.description)
      ? "healing"
      : /\b(damage|damages|deal|deals)\b/i.test(item.description)
        ? "damage"
        : null;
    if (!type) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setRoll({
      label: item.name.trim() || "Inventory item",
      effect: { notation: diceMatch[1], type },
    });
  };

  const updateCustomSection = (idx: number, next: CustomSection) => {
    if (!char) return;
    update({
      customSections: char.customSections.map((s, i) => (i === idx ? next : s)),
    });
  };

  const deleteCustomSection = (idx: number) => {
    if (!char) return;
    update({ customSections: char.customSections.filter((_, i) => i !== idx) });
    Haptics.selectionAsync();
  };

  const statPairs = useMemo(() => {
    if (!char) return [];
    const pairs: [StatBlock, StatBlock][] = [];
    for (let i = 0; i < char.stats.length; i += 2) {
      pairs.push([char.stats[i], char.stats[i + 1]]);
    }
    return pairs;
  }, [char]);

  // For monsters we flatten stat blocks into a single list of individual cards
  // (main stat + each sub-skill), each rendered like a "main stat" header.
  type FlatStat = { key: string; short: string; full: string; value: number; set: (n: number) => void };
  const flatStats: FlatStat[] = useMemo(() => {
    if (!char) return [];
    const out: FlatStat[] = [];
    char.stats.forEach((block, blockIdx) => {
      out.push({
        key: `main-${block.key}`,
        short: block.key,
        full: block.name,
        value: block.value,
        set: (n) => updateStat(blockIdx, { ...block, value: n }),
      });
      block.subs.forEach((sub, subIdx) => {
        out.push({
          key: `sub-${block.key}-${subIdx}`,
          short: abbreviateStat(sub.name),
          full: sub.name,
          value: sub.value,
          set: (n) => {
            const nextSubs = block.subs.map((s, i) => (i === subIdx ? { ...s, value: n } : s));
            updateStat(blockIdx, { ...block, subs: nextSubs });
          },
        });
      });
    });
    return out;
  }, [char]);
  const flatStatPairs = useMemo(() => {
    const pairs: [FlatStat, FlatStat | undefined][] = [];
    for (let i = 0; i < flatStats.length; i += 2) {
      pairs.push([flatStats[i], flatStats[i + 1]]);
    }
    return pairs;
  }, [flatStats]);

  if (!char) {
    return (
      <View style={[styles.loading, { backgroundColor: colors.surface }]}>
        <ActivityIndicator color={colors.brandPrimary} />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.surface }]}>
      <View
        style={[
          styles.headerBar,
          {
            paddingTop: insets.top + 8,
            borderBottomColor: colors.borderStrong,
            backgroundColor: colors.surfaceSecondary,
          },
        ]}
      >
        <Pressable
          testID="back-btn"
          onPress={() => router.back()}
          hitSlop={12}
          style={styles.backBtn}
        >
          <Icon name="chevron-left" size={28} color={colors.onSurface} />
        </Pressable>
        <View style={{ flex: 1 }} />
        <Pressable
          testID="export-sheet-btn"
          onPress={() => setExportModalOpen(true)}
          hitSlop={12}
          style={({ pressed }) => [
            styles.headerActionBtn,
            { backgroundColor: pressed ? colors.brandTertiary : "transparent" },
          ]}
          accessibilityLabel="Export Sheet"
        >
          <Icon name="file-export-outline" size={22} color={colors.brandPrimary} />
        </Pressable>
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          testID="character-scroll"
          keyboardShouldPersistTaps="handled"
          scrollEnabled={!isWideScreen}
          style={isWideScreen && styles.sheetScrollWide}
          contentContainerStyle={[
            styles.sheetContent,
            { paddingBottom: 40 + insets.bottom + keyboardSpace },
            isWideScreen && styles.sheetContentWide,
          ]}
        >
          <View style={[styles.sheetColumns, isWideScreen && styles.sheetColumnsWide]}>
            <ScrollView
              nestedScrollEnabled
              scrollEnabled={isWideScreen}
              keyboardShouldPersistTaps="handled"
              style={[styles.overviewColumn, isWideScreen && styles.overviewColumnWide]}
              contentContainerStyle={styles.overviewContent}
            >
              <Image
                source={require("@/assets/images/aob-logo.png")}
                resizeMode="contain"
                style={styles.sheetLogo}
                accessibilityLabel="Assault of Bronze — Lightweight Roleplay System"
              />
              <View style={styles.topRow}>
            <Pressable
              testID="portrait-picker"
              onPress={pickPortrait}
              style={[
                styles.portrait,
                { borderColor: colors.borderStrong, backgroundColor: colors.surfaceTertiary },
              ]}
            >
              {char.portraitUri ? (
                <Image source={{ uri: char.portraitUri }} style={styles.portraitImg} />
              ) : (
                <View style={styles.portraitPlaceholder}>
                  <Icon name="account-plus" size={40} color={colors.brandPrimary} />
                  <Text style={[styles.portraitLabel, { color: colors.muted, fontFamily: fonts.display }]}>
                    Tap to add portrait
                  </Text>
                </View>
              )}
            </Pressable>

            <View style={styles.identityCol}>
              <LabeledField
                label="Name"
                testID="input-name"
                value={char.name}
                onChangeText={(t) => update({ name: t })}
                placeholder="Character name"
              />
              <LabeledField
                label="Class"
                testID="input-class"
                value={char.className}
                onChangeText={(t) => update({ className: t })}
                placeholder="Class"
              />
              <LabeledField
                label="Level"
                testID="input-level"
                value={char.level}
                onChangeText={(t) => update({ level: t.replace(/\D/g, "").slice(0, 2) })}
                keyboardType="number-pad"
                placeholder="1"
              />
            </View>
          </View>

          <View style={[styles.combatBox, { borderColor: colors.borderStrong }]}>
            <HpTracker
              hp={char.hp}
              maxHp={char.maxHp}
              onChange={(hp) => update({ hp })}
              editableMax={char.kind === "monster"}
              onMaxChange={(maxHp) => update({ maxHp, hp: Math.min(char.hp, maxHp) })}
            />
            <View style={[styles.divider, { backgroundColor: colors.borderStrong }]} />
            <View style={styles.combatRow}>
              <View style={[styles.combatCell, { borderColor: colors.borderStrong, backgroundColor: colors.surface }]}>
                <Text style={[styles.combatLabel, { color: colors.muted, fontFamily: fonts.displayBold }]}>
                  ARMOUR
                </Text>
                <TextInput
                  testID="input-armour"
                  value={char.armour}
                  onChangeText={(t) => update({ armour: t.replace(/\D/g, "").slice(0, 3) })}
                  style={[styles.combatValue, { color: colors.onSurface, borderColor: colors.border, fontFamily: fonts.displayBold }]}
                  keyboardType="number-pad"
                  maxLength={3}
                />
              </View>
              <MeleeDmgCell
                value={char.meleeDmg}
                onChange={(t) => update({ meleeDmg: t })}
                onRoll={(notation) => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                  setRoll({ label: "Melee Damage", effect: { notation, type: "damage" } });
                }}
              />
            </View>
          </View>

          <View style={[styles.actionRow, isWideScreen && styles.actionRowWide]}>
            <Pressable
              testID="roll-mode-toggle"
              onPress={cycleRollMode}
              style={({ pressed }) => [
                styles.actionChip,
                isWideScreen && styles.actionChipWide,
                {
                  borderColor: colors.borderStrong,
                  backgroundColor:
                    rollMode === "advantage"
                      ? "rgba(46,111,64,0.15)"
                      : rollMode === "disadvantage"
                        ? "rgba(138,42,43,0.15)"
                        : pressed
                          ? colors.brandTertiary
                          : colors.surfaceSecondary,
                },
              ]}
            >
              <Icon
                name={
                  rollMode === "advantage"
                    ? "arrow-up-bold-circle-outline"
                    : rollMode === "disadvantage"
                      ? "arrow-down-bold-circle-outline"
                      : "dice-multiple-outline"
                }
                size={16}
                color={
                  rollMode === "advantage"
                    ? colors.success
                    : rollMode === "disadvantage"
                      ? colors.error
                      : colors.onSurface
                }
              />
              <Text style={[styles.actionText, { color: colors.onSurface, fontFamily: fonts.displayBold }]}>
                {rollMode === "advantage"
                  ? "Advantage"
                  : rollMode === "disadvantage"
                    ? "Disadvantage"
                    : "Normal roll"}
              </Text>
            </Pressable>
            <Pressable
              testID="long-rest-btn"
              onPress={longRest}
              style={({ pressed }) => [
                styles.actionChip,
                isWideScreen && styles.actionChipWide,
                {
                  borderColor: colors.borderStrong,
                  backgroundColor: pressed ? colors.brandTertiary : colors.brandPrimary,
                },
              ]}
            >
              <Icon name="campfire" size={16} color={colors.onBrandPrimary} />
              <Text
                style={[styles.actionText, { color: colors.onBrandPrimary, fontFamily: fonts.displayBold }]}
              >
                Long Rest
              </Text>
            </Pressable>
          </View>

          {char.kind === "hero" && (
            <CurrencyPurse
              value={char.currency}
              onChange={(currency) => update({ currency })}
            />
          )}

          {char.kind === "monster"
            ? flatStats.map((fs) => (
                <View key={fs.key} style={styles.statRow}>
                  <FlatStatCard
                    testID={`flat-stat-${fs.key}`}
                    short={fs.short}
                    full={fs.full}
                    value={fs.value}
                    onChange={fs.set}
                    onRoll={triggerStatRoll}
                  />
                </View>
              ))
            : statPairs.map((pair, rowIdx) => (
                <View key={rowIdx} style={styles.statRow}>
                  {pair.map((block, colIdx) =>
                    block ? (
                      <StatCard
                        key={block.key}
                        block={block}
                        onChange={(next) => updateStat(rowIdx * 2 + colIdx, next)}
                        onRoll={triggerStatRoll}
                      />
                    ) : (
                      <View key={`empty-${colIdx}`} style={{ flex: 1 }} />
                    ),
                  )}
                </View>
              ))}

          <Text style={[styles.tapHint, { color: colors.muted, fontFamily: fonts.display }]}>
            Tap the stat or skill name to roll a d20 against it.
          </Text>

              {char.kind === "hero" && (
            <View style={[styles.actionMarkers, { borderColor: colors.borderStrong, backgroundColor: colors.surfaceSecondary }]}>
              <View style={styles.actionMarkersHeader}>
                <View style={styles.actionMarkersHeading}>
                  <Text style={[styles.actionMarkersTitle, { color: colors.onSurface, fontFamily: fonts.displayBold }]}>ACTION MARKERS</Text>
                  <Text style={[styles.actionMarkersDescription, { color: colors.muted, fontFamily: fonts.display }]}>During combat, use these markers to keep track of the actions you still have left.</Text>
                </View>
                <Pressable
                  testID="new-turn-btn"
                  onPress={() => setActionMarkers({ movement: false, attackAbility: false, bonus: false })}
                  style={({ pressed }) => [
                    styles.newTurnButton,
                    {
                      borderColor: colors.borderStrong,
                      backgroundColor: pressed ? colors.brandTertiary : colors.brandPrimary,
                    },
                  ]}
                >
                  <Text style={[styles.newTurnText, { color: colors.onBrandPrimary, fontFamily: fonts.displayBold }]}>New Turn</Text>
                </Pressable>
              </View>
              <View style={styles.actionMarkersRow}>
                {([
                  ["movement", "Movement Action"],
                  ["attackAbility", "Attack / Ability Action"],
                  ["bonus", "Bonus Action"],
                ] as const).map(([key, label]) => (
                  <Pressable
                    key={key}
                    testID={`action-marker-${key}`}
                    accessibilityRole="checkbox"
                    accessibilityState={{ checked: actionMarkers[key] }}
                    onPress={() => setActionMarkers((current) => ({ ...current, [key]: !current[key] }))}
                    style={styles.actionMarker}
                  >
                    <Text
                      style={[
                        styles.actionMarkerLabel,
                        {
                          color: colors.onSurface,
                          fontFamily: fonts.display,
                          textDecorationLine: actionMarkers[key] ? "line-through" : "none",
                          opacity: actionMarkers[key] ? 0.6 : 1,
                        },
                      ]}
                    >
                      {label}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </View>
          )}

            </ScrollView>
            <ScrollView
              nestedScrollEnabled
              scrollEnabled={isWideScreen}
              keyboardShouldPersistTaps="handled"
              style={[styles.detailColumn, isWideScreen && styles.detailColumnWide]}
              contentContainerStyle={styles.detailContent}
            >
          <CollapsibleSection
            title="Weapons"
            keyName="weapons"
            count={char.weapons.length}
            emptyLabel="No weapons yet."
            addTestID="add-weapon"
            addLabel="Add Weapon"
            onAdd={addWeapon}
            onImport={() => setEntityImportType("weapon")}
          >
            {char.weapons.map((w, i) => (
              <WeaponCard
                key={w.id}
                testID={`weapon-${i}`}
                weapon={w}
                stats={char.stats}
                onChange={(next) => updateWeapon(i, next)}
                onDelete={() => deleteWeapon(i)}
                onUse={useWeapon}
                onExport={(weapon) => exportEntity("weapon", weapon)}
              />
            ))}
          </CollapsibleSection>

          <AbilitySection
            title="Once Per Turn"
            keyName="oncePerTurn"
            abilities={char.oncePerTurn}
            stats={char.stats}
            onAdd={() => addAbility("oncePerTurn")}
            onChange={(i, a) => updateAbility("oncePerTurn", i, a)}
            onDelete={(i) => deleteAbility("oncePerTurn", i)}
            onUse={useAbility}
            onExport={(ability) => exportEntity("ability", ability)}
            onImport={() => { setAbilityPickerFor("oncePerTurn"); setEntityImportType("ability"); }}
          />

          <AbilitySection
            title="Once Per Rest"
            keyName="oncePerRest"
            abilities={char.oncePerRest}
            stats={char.stats}
            onAdd={() => addAbility("oncePerRest")}
            onChange={(i, a) => updateAbility("oncePerRest", i, a)}
            onDelete={(i) => deleteAbility("oncePerRest", i)}
            onUse={useAbility}
            onExport={(ability) => exportEntity("ability", ability)}
            onImport={() => { setAbilityPickerFor("oncePerRest"); setEntityImportType("ability"); }}
          />

          <HeroSection
            heroPoints={char.heroPoints}
            onHeroPointsChange={changeHeroPoints}
            abilities={char.heroAbilities}
            stats={char.stats}
            onAdd={() => addAbility("heroAbilities")}
            onChange={(i, a) => updateAbility("heroAbilities", i, a)}
            onDelete={(i) => deleteAbility("heroAbilities", i)}
            onUse={useAbility}
            onExport={(ability) => exportEntity("ability", ability)}
            onImport={() => { setAbilityPickerFor("heroAbilities"); setEntityImportType("ability"); }}
            onSpendBoost={spendBoost}
            boostPending={boostPending}
            hidden={char.kind === "monster"}
          />

          <LabeledField
            label="Backstory"
            testID="input-backstory"
            value={char.backstory}
            onChangeText={(t) => update({ backstory: t })}
            multiline
            minHeight={140}
            collapsible
            placeholder="Where your hero comes from…"
          />
          <CollapsibleSection
            title={char.kind === "monster" ? "Dropped Loot" : "Inventory"}
            keyName="inventory"
            count={char.inventoryItems.length}
            emptyLabel="No items yet."
            addTestID="add-inv-item"
            addLabel="Add Item"
            onAdd={addInventoryItem}
            hideAdd
          >
            <InventoryList
              items={char.inventoryItems}
              onChange={setInventoryItems}
              onAdd={addInventoryItem}
              onUse={useInventoryItem}
              onExport={(item) => exportEntity("item", item)}
              onImport={() => setEntityImportType("item")}
            />
          </CollapsibleSection>
          <LabeledField
            label="Notes"
            testID="input-notes"
            value={char.notes}
            onChangeText={(t) => update({ notes: t })}
            multiline
            minHeight={140}
            collapsible
            placeholder="Session notes, quests…"
          />

          <CollapsibleSection
            title="Roll History"
            keyName="rollHistory"
            count={char.rollHistory.length}
            emptyLabel="No rolls yet."
            addTestID="roll-history-clear-hidden"
            addLabel=""
            onAdd={() => {}}
            hideAdd
          >
            <RollHistoryList history={char.rollHistory} onClear={clearHistory} />
          </CollapsibleSection>

          {char.customSections.map((s, i) => (
            <CustomSectionCard
              key={s.id}
              section={s}
              onChange={(next) => updateCustomSection(i, next)}
              onDelete={() => deleteCustomSection(i)}
            />
          ))}

          <Pressable
            testID="add-custom-section"
            onPress={addCustomSection}
            style={({ pressed }) => [
              styles.addSectionBtn,
              {
                borderColor: colors.borderStrong,
                backgroundColor: pressed ? colors.brandTertiary : colors.surfaceSecondary,
              },
            ]}
          >
            <Icon name="plus-box-outline" size={20} color={colors.brandPrimary} />
            <Text style={[styles.addSectionText, { color: colors.onSurface, fontFamily: fonts.displayBold }]}>
              Add Custom Section
            </Text>
          </Pressable>
            </ScrollView>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      <DiceRollModal
        request={roll}
        onClose={() => setRoll(null)}
        onLog={logRoll}
        onResolve={(verdict) => {
          if (char?.kind === "hero" && char.hp <= 0) {
            handleDeathSaveResult(verdict);
          }
        }}
      />

      <Modal
        transparent
        visible={char?.kind === "hero" && char.hp <= 0 && deathSaveState.open && deathSaveState.dead}
        animationType="fade"
        onRequestClose={() => {}}
      >
        <Pressable style={styles.warnBackdrop} onPress={() => {}}>
          <Pressable
            style={[
              styles.warnCard,
              { backgroundColor: colors.surface, borderColor: colors.borderStrong },
            ]}
            onPress={(e) => e.stopPropagation()}
          >
            <Icon name="skull-outline" size={36} color={colors.brandSecondary} />
            <Text style={[styles.warnTitle, { color: colors.onSurface, fontFamily: fonts.displayBold }]}> 
              you died!!
            </Text>
            <Text style={[styles.warnText, { color: colors.muted, fontFamily: fonts.display }]}> 
              Your hero has fallen.
            </Text>
            <View style={[styles.deathSaveTrack, { marginBottom: 6 }]}>
              {Array.from({ length: 3 }, (_, i) => (
                <View
                  key={`dead-fail-${i}`}
                  style={[
                    styles.deathSaveBox,
                    {
                      backgroundColor: i < 3 ? "rgba(220,70,75,0.78)" : colors.surfaceSecondary,
                      borderColor: colors.borderStrong,
                    },
                  ]}
                />
              ))}
            </View>
            <Pressable
              testID="death-save-delete"
              onPress={finishDeadCharacter}
              style={({ pressed }) => [
                styles.warnBtn,
                {
                  borderColor: colors.borderStrong,
                  backgroundColor: pressed ? colors.brandSecondary : colors.brandPrimary,
                },
              ]}
            >
              <Text style={[styles.warnBtnText, { color: colors.onBrandPrimary, fontFamily: fonts.displayBold }]}> 
                Delete Character
              </Text>
            </Pressable>
            <Pressable
              testID="death-save-recover"
              onPress={recoverFromDeath}
              style={({ pressed }) => [
                styles.warnBtn,
                {
                  marginTop: 8,
                  borderColor: colors.borderStrong,
                  backgroundColor: pressed ? colors.surfaceSecondary : colors.surface,
                },
              ]}
            >
              <Text style={[styles.warnBtnText, { color: colors.onSurface, fontFamily: fonts.displayBold }]}> 
                I'm not ready!
              </Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>

      <Modal
        transparent
        visible={char?.kind === "hero" && char.hp <= 0 && deathSaveState.open && !deathSaveState.dead}
        animationType="fade"
        onRequestClose={() => {}}
      >
        <Pressable style={styles.warnBackdrop} onPress={() => {}}>
          <Pressable
            style={[
              styles.warnCard,
              { backgroundColor: colors.surface, borderColor: colors.borderStrong },
            ]}
            onPress={(e) => e.stopPropagation()}
          >
            <Icon name="alert-circle-outline" size={36} color={colors.brandSecondary} />
            <Text style={[styles.warnTitle, { color: colors.onSurface, fontFamily: fonts.displayBold }]}> 
              You are unconscious!
            </Text>
            <Text style={[styles.warnText, { color: colors.muted, fontFamily: fonts.display }]}> 
              Roll Vitality save.
            </Text>
            <View style={styles.deathSaveTrack}>
              {Array.from({ length: 3 }, (_, i) => (
                <View
                  key={`fail-${i}`}
                  style={[
                    styles.deathSaveBox,
                    {
                      backgroundColor: i < deathSaveState.failures ? "rgba(220,70,75,0.78)" : colors.surfaceSecondary,
                      borderColor: colors.borderStrong,
                    },
                  ]}
                />
              ))}
              {Array.from({ length: 3 }, (_, i) => (
                <View
                  key={`success-${i}`}
                  style={[
                    styles.deathSaveBox,
                    {
                      backgroundColor: i < deathSaveState.successes ? "rgba(70,190,105,0.78)" : colors.surfaceSecondary,
                      borderColor: colors.borderStrong,
                    },
                  ]}
                />
              ))}
            </View>
            <Pressable
              testID="death-save-roll"
              onPress={triggerDeathSave}
              style={({ pressed }) => [
                styles.warnBtn,
                {
                  borderColor: colors.borderStrong,
                  backgroundColor: pressed ? colors.brandSecondary : colors.brandPrimary,
                },
              ]}
            >
              <Text style={[styles.warnBtnText, { color: colors.onBrandPrimary, fontFamily: fonts.displayBold }]}> 
                Roll Vitality Save
              </Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>

      <Modal
        transparent
        visible={heroPointsWarning != null}
        animationType="fade"
        onRequestClose={() => setHeroPointsWarning(null)}
      >
        <Pressable
          testID="hp-warning-backdrop"
          style={styles.warnBackdrop}
          onPress={() => setHeroPointsWarning(null)}
        >
          <Pressable
            style={[
              styles.warnCard,
              { backgroundColor: colors.surface, borderColor: colors.borderStrong },
            ]}
            onPress={(e) => e.stopPropagation()}
          >
            <Icon name="alert-circle-outline" size={36} color={colors.brandSecondary} />
            <Text
              testID="hp-warning-title"
              style={[styles.warnTitle, { color: colors.onSurface, fontFamily: fonts.displayBold }]}
            >
              Not Enough Hero Points
            </Text>
            <Text style={[styles.warnText, { color: colors.muted, fontFamily: fonts.display }]}>
              {heroPointsWarning}
            </Text>
            <Pressable
              testID="hp-warning-ok"
              onPress={() => setHeroPointsWarning(null)}
              style={({ pressed }) => [
                styles.warnBtn,
                {
                  borderColor: colors.borderStrong,
                  backgroundColor: pressed ? colors.brandSecondary : colors.brandPrimary,
                },
              ]}
            >
              <Text style={[styles.warnBtnText, { color: colors.onBrandPrimary, fontFamily: fonts.displayBold }]}>
                OK
              </Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>

      <PickerSheet
        visible={weaponPickerOpen}
        testIDPrefix="weapon-picker"
        title="Weapon Library"
        subtitle="Tap a weapon to add it — or forge your own."
        customLabel="Create custom weapon"
        presets={ageCatalog.weapons.map((w) => ({
          id: w.id,
          name: w.name,
          category: w.category,
          meta: `${w.attackKind === "ranged" ? "↦" : "×"} ${w.damageRoll}`,
          price: w.price,
          notes: w.notes,
          icon: w.attackKind === "ranged" ? "bow-arrow" : "sword",
        }))}
        categoryOrder={["Blades", "Big Steel", "Hafted", "Brawler", "Bows & Slings", "Magic & Named"]}
        onClose={() => setWeaponPickerOpen(false)}
        onSelect={addPresetWeapon}
        onCustom={addCustomWeapon}
      />

      <PickerSheet
        visible={itemPickerOpen}
        testIDPrefix="item-picker"
        title="Item Library"
        subtitle="Prices in gold (g), silver (s), bronze (b). Edit anytime."
        customLabel="Create custom item"
        presets={ageCatalog.items.map((it) => ({
          id: it.id,
          name: it.name,
          category: it.category,
          meta: it.price,
          notes: it.notes,
        }))}
        categoryOrder={ageCatalog.itemCategoryOrder}
        onClose={() => setItemPickerOpen(false)}
        onSelect={addPresetItem}
        onCustom={addCustomInventoryItem}
      />

      <PickerSheet
        visible={abilityPickerFor != null}
        testIDPrefix="ability-picker"
        title={
          abilityPickerFor === "heroAbilities"
            ? "Hero Ability Library"
            : abilityPickerFor === "oncePerRest"
              ? "Once Per Rest Library"
              : "Once Per Turn Library"
        }
        subtitle={
          abilityPickerFor === "oncePerRest"
            ? "Big moves — 1d10 minimum. Fires once, refreshed on Long Rest."
            : abilityPickerFor === "heroAbilities"
              ? "Legendary feats — d20 dice, spend a Hero Point to trigger."
              : "Cantrip-tier spells and class signatures — safe to reuse each turn."
        }
        customLabel="Create custom ability"
        presets={ageCatalog.abilities.filter((a) => {
          if (abilityPickerFor === "heroAbilities") return a.category === "Hero Abilities";
          if (abilityPickerFor === "oncePerRest") return a.category === "Once Per Rest";
          // oncePerTurn: starter spells + class specials
          return a.category === "Starter Spells" || a.category === "Class Specials";
        }).map((a) => ({
          id: a.id,
          name: a.name,
          category: a.category,
          meta: a.effectRoll,
          notes: a.tag ? `${a.tag} · ${a.description}` : a.description,
          icon:
            a.effectType === "healing"
              ? "heart-plus"
              : a.effectType === "damage"
                ? "sword-cross"
                : "sparkles",
        }))}
        categoryOrder={ageCatalog.abilityCategoryOrder}
        onClose={() => setAbilityPickerFor(null)}
        onSelect={(entry) => {
          if (abilityPickerFor) addPresetAbility(abilityPickerFor, entry);
        }}
        onCustom={() => {
          if (abilityPickerFor) addCustomAbility(abilityPickerFor);
        }}
      />

      <ExportSheetModal
        visible={exportModalOpen}
        onClose={() => setExportModalOpen(false)}
        character={char}
      />
      <ExportSheetModal
        visible={entityToExport != null}
        onClose={() => setEntityToExport(null)}
        entity={entityToExport}
        age={characterAge}
      />
      <ImportEntityModal
        visible={entityImportType != null}
        expectedType={entityImportType}
        onClose={() => { setEntityImportType(null); setAbilityPickerFor(null); }}
        onImport={importEntity}
      />
    </View>
  );
}

function AbilitySection({
  title,
  keyName,
  abilities,
  stats,
  onAdd,
  onChange,
  onDelete,
  onUse,
  onExport,
  onImport,
}: {
  title: string;
  keyName: AbilityKey;
  abilities: Ability[];
  stats: StatBlock[];
  onAdd: () => void;
  onChange: (i: number, a: Ability) => void;
  onDelete: (i: number) => void;
  onUse: (a: Ability) => void;
  onExport: (ability: Ability) => void;
  onImport: () => void;
}) {
  const { colors } = useTheme();
  const [collapsed, setCollapsed] = useState(false);
  return (
    <View>
      <Pressable
        testID={`section-${keyName}-toggle`}
        onPress={() => setCollapsed((c) => !c)}
        style={({ pressed }) => [
          styles.sectionHeader,
          {
            backgroundColor: pressed ? colors.brandTertiary : colors.surfaceTertiary,
            borderColor: colors.borderStrong,
            borderBottomWidth: collapsed ? 2 : 0,
          },
        ]}
      >
        <View style={styles.sectionHeaderInner}>
          <Text style={[styles.sectionTitle, { color: colors.onSurface, fontFamily: fonts.displayBold }]}>
            {title}
          </Text>
          <View style={styles.sectionHeaderRight}>
            {abilities.length > 0 && (
              <Text style={[styles.sectionCount, { color: colors.muted, fontFamily: fonts.displayBold }]}>
                {abilities.length}
              </Text>
            )}
            <Icon
              name={collapsed ? "chevron-down" : "chevron-up"}
              size={22}
              color={colors.onSurface}
            />
          </View>
        </View>
      </Pressable>
      {!collapsed && (
        <View
          style={[
            styles.sectionBody,
            { borderColor: colors.borderStrong, backgroundColor: colors.surface },
          ]}
        >
          {abilities.length === 0 && (
            <Text style={[styles.emptyLine, { color: colors.muted, fontFamily: fonts.display }]}>
              No abilities yet.
            </Text>
          )}
          <View style={{ gap: 10 }}>
            {abilities.map((ab, i) => (
              <AbilityCard
                key={ab.id}
                testID={`ability-${keyName}-${i}`}
                ability={ab}
                stats={stats}
                onChange={(next) => onChange(i, next)}
                onDelete={() => onDelete(i)}
                onUse={onUse}
                onExport={onExport}
              />
            ))}
          </View>
          <AddButton testID={`add-${keyName}`} onPress={onAdd} onImport={onImport} label="Add Ability" />
        </View>
      )}
    </View>
  );
}

function AddButton({
  testID,
  onPress,
  onImport,
  label,
}: {
  testID: string;
  onPress: () => void;
  onImport?: () => void;
  label: string;
}) {
  const { colors } = useTheme();
  return (
    <View style={onImport ? styles.addButtonRow : undefined}>
      <Pressable
        testID={testID}
        onPress={onPress}
        style={({ pressed }) => [styles.addBtn, onImport && styles.addButtonFlex, { borderColor: colors.borderStrong, backgroundColor: pressed ? colors.brandTertiary : "transparent" }]}
      >
        <Icon name="plus" size={18} color={colors.brandPrimary} />
        <Text style={[styles.addText, { color: colors.brandPrimary, fontFamily: fonts.displayBold }]}>{label}</Text>
      </Pressable>
      {onImport && <Pressable testID={`${testID}-import`} onPress={onImport} style={[styles.importBtn, { borderColor: colors.borderStrong }]} accessibilityLabel="Import JSON"><Icon name="file-import-outline" size={18} color={colors.brandPrimary} /></Pressable>}
    </View>
  );
}

function CollapsibleSection({
  title,
  keyName,
  count,
  emptyLabel,
  addTestID,
  addLabel,
  onAdd,
  onImport,
  hideAdd,
  children,
}: {
  title: string;
  keyName: string;
  count: number;
  emptyLabel: string;
  addTestID: string;
  addLabel: string;
  onAdd: () => void;
  onImport?: () => void;
  hideAdd?: boolean;
  children: React.ReactNode;
}) {
  const { colors } = useTheme();
  const [collapsed, setCollapsed] = useState(false);
  return (
    <View>
      <Pressable
        testID={`section-${keyName}-toggle`}
        onPress={() => setCollapsed((c) => !c)}
        style={({ pressed }) => [
          styles.sectionHeader,
          {
            backgroundColor: pressed ? colors.brandTertiary : colors.surfaceTertiary,
            borderColor: colors.borderStrong,
            borderBottomWidth: collapsed ? 2 : 0,
          },
        ]}
      >
        <View style={styles.sectionHeaderInner}>
          <Text style={[styles.sectionTitle, { color: colors.onSurface, fontFamily: fonts.displayBold }]}>
            {title}
          </Text>
          <View style={styles.sectionHeaderRight}>
            {count > 0 && (
              <Text style={[styles.sectionCount, { color: colors.muted, fontFamily: fonts.displayBold }]}>
                {count}
              </Text>
            )}
            <Icon
              name={collapsed ? "chevron-down" : "chevron-up"}
              size={22}
              color={colors.onSurface}
            />
          </View>
        </View>
      </Pressable>
      {!collapsed && (
        <View
          style={[
            styles.sectionBody,
            { borderColor: colors.borderStrong, backgroundColor: colors.surface },
          ]}
        >
          {count === 0 && !hideAdd && (
            <Text style={[styles.emptyLine, { color: colors.muted, fontFamily: fonts.display }]}>
              {emptyLabel}
            </Text>
          )}
          <View style={{ gap: 10 }}>{children}</View>
          {!hideAdd && <AddButton testID={addTestID} onPress={onAdd} onImport={onImport} label={addLabel} />}
        </View>
      )}
    </View>
  );
}

function HeroSection({
  heroPoints,
  onHeroPointsChange,
  abilities,
  stats,
  onAdd,
  onChange,
  onDelete,
  onUse,
  onExport,
  onImport,
  onSpendBoost,
  boostPending,
  hidden,
}: {
  heroPoints: number;
  onHeroPointsChange: (delta: number) => void;
  abilities: Ability[];
  stats: StatBlock[];
  onAdd: () => void;
  onChange: (i: number, a: Ability) => void;
  onDelete: (i: number) => void;
  onUse: (a: Ability) => void;
  onExport: (ability: Ability) => void;
  onImport: () => void;
  onSpendBoost: () => void;
  boostPending: boolean;
  hidden?: boolean;
}) {
  const { colors } = useTheme();
  const [collapsed, setCollapsed] = useState(false);
  const boostDisabled = !boostPending && heroPoints < 1;
  if (hidden) return null;
  return (
    <View>
      <View
        style={[
          styles.heroHeader,
          {
            backgroundColor: colors.surfaceTertiary,
            borderColor: colors.borderStrong,
            borderBottomWidth: collapsed ? 2 : 0,
          },
        ]}
      >
        <Pressable
          testID="section-heroAbilities-toggle"
          onPress={() => setCollapsed((c) => !c)}
          hitSlop={6}
          style={styles.heroTitleWrap}
        >
          <Text style={[styles.heroTitle, { color: colors.onSurface, fontFamily: fonts.displayBold }]}>
            Hero Abilities
          </Text>
          <Icon
            name={collapsed ? "chevron-down" : "chevron-up"}
            size={22}
            color={colors.onSurface}
          />
        </Pressable>
        <Pressable
          testID="hero-boost-btn"
          onPress={onSpendBoost}
          hitSlop={6}
          style={({ pressed }) => [
            styles.boostBtn,
            {
              borderColor: colors.borderStrong,
              backgroundColor: boostPending
                ? colors.brandPrimary
                : boostDisabled
                  ? colors.surface
                  : pressed
                    ? colors.brandTertiary
                    : colors.surface,
              opacity: boostDisabled ? 0.5 : 1,
            },
          ]}
          accessibilityLabel={
            boostPending
              ? "Boost armed for next roll. Tap to cancel."
              : "Spend 1 Hero Point to add 1d6 to your next roll."
          }
        >
          <Icon
            name={boostPending ? "star-four-points" : "dice-6-outline"}
            size={14}
            color={boostPending ? colors.onBrandPrimary : colors.onSurface}
          />
          <Text
            style={[
              styles.boostText,
              {
                color: boostPending ? colors.onBrandPrimary : colors.onSurface,
                fontFamily: fonts.displayBold,
              },
            ]}
          >
            {boostPending ? "+1d6 armed" : "Boost +1d6"}
          </Text>
        </Pressable>
        <View style={styles.heroPoints}>
          <Pressable
            testID="hero-points-minus"
            onPress={() => onHeroPointsChange(-1)}
            hitSlop={8}
            style={[styles.hpStep, { borderColor: colors.borderStrong }]}
          >
            <Icon name="minus" size={16} color={colors.onSurface} />
          </Pressable>
          <View style={[styles.hpBox, { borderColor: colors.borderStrong, backgroundColor: colors.surface }]}>
            <Text
              testID="hero-points-value"
              style={[styles.hpBoxText, { color: colors.onSurface, fontFamily: fonts.displayBold }]}
            >
              {heroPoints}
            </Text>
          </View>
          <Pressable
            testID="hero-points-plus"
            onPress={() => onHeroPointsChange(1)}
            hitSlop={8}
            style={[styles.hpStep, { borderColor: colors.borderStrong }]}
          >
            <Icon name="plus" size={16} color={colors.onSurface} />
          </Pressable>
          <Text style={[styles.hpLabel, { color: colors.muted, fontFamily: fonts.display }]}>
            Hero Pts
          </Text>
        </View>
      </View>
      {!collapsed && (
        <View
          style={[
            styles.heroBody,
            { borderColor: colors.borderStrong, backgroundColor: colors.surface },
          ]}
        >
          {abilities.length === 0 && (
            <Text style={[styles.emptyLine, { color: colors.muted, fontFamily: fonts.display }]}>
              No hero abilities yet.
            </Text>
          )}
          <View style={{ gap: 10 }}>
            {abilities.map((ab, i) => (
              <AbilityCard
                key={ab.id}
                testID={`ability-heroAbilities-${i}`}
                ability={ab}
                stats={stats}
                onChange={(next) => onChange(i, next)}
                onDelete={() => onDelete(i)}
                onUse={onUse}
                onExport={onExport}
              />
            ))}
          </View>
          <AddButton testID="add-heroAbilities" onPress={onAdd} onImport={onImport} label="Add Hero Ability" />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  loading: { flex: 1, alignItems: "center", justifyContent: "center" },
  container: { flex: 1 },
  headerBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 12,
    paddingBottom: 10,
    borderBottomWidth: 3,
  },
  backBtn: { width: 32, height: 32, alignItems: "center", justifyContent: "center" },
  headerActionBtn: {
    width: 36,
    height: 36,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  headerCenter: { flex: 1, alignItems: "center" },
  headerTitle: { fontSize: 18, letterSpacing: 2, fontWeight: "700" },
  headerSub: { fontSize: 10, letterSpacing: 2.5, textTransform: "uppercase" },
  headerLogo: {
    width: "100%",
    maxWidth: 260,
    height: 46,
  },
  sheetLogo: {
    width: "100%",
    height: 100,
    alignSelf: "center",
    marginTop: 4,
    marginBottom: -4,
  },
  sheetContent: {
    padding: 12,
    gap: 12,
  },
  sheetContentWide: {
    flexGrow: 1,
    minHeight: 0,
  },
  sheetScrollWide: {
    flex: 1,
    minHeight: 0,
  },
  sheetColumns: {
    gap: 12,
  },
  sheetColumnsWide: {
    flex: 1,
    minHeight: 0,
    flexDirection: "row",
    alignItems: "stretch",
    gap: 16,
  },
  overviewColumn: {
    gap: 12,
    minWidth: 0,
  },
  overviewColumnWide: {
    flex: 1,
    minHeight: 0,
  },
  overviewContent: {
    gap: 12,
    paddingBottom: 24,
  },
  detailColumn: {
    minWidth: 0,
  },
  detailColumnWide: {
    flex: 1,
    minHeight: 0,
  },
  detailContent: {
    gap: 12,
    paddingBottom: 24,
  },

  topRow: { flexDirection: "row", gap: 10 },
  portrait: {
    width: 130,
    height: 220,
    borderWidth: 2.5,
    overflow: "hidden",
  },
  portraitImg: { width: "100%", height: "100%" },
  portraitPlaceholder: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 8,
    gap: 6,
  },
  portraitLabel: { fontSize: 11, textAlign: "center" },
  identityCol: { flex: 1, gap: 6 },

  combatBox: {
    borderWidth: 2.5,
    padding: 10,
    gap: 8,
  },
  divider: { height: 1.5, marginVertical: 2 },
  combatRow: { flexDirection: "row", gap: 10 },
  combatCell: {
    flex: 1,
    minWidth: 0,
    borderWidth: 2,
    padding: 10,
    alignItems: "stretch",
    gap: 6,
  },
  combatLabel: { fontSize: 11, letterSpacing: 1.5, fontWeight: "700", textAlign: "center" },
  combatValue: {
    fontSize: 20,
    fontWeight: "700",
    borderWidth: 1.5,
    paddingHorizontal: 8,
    paddingVertical: 8,
    textAlign: "center",
  },

  statRow: { flexDirection: "row", gap: 10 },
  tapHint: { fontSize: 12, fontStyle: "italic", textAlign: "center", marginTop: -4 },
  actionMarkers: {
    borderWidth: 2,
    padding: 10,
    gap: 8,
  },
  actionMarkersHeader: { flexDirection: "row", alignItems: "flex-start", gap: 10 },
  actionMarkersHeading: { flex: 1, gap: 3 },
  actionMarkersTitle: { fontSize: 12, letterSpacing: 1.2 },
  actionMarkersDescription: { fontSize: 11, lineHeight: 16 },
  newTurnButton: { borderWidth: 2, paddingHorizontal: 10, paddingVertical: 8, minHeight: 36, justifyContent: "center" },
  newTurnText: { fontSize: 12 },
  actionMarkersRow: { gap: 7 },
  actionMarker: { flexDirection: "row", alignItems: "center", gap: 7, minHeight: 30 },
  actionMarkerLabel: { flex: 1, fontSize: 14 },

  actionRow: {
    flexDirection: "row",
    gap: 8,
  },
  actionRowWide: {
    flexWrap: "wrap",
    justifyContent: "flex-start",
  },
  actionChip: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    borderWidth: 2,
    paddingVertical: 10,
    paddingHorizontal: 10,
  },
  actionChipWide: {
    flexGrow: 0,
    flexBasis: 240,
    maxWidth: 300,
  },
  actionText: { fontSize: 13, fontWeight: "700", letterSpacing: 0.5 },

  sectionHeader: {
    borderWidth: 2,
    borderBottomWidth: 0,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  sectionHeaderInner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  sectionHeaderRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  sectionCount: {
    fontSize: 14,
    minWidth: 20,
    textAlign: "right",
  },
  sectionTitle: { fontSize: 18, fontWeight: "700", letterSpacing: 1 },
  sectionBody: {
    borderWidth: 2,
    padding: 10,
    gap: 10,
  },
  emptyLine: { fontSize: 14, fontStyle: "italic" },

  heroHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 2,
    borderBottomWidth: 0,
    gap: 8,
    flexWrap: "wrap",
  },
  heroTitle: { fontSize: 18, fontWeight: "700", letterSpacing: 1 },
  heroTitleWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    flexShrink: 1,
  },
  heroPoints: { flexDirection: "row", alignItems: "center", gap: 6 },
  boostBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    borderWidth: 1.5,
    paddingHorizontal: 8,
    paddingVertical: 6,
  },
  boostText: {
    fontSize: 11,
    letterSpacing: 0.5,
    fontWeight: "700",
  },
  hpStep: {
    width: 28,
    height: 28,
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
  },
  hpBox: {
    minWidth: 34,
    height: 28,
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 8,
  },
  hpBoxText: { fontSize: 16, fontWeight: "700" },
  hpLabel: { fontSize: 11, marginLeft: 4 },
  heroBody: {
    borderWidth: 2,
    padding: 10,
    gap: 10,
  },

  addBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    borderWidth: 1.5,
    borderStyle: "dashed",
    paddingVertical: 10,
    marginTop: 2,
  },
  addButtonRow: { flexDirection: "row", gap: 8, alignItems: "stretch" },
  addButtonFlex: { flex: 1 },
  importBtn: {
    width: 42,
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 2,
  },
  addText: { fontSize: 14, fontWeight: "700", letterSpacing: 0.5 },

  addSectionBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderWidth: 2,
    borderStyle: "dashed",
    paddingVertical: 14,
    marginTop: 4,
  },
  addSectionText: { fontSize: 15, fontWeight: "700", letterSpacing: 1 },

  warnBackdrop: {
    flex: 1,
    backgroundColor: "rgba(20,14,8,0.85)",
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  warnCard: {
    width: "100%",
    maxWidth: 340,
    borderWidth: 3,
    padding: 20,
    alignItems: "center",
    gap: 10,
  },
  warnTitle: { fontSize: 20, fontWeight: "700", letterSpacing: 1, textAlign: "center" },
  warnText: { fontSize: 14, textAlign: "center" },
  deathSaveTrack: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 8,
    width: "100%",
    marginTop: 6,
  },
  deathSaveBox: {
    width: 22,
    height: 22,
    borderWidth: 2,
    borderRadius: 4,
  },
  warnBtn: {
    marginTop: 6,
    paddingHorizontal: 30,
    paddingVertical: 10,
    borderWidth: 2,
    alignSelf: "stretch",
    alignItems: "center",
  },
  warnBtnText: { fontSize: 15, fontWeight: "700", letterSpacing: 0.8 },
});
