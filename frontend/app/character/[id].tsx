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
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Icon from "@react-native-vector-icons/material-design-icons";
import * as ImagePicker from "expo-image-picker";
import * as Haptics from "expo-haptics";
import { fonts, useTheme } from "@/src/theme";
import {
  Ability,
  Character,
  CustomSection,
  InventoryItem,
  RollHistoryEntry,
  RollMode,
  StatBlock,
  Weapon,
  ROLL_HISTORY_MAX,
  HP_MAX,
  createEmptyAbility,
  createEmptyInventoryItem,
  createEmptyWeapon,
  genId,
} from "@/src/types";
import { getCharacter, upsertCharacter } from "@/src/storage/characters";
import HpTracker from "@/src/components/HpTracker";
import StatCard from "@/src/components/StatCard";
import LabeledField from "@/src/components/LabeledField";
import AbilityCard from "@/src/components/AbilityCard";
import CustomSectionCard from "@/src/components/CustomSectionCard";
import DiceRollModal, { RollRequest } from "@/src/components/DiceRollModal";
import MeleeDmgCell from "@/src/components/MeleeDmgCell";
import WeaponCard, { getAttackTarget } from "@/src/components/WeaponCard";
import InventoryList from "@/src/components/InventoryList";
import RollHistoryList from "@/src/components/RollHistoryList";
import { valueForRef, labelForRef } from "@/src/components/StatPickerModal";

type AbilityKey = "oncePerTurn" | "oncePerRest" | "heroAbilities";

export default function CharacterSheetScreen() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [char, setChar] = useState<Character | null>(null);
  const [roll, setRoll] = useState<RollRequest | null>(null);
  const [rollMode, setRollMode] = useState<RollMode>("normal");
  const saveTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    (async () => {
      if (!id) return;
      const c = await getCharacter(id);
      setChar(c);
    })();
  }, [id]);

  const update = (patch: Partial<Character>) => {
    setChar((prev) => {
      if (!prev) return prev;
      const next = { ...prev, ...patch };
      if (saveTimeout.current) clearTimeout(saveTimeout.current);
      saveTimeout.current = setTimeout(() => {
        upsertCharacter(next);
      }, 400);
      return next;
    });
  };

  const triggerStatRoll = (label: string, target: number) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setRoll({ label, target, mode: rollMode });
    if (rollMode !== "normal") setRollMode("normal");
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
    const cur = char[key] as Ability[];
    setAbilities(key, [...cur, createEmptyAbility()]);
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
    const target = valueForRef(char.stats, ability.linkedStat) ?? undefined;
    const label = ability.title || "Ability";
    const effect =
      ability.effectType !== "none" && ability.effectRoll.trim()
        ? { notation: ability.effectRoll.trim(), type: ability.effectType as "damage" | "healing" }
        : undefined;

    // Nothing to roll: silently ignore (button becomes a no-op).
    if (target == null && !effect) return;

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    // No linked stat: just roll the effect dice (damage/healing) directly.
    if (target == null) {
      setRoll({ label, effect });
      return;
    }

    // Linked stat: d20 vs target, and effect on success.
    const linkedLabel = labelForRef(char.stats, ability.linkedStat);
    setRoll({
      label: `${label} · ${linkedLabel}`,
      target,
      effect,
      mode: rollMode,
    });
    if (rollMode !== "normal") setRollMode("normal");
  };

  const addCustomSection = () => {
    if (!char) return;
    const newSection: CustomSection = { id: genId(), title: "", content: "" };
    update({ customSections: [...char.customSections, newSection] });
    Haptics.selectionAsync();
  };

  const addWeapon = () => {
    if (!char) return;
    update({ weapons: [...char.weapons, createEmptyWeapon()] });
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
    setRoll({ label: `${weaponName} · ${label}`, target, effect, mode: rollMode });
    if (rollMode !== "normal") setRollMode("normal");
  };

  const logRoll = (entry: RollHistoryEntry) => {
    setChar((prev) => {
      if (!prev) return prev;
      const next: Character = {
        ...prev,
        rollHistory: [entry, ...prev.rollHistory].slice(0, ROLL_HISTORY_MAX),
      };
      if (saveTimeout.current) clearTimeout(saveTimeout.current);
      saveTimeout.current = setTimeout(() => upsertCharacter(next), 400);
      return next;
    });
  };

  const clearHistory = () => {
    if (!char) return;
    update({ rollHistory: [] });
    Haptics.selectionAsync();
  };

  const longRest = () => {
    if (!char) return;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    const clearUsed = (list: Ability[]) => list.map((a) => ({ ...a, used: false }));
    update({
      hp: HP_MAX,
      oncePerTurn: clearUsed(char.oncePerTurn),
      oncePerRest: clearUsed(char.oncePerRest),
      heroAbilities: clearUsed(char.heroAbilities),
    });
  };

  const cycleRollMode = () => {
    const order: RollMode[] = ["normal", "advantage", "disadvantage"];
    const idx = order.indexOf(rollMode);
    setRollMode(order[(idx + 1) % order.length]);
    Haptics.selectionAsync();
  };

  const addInventoryItem = () => {
    if (!char) return;
    update({ inventoryItems: [...char.inventoryItems, createEmptyInventoryItem()] });
    Haptics.selectionAsync();
  };

  const setInventoryItems = (items: InventoryItem[]) => {
    update({ inventoryItems: items });
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
        <View style={styles.headerCenter}>
          <Text style={[styles.headerTitle, { color: colors.onSurface, fontFamily: fonts.displayBold }]}>
            ASSAULT OF BRONZE
          </Text>
          <Text style={[styles.headerSub, { color: colors.muted, fontFamily: fonts.display }]}>
            Lightweight Roleplay System
          </Text>
        </View>
        <View style={{ width: 32 }} />
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          testID="character-scroll"
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ padding: 12, paddingBottom: 40 + insets.bottom, gap: 12 }}
        >
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
            <HpTracker hp={char.hp} onChange={(hp) => update({ hp })} />
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

          <View style={styles.actionRow}>
            <Pressable
              testID="roll-mode-toggle"
              onPress={cycleRollMode}
              style={({ pressed }) => [
                styles.actionChip,
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

          {statPairs.map((pair, rowIdx) => (
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

          <CollapsibleSection
            title="Weapons"
            keyName="weapons"
            count={char.weapons.length}
            emptyLabel="No weapons yet."
            addTestID="add-weapon"
            addLabel="Add Weapon"
            onAdd={addWeapon}
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
            title="Inventory"
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
      </KeyboardAvoidingView>

      <DiceRollModal request={roll} onClose={() => setRoll(null)} onLog={logRoll} />
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
}: {
  title: string;
  keyName: AbilityKey;
  abilities: Ability[];
  stats: StatBlock[];
  onAdd: () => void;
  onChange: (i: number, a: Ability) => void;
  onDelete: (i: number) => void;
  onUse: (a: Ability) => void;
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
              />
            ))}
          </View>
          <AddButton testID={`add-${keyName}`} onPress={onAdd} label="Add Ability" />
        </View>
      )}
    </View>
  );
}

