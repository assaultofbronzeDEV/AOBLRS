import React, { useEffect, useState } from "react";
import { Modal, View, Text, StyleSheet, Pressable, ScrollView } from "react-native";
import Icon from "@react-native-vector-icons/material-design-icons";
import * as Haptics from "expo-haptics";
import { fonts, useTheme } from "@/src/theme";
import { StatBlock } from "@/src/types";

export const STAT_FLOOR = 6;
export const LEVEL_UP_POINTS = 2;

export type AbilityChoiceKey = "oncePerTurn" | "oncePerRest" | "heroAbilities";

type AbilityOption = { key: AbilityChoiceKey; label: string; icon: string };

const ABILITY_OPTIONS: AbilityOption[] = [
  { key: "oncePerTurn", label: "Once Per Turn", icon: "refresh" },
  { key: "oncePerRest", label: "Once Per Rest", icon: "campfire" },
  { key: "heroAbilities", label: "Hero Ability", icon: "star-four-points" },
];

type Props = {
  visible: boolean;
  stats: StatBlock[];
  onClose: () => void;
  onConfirm: (reductions: Partial<Record<string, number>>, abilityKey: AbilityChoiceKey) => void;
};

export default function LevelUpModal({ visible, stats, onClose, onConfirm }: Props) {
  const { colors } = useTheme();
  const [spent, setSpent] = useState<Partial<Record<string, number>>>({});
  const [abilityKey, setAbilityKey] = useState<AbilityChoiceKey | null>(null);

  useEffect(() => {
    if (visible) {
      setSpent({});
      setAbilityKey(null);
    }
  }, [visible]);

  if (!visible) return null;

  const pointsUsed = Object.values(spent).reduce((sum, n) => sum + (n ?? 0), 0);
  const pointsLeft = LEVEL_UP_POINTS - pointsUsed;
  const canConfirm = pointsLeft === 0 && abilityKey != null;

  const spendOn = (key: string, current: number) => {
    const used = spent[key] ?? 0;
    if (pointsLeft <= 0 || current - used <= STAT_FLOOR) return;
    Haptics.selectionAsync();
    setSpent({ ...spent, [key]: used + 1 });
  };

  const refundFrom = (key: string) => {
    const used = spent[key] ?? 0;
    if (used <= 0) return;
    Haptics.selectionAsync();
    setSpent({ ...spent, [key]: used - 1 });
  };

  const confirm = () => {
    if (!canConfirm || !abilityKey) return;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    onConfirm(spent, abilityKey);
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={[styles.card, { backgroundColor: colors.surfaceSecondary, borderColor: colors.borderStrong }]}>
          <View style={[styles.header, { borderBottomColor: colors.borderStrong }]}>
            <View style={styles.headerLeft}>
              <Icon name="arrow-up-bold-circle" size={22} color={colors.brandPrimary} />
              <Text style={[styles.title, { color: colors.onSurface, fontFamily: fonts.displayBold }]}>Level Up</Text>
            </View>
            <Pressable onPress={onClose} hitSlop={10} style={styles.closeBtn}>
              <Icon name="close" size={22} color={colors.onSurface} />
            </Pressable>
          </View>

          <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
            <Text style={[styles.sectionLabel, { color: colors.muted, fontFamily: fonts.displayBold }]}>
              SPEND {LEVEL_UP_POINTS} STAT POINTS ({pointsLeft} LEFT)
            </Text>
            <Text style={[styles.hint, { color: colors.muted, fontFamily: fonts.body }]}>
              Each point lowers a stat by 1 (lower is stronger). Stats cannot go below {STAT_FLOOR}.
            </Text>

            {stats.map((s) => {
              const used = spent[s.key] ?? 0;
              const preview = s.value - used;
              return (
                <View key={s.key} style={[styles.statRow, { borderColor: colors.border }]}>
                  <View style={styles.statInfo}>
                    <Text style={[styles.statName, { color: colors.onSurface, fontFamily: fonts.displayBold }]}>{s.name}</Text>
                    <Text style={[styles.statValue, { color: colors.brandPrimary, fontFamily: fonts.displayBold }]}>
                      {s.value} {used > 0 ? `→ ${preview}` : ""}
                    </Text>
                  </View>
                  <View style={styles.statButtons}>
                    <Pressable
                      testID={`levelup-stat-${s.key}-minus`}
                      onPress={() => refundFrom(s.key)}
                      disabled={used <= 0}
                      style={[styles.statBtn, { borderColor: colors.borderStrong, opacity: used <= 0 ? 0.4 : 1 }]}
                    >
                      <Icon name="minus" size={16} color={colors.onSurface} />
                    </Pressable>
                    <Pressable
                      testID={`levelup-stat-${s.key}-plus`}
                      onPress={() => spendOn(s.key, s.value)}
                      disabled={pointsLeft <= 0 || preview <= STAT_FLOOR}
                      style={[
                        styles.statBtn,
                        { borderColor: colors.borderStrong, opacity: pointsLeft <= 0 || preview <= STAT_FLOOR ? 0.4 : 1 },
                      ]}
                    >
                      <Icon name="plus" size={16} color={colors.onSurface} />
                    </Pressable>
                  </View>
                </View>
              );
            })}

            <Text style={[styles.sectionLabel, { color: colors.muted, fontFamily: fonts.displayBold, marginTop: 8 }]}>
              CHOOSE A NEW ABILITY
            </Text>
            <View style={styles.abilityRow}>
              {ABILITY_OPTIONS.map((opt) => {
                const active = abilityKey === opt.key;
                return (
                  <Pressable
                    key={opt.key}
                    testID={`levelup-ability-${opt.key}`}
                    onPress={() => {
                      Haptics.selectionAsync();
                      setAbilityKey(opt.key);
                    }}
                    style={[
                      styles.abilityOption,
                      {
                        borderColor: colors.borderStrong,
                        backgroundColor: active ? colors.brandPrimary : colors.surface,
                      },
                    ]}
                  >
                    <Icon name={opt.icon} size={18} color={active ? colors.onBrandPrimary : colors.onSurface} />
                    <Text
                      style={[
                        styles.abilityOptionText,
                        { color: active ? colors.onBrandPrimary : colors.onSurface, fontFamily: fonts.displayBold },
                      ]}
                    >
                      {opt.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            <Pressable
              testID="levelup-confirm"
              onPress={confirm}
              disabled={!canConfirm}
              style={[
                styles.confirmBtn,
                { backgroundColor: colors.brandPrimary, borderColor: colors.borderStrong, opacity: canConfirm ? 1 : 0.4 },
              ]}
            >
              <Icon name="check-circle" size={18} color={colors.onBrandPrimary} />
              <Text style={[styles.confirmBtnText, { color: colors.onBrandPrimary, fontFamily: fonts.displayBold }]}>
                Confirm Level Up
              </Text>
            </Pressable>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.65)",
    justifyContent: "center",
    alignItems: "center",
    padding: 16,
  },
  card: {
    width: "100%",
    maxWidth: 480,
    maxHeight: "88%",
    borderWidth: 1,
    overflow: "hidden",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  headerLeft: { flexDirection: "row", alignItems: "center", gap: 10 },
  title: { fontSize: 17, letterSpacing: 0.5 },
  closeBtn: { padding: 4 },
  body: { padding: 16, gap: 10 },
  sectionLabel: { fontSize: 12, letterSpacing: 1 },
  hint: { fontSize: 12, lineHeight: 16, marginBottom: 4 },
  statRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderWidth: 1.5,
    paddingHorizontal: 10,
    paddingVertical: 8,
    gap: 8,
  },
  statInfo: { flex: 1, minWidth: 0, gap: 2 },
  statName: { fontSize: 13, letterSpacing: 0.5 },
  statValue: { fontSize: 14 },
  statButtons: { flexDirection: "row", gap: 8 },
  statBtn: {
    width: 32,
    height: 32,
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
  },
  abilityRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  abilityOption: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderWidth: 2,
    paddingVertical: 8,
    paddingHorizontal: 10,
    flexGrow: 1,
    justifyContent: "center",
  },
  abilityOptionText: { fontSize: 12, letterSpacing: 0.3 },
  confirmBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderWidth: 2,
    paddingVertical: 12,
    marginTop: 8,
  },
  confirmBtnText: { fontSize: 14, letterSpacing: 0.5 },
});
