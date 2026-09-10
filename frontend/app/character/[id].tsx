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
  StatBlock,
  createEmptyAbility,
  genId,
} from "@/src/types";
import { getCharacter, upsertCharacter } from "@/src/storage/characters";
import HpTracker from "@/src/components/HpTracker";
import StatCard from "@/src/components/StatCard";
import LabeledField from "@/src/components/LabeledField";
import AbilityCard from "@/src/components/AbilityCard";
import CustomSectionCard from "@/src/components/CustomSectionCard";
import DiceRollModal, { RollRequest } from "@/src/components/DiceRollModal";
import { valueForRef, labelForRef } from "@/src/components/StatPickerModal";

type AbilityKey = "oncePerTurn" | "oncePerRest" | "heroAbilities";

export default function CharacterSheetScreen() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [char, setChar] = useState<Character | null>(null);
  const [roll, setRoll] = useState<RollRequest | null>(null);
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
    setRoll({ label, target });
  };

  const pickPortrait = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) return;
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
    });
    if (!result.canceled && result.assets?.[0]) {
      update({ portraitUri: result.assets[0].uri });
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
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const target = valueForRef(char.stats, ability.linkedStat) ?? undefined;
    const label = ability.title || "Ability";
    const effect =
      ability.effectType !== "none" && ability.effectRoll.trim()
        ? { notation: ability.effectRoll.trim(), type: ability.effectType as "damage" | "healing" }
        : undefined;
    if (target == null) {
      if (effect) {
        setRoll({ label, effect });
      } else {
        setRoll({ label: `${label} — no linked stat or effect`, target: 0 });
      }
      return;
    }
    const linkedLabel = labelForRef(char.stats, ability.linkedStat);
    setRoll({
      label: `${label} · ${linkedLabel}`,
      target,
      effect,
    });
  };

  const addCustomSection = () => {
    if (!char) return;
    const newSection: CustomSection = { id: genId(), title: "", content: "" };
    update({ customSections: [...char.customSections, newSection] });
    Haptics.selectionAsync();
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
              <View style={[styles.combatCell, { borderColor: colors.borderStrong }]}>
                <Text style={[styles.combatLabel, { color: colors.muted, fontFamily: fonts.displayBold }]}>
                  ARMOUR
                </Text>
                <TextInput
                  testID="input-armour"
                  value={char.armour}
                  onChangeText={(t) => update({ armour: t })}
                  style={[styles.combatValue, { color: colors.onSurface, fontFamily: fonts.displayBold }]}
                  keyboardType="number-pad"
                  maxLength={3}
                />
              </View>
              <View style={[styles.combatCell, { borderColor: colors.borderStrong }]}>
                <Text style={[styles.combatLabel, { color: colors.muted, fontFamily: fonts.displayBold }]}>
                  MELEE DMG
                </Text>
                <TextInput
                  testID="input-melee-dmg"
                  value={char.meleeDmg}
                  onChangeText={(t) => update({ meleeDmg: t })}
                  style={[styles.combatValue, { color: colors.onSurface, fontFamily: fonts.displayBold }]}
                  maxLength={12}
                  autoCapitalize="none"
                  autoCorrect={false}
                />
              </View>
            </View>
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

          <View>
            <View style={[styles.heroHeader, { backgroundColor: colors.surfaceTertiary, borderColor: colors.borderStrong }]}>
              <Text style={[styles.heroTitle, { color: colors.onSurface, fontFamily: fonts.displayBold }]}>
                Hero Abilities
              </Text>
              <View style={styles.heroPoints}>
                <Pressable
                  testID="hero-points-minus"
                  onPress={() => changeHeroPoints(-1)}
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
                    {char.heroPoints}
                  </Text>
                </View>
                <Pressable
                  testID="hero-points-plus"
                  onPress={() => changeHeroPoints(1)}
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
            <View
              style={[
                styles.heroBody,
                { borderColor: colors.borderStrong, backgroundColor: colors.surface },
              ]}
            >
              {char.heroAbilities.length === 0 && (
                <Text style={[styles.emptyLine, { color: colors.muted, fontFamily: fonts.display }]}>
                  No hero abilities yet.
                </Text>
              )}
              <View style={{ gap: 10 }}>
                {char.heroAbilities.map((ab, i) => (
                  <AbilityCard
                    key={ab.id}
                    testID={`ability-heroAbilities-${i}`}
                    ability={ab}
                    stats={char.stats}
                    onChange={(next) => updateAbility("heroAbilities", i, next)}
                    onDelete={() => deleteAbility("heroAbilities", i)}
                    onUse={useAbility}
                  />
                ))}
              </View>
              <AddButton testID="add-heroAbilities" onPress={() => addAbility("heroAbilities")} label="Add Hero Ability" />
            </View>
          </View>

          <LabeledField
            label="Backstory"
            testID="input-backstory"
            value={char.backstory}
            onChangeText={(t) => update({ backstory: t })}
            multiline
            minHeight={140}
            placeholder="Where your hero comes from…"
          />
          <LabeledField
            label="Inventory"
            testID="input-inventory"
            value={char.inventory}
            onChangeText={(t) => update({ inventory: t })}
            multiline
            minHeight={140}
            placeholder="Items, gold, gear…"
          />
          <LabeledField
            label="Notes"
            testID="input-notes"
            value={char.notes}
            onChangeText={(t) => update({ notes: t })}
            multiline
            minHeight={140}
            placeholder="Session notes, quests…"
          />

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

      <DiceRollModal request={roll} onClose={() => setRoll(null)} />
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
  return (
    <View>
      <View
        style={[
          styles.sectionHeader,
          { backgroundColor: colors.surfaceTertiary, borderColor: colors.borderStrong },
        ]}
      >
        <Text style={[styles.sectionTitle, { color: colors.onSurface, fontFamily: fonts.displayBold }]}>
          {title}
        </Text>
      </View>
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
    borderWidth: 2,
    padding: 10,
    alignItems: "center",
    gap: 4,
  },
  combatLabel: { fontSize: 11, letterSpacing: 1.5, fontWeight: "700" },
  combatValue: {
    fontSize: 22,
    fontWeight: "700",
    minWidth: 60,
    textAlign: "center",
    paddingVertical: 0,
  },

  statRow: { flexDirection: "row", gap: 10 },
  tapHint: { fontSize: 12, fontStyle: "italic", textAlign: "center", marginTop: -4 },

  sectionHeader: {
    borderWidth: 2,
    borderBottomWidth: 0,
    paddingHorizontal: 12,
    paddingVertical: 8,
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