function AddButton({
  testID,
  onPress,
  label,
}: {
  testID: string;
  onPress: () => void;
  label: string;
}) {
  const { colors } = useTheme();
  return (
    <Pressable
      testID={testID}
      onPress={onPress}
      style={({ pressed }) => [
        styles.addBtn,
        {
          borderColor: colors.borderStrong,
          backgroundColor: pressed ? colors.brandTertiary : "transparent",
        },
      ]}
    >
      <Icon name="plus" size={18} color={colors.brandPrimary} />
      <Text style={[styles.addText, { color: colors.brandPrimary, fontFamily: fonts.displayBold }]}>
        {label}
      </Text>
    </Pressable>
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
          {!hideAdd && <AddButton testID={addTestID} onPress={onAdd} label={addLabel} />}
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
}: {
  heroPoints: number;
  onHeroPointsChange: (delta: number) => void;
  abilities: Ability[];
  stats: StatBlock[];
  onAdd: () => void;
  onChange: (i: number, a: Ability) => void;
  onDelete: (i: number) => void;
  onUse: (a: Ability) => void;
}) {
  const { colors } = useTheme();
  const [collapsed, setCollapsed] = useState(false);
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
              />
            ))}
          </View>
          <AddButton testID="add-heroAbilities" onPress={onAdd} label="Add Hero Ability" />
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
  headerCenter: { flex: 1, alignItems: "center" },
  headerTitle: { fontSize: 18, letterSpacing: 2, fontWeight: "700" },
  headerSub: { fontSize: 10, letterSpacing: 2.5, textTransform: "uppercase" },

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

  actionRow: {
    flexDirection: "row",
    gap: 8,
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
});
