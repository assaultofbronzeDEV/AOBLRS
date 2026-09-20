import React, { useEffect, useState } from "react";
import { Modal, View, Text, StyleSheet, Pressable, ScrollView } from "react-native";
import Icon from "@react-native-vector-icons/material-design-icons";
import * as Haptics from "expo-haptics";
import { fonts, useTheme } from "@/src/theme";
import { StatBlock } from "@/src/types";

export const STAT_FLOOR = 6;
export const LEVEL_UP_POINTS = 2;

export type AbilityChoiceKey = "oncePerTurn" | "oncePerRest" | "heroAbilities";

// Composite key: "STR" for the main stat, "STR:1" for its second sub-skill.
const mainKey = (statKey: string) => statKey;
const subKey = (statKey: string, subIndex: number) => `${statKey}:${subIndex}`;

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

function StatRow({
  label,
  value,
  used,
  pointsLeft,
  onSpend,
  onRefund,
  testIDBase,
}: {
  label: string;
  value: number;
  used: number;
  pointsLeft: number;
  onSpend: () => void;
  onRefund: () => void;
  testIDBase: string;
}) {
  const { colors } = useTheme();
  const preview = value - used;
  const canSpend = pointsLeft > 0 && preview > STAT_FLOOR;
  return (
    <View style={[styles.statRow, { borderBottomColor: colors.divider }]}>
      <Text numberOfLines={1} style={[styles.statRowLabel, { color: colors.onSurface, fontFamily: fonts.body }]}>
        {label}
      </Text>
      <Text style={[styles.statRowValue, { color: colors.brandPrimary, fontFamily: fonts.displayBold }]}>
        {used > 0 ? `${value} → ${preview}` : value}
      </Text>
      <View style={styles.statRowButtons}>
        <Pressable
          testID={`${testIDBase}-minus`}
          onPress={onRefund}
          disabled={used <= 0}
          style={[styles.statBtn, { borderColor: colors.borderStrong, opacity: used <= 0 ? 0.4 : 1 }]}
        >
          <Icon name="minus" size={13} color={colors.onSurface} />
        </Pressable>
        <Pressable
          testID={`${testIDBase}-plus`}
          onPress={onSpend}
          disabled={!canSpend}
          style={[styles.statBtn, { borderColor: colors.borderStrong, opacity: canSpend ? 1 : 0.4 }]}
        >
          <Icon name="plus" size={13} color={colors.onSurface} />
        </Pressable>
      </View>
    </View>
  );
}

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

  const spend = (key: string, current: number) => {
    const used = spent[key] ?? 0;
    if (pointsLeft <= 0 || current - used <= STAT_FLOOR) return;
    Haptics.selectionAsync();
    setSpent({ ...spent, [key]: used + 1 });
  };

  const refund = (key: string) => {
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

  const pairs: StatBlock[][] = [];
  for (let i = 0; i < stats.length; i += 2) pairs.push(stats.slice(i, i + 2));

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
              Each point lowers a stat or sub-skill by 1 (lower is stronger). Nothing can go below {STAT_FLOOR}.
            </Text>

            {pairs.map((pair, rowIdx) => (
              <View key={rowIdx} style={styles.statPairRow}>
                {pair.map((block) => (
                  <View key={block.key} style={[styles.statBlock, { borderColor: colors.borderStrong, backgroundColor: colors.surface }]}>
                    <View style={[styles.statBlockHeader, { borderBottomColor: colors.borderStrong }]}>
                      <Text style={[styles.statBlockKey, { color: colors.onSurface, fontFamily: fonts.displayBold }]}>{block.key}</Text>
                      <Text numberOfLines={1} style={[styles.statBlockName, { color: colors.muted, fontFamily: fonts.display }]}>
                        {block.name}
                      </Text>
                    </View>
                    <StatRow
                      label={block.name}
                      value={block.value}
                      used={spent[mainKey(block.key)] ?? 0}
                      pointsLeft={pointsLeft}
                      onSpend={() => spend(mainKey(block.key), block.value)}
                      onRefund={() => refund(mainKey(block.key))}
                      testIDBase={`levelup-stat-${block.key}`}
                    />
                    {block.subs.map((s, i) => (
                      <StatRow
                        key={s.name}
                        label={s.name}
                        value={s.value}
                        used={spent[subKey(block.key, i)] ?? 0}
                        pointsLeft={pointsLeft}
                        onSpend={() => spend(subKey(block.key, i), s.value)}
                        onRefund={() => refund(subKey(block.key, i))}
                        testIDBase={`levelup-sub-${block.key}-${i}`}
                      />
                    ))}
                  </View>
                ))}
              </View>
            ))}

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
    maxWidth: 560,
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

  statPairRow: { flexDirection: "row", gap: 10 },
  statBlock: { flex: 1, minWidth: 0, borderWidth: 2 },
  statBlockHeader: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: 6,
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderBottomWidth: 1.5,
  },
  statBlockKey: { fontSize: 14, letterSpacing: 0.5 },
  statBlockName: { fontSize: 9, letterSpacing: 1, flexShrink: 1 },

  statRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderBottomWidth: 1,
  },
  statRowLabel: { flex: 1, minWidth: 0, fontSize: 10.5, lineHeight: 13 },
  statRowValue: { fontSize: 11, marginHorizontal: 4 },
  statRowButtons: { flexDirection: "row", gap: 4 },
  statBtn: {
    width: 22,
    height: 22,
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
