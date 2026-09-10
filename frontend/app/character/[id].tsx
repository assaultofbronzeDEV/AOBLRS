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
import { Character, StatBlock } from "@/src/types";
import { getCharacter, upsertCharacter } from "@/src/storage/characters";
import HpTracker from "@/src/components/HpTracker";
import StatCard from "@/src/components/StatCard";
import LabeledField from "@/src/components/LabeledField";
import DiceRollModal, { RollPayload } from "@/src/components/DiceRollModal";

export default function CharacterSheetScreen() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [char, setChar] = useState<Character | null>(null);
  const [roll, setRoll] = useState<RollPayload | null>(null);
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

  const triggerRoll = (label: string, target: number) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setRoll({ label, target });
  };

  const pickPortrait = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) return;
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
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
      {/* Sticky header */}
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
          {/* Portrait + Name/Class/Level */}
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

          {/* HP + Armour + Melee DMG */}
          <View style={[styles.combatBox, { borderColor: colors.borderStrong }]}>
            <HpTracker
              hp={char.hp}
              hpMax={char.hpMax}
              onChange={(hp, hpMax) => update({ hp, hpMax })}
            />
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
                  maxLength={10}
                  autoCapitalize="characters"
                />
              </View>
            </View>
          </View>

          {/* Stat grid */}
          {statPairs.map((pair, rowIdx) => (
            <View key={rowIdx} style={styles.statRow}>
              {pair.map((block, colIdx) =>
                block ? (
                  <StatCard
                    key={block.key}
                    block={block}
                    onChange={(next) => updateStat(rowIdx * 2 + colIdx, next)}
                    onRoll={triggerRoll}
                  />
                ) : (
                  <View key={`empty-${colIdx}`} style={{ flex: 1 }} />
                ),
              )}
            </View>
          ))}

          <Text style={[styles.tapHint, { color: colors.muted, fontFamily: fonts.display }]}>
            Tap any stat or skill to roll a d20 against it.
          </Text>

          {/* Once Per Turn */}
          <LabeledField
            label="Once Per Turn"
            testID="input-once-per-turn"
            value={char.oncePerTurn}
            onChangeText={(t) => update({ oncePerTurn: t })}
            multiline
            minHeight={100}
            placeholder="Abilities you can use once per turn…"
          />

          {/* Once Per Rest */}
          <LabeledField
            label="Once Per Rest"
            testID="input-once-per-rest"
            value={char.oncePerRest}
            onChangeText={(t) => update({ oncePerRest: t })}
            multiline
            minHeight={100}
            placeholder="Abilities that recharge on rest…"
          />

          {/* Hero Ability + Hero Points */}
          <View>
            <View style={[styles.heroHeader, { backgroundColor: colors.surfaceTertiary, borderColor: colors.borderStrong }]}>
              <Text style={[styles.heroTitle, { color: colors.onSurface, fontFamily: fonts.displayBold }]}>
                Hero Ability
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
                  Hero Points
                </Text>
              </View>
            </View>
            <TextInput
              testID="input-hero-ability"
              value={char.heroAbility}
              onChangeText={(t) => update({ heroAbility: t })}
              multiline
              placeholder="Your signature hero ability…"
              placeholderTextColor={colors.muted}
              style={[
                styles.heroInput,
                {
                  color: colors.onSurface,
                  borderColor: colors.borderStrong,
                  backgroundColor: colors.surface,
                  fontFamily: fonts.body,
                },
              ]}
              textAlignVertical="top"
            />
          </View>

          {/* Backstory */}
          <LabeledField
            label="Backstory"
            testID="input-backstory"
            value={char.backstory}
            onChangeText={(t) => update({ backstory: t })}
            multiline
            minHeight={140}
            placeholder="Where your hero comes from…"
          />

          {/* Inventory */}
          <LabeledField
            label="Inventory"
            testID="input-inventory"
            value={char.inventory}
            onChangeText={(t) => update({ inventory: t })}
            multiline
            minHeight={140}
            placeholder="Items, gold, gear…"
          />

          {/* Notes */}
          <LabeledField
            label="Notes"
            testID="input-notes"
            value={char.notes}
            onChangeText={(t) => update({ notes: t })}
            multiline
            minHeight={140}
            placeholder="Session notes, quests…"
          />
        </ScrollView>
      </KeyboardAvoidingView>

      <DiceRollModal roll={roll} onClose={() => setRoll(null)} />
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
    borderWidth: 2,
    padding: 10,
    alignItems: "center",
    gap: 4,
  },
  combatLabel: { fontSize: 11, letterSpacing: 1.5, fontWeight: "700" },
  combatValue: {
    fontSize: 24,
    fontWeight: "700",
    minWidth: 60,
    textAlign: "center",
    paddingVertical: 0,
  },

  statRow: { flexDirection: "row", gap: 10 },
  tapHint: { fontSize: 12, fontStyle: "italic", textAlign: "center", marginTop: -4 },

  heroHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 2,
    borderBottomWidth: 0,
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
  heroInput: {
    borderWidth: 2,
    padding: 12,
    fontSize: 16,
    minHeight: 120,
  },
});
