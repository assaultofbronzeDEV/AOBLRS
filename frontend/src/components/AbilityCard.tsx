import React, { useState } from "react";
import { View, Text, StyleSheet, Pressable, TextInput } from "react-native";
import Icon from "@react-native-vector-icons/material-design-icons";
import { fonts, useTheme } from "@/src/theme";
import { Ability, EffectType, StatBlock, StatRef } from "@/src/types";
import StatPickerModal, { labelForRef, valueForRef } from "@/src/components/StatPickerModal";

type Props = {
  ability: Ability;
  stats: StatBlock[];
  onChange: (next: Ability) => void;
  onDelete: () => void;
  onUse: (ability: Ability) => void;
  testID?: string;
};

const EFFECT_LABELS: Record<EffectType, string> = {
  none: "None",
  damage: "Damage",
  healing: "Healing",
};

function cycleEffect(cur: EffectType): EffectType {
  if (cur === "none") return "damage";
  if (cur === "damage") return "healing";
  return "none";
}

export default function AbilityCard({ ability, stats, onChange, onDelete, onUse, testID }: Props) {
  const { colors } = useTheme();
  const [pickerOpen, setPickerOpen] = useState(false);
  const linkedLabel = labelForRef(stats, ability.linkedStat);
  const linkedTarget = valueForRef(stats, ability.linkedStat);

  return (
    <View
      testID={testID}
      style={[styles.card, { borderColor: colors.borderStrong, backgroundColor: colors.surface }]}
    >
      {/* Title row */}
      <View style={[styles.titleRow, { borderBottomColor: colors.divider }]}>
        <TextInput
          testID={`${testID}-title`}
          value={ability.title}
          onChangeText={(t) => onChange({ ...ability, title: t })}
          placeholder="Ability name"
          placeholderTextColor={colors.muted}
          style={[styles.titleInput, { color: colors.onSurface, fontFamily: fonts.displayBold }]}
        />
        <Pressable
          testID={`${testID}-delete`}
          onPress={onDelete}
          hitSlop={8}
          style={styles.iconBtn}
        >
          <Icon name="trash-can-outline" size={20} color={colors.muted} />
        </Pressable>
      </View>

      {/* Description */}
      <TextInput
        testID={`${testID}-description`}
        value={ability.description}
        onChangeText={(t) => onChange({ ...ability, description: t })}
        placeholder="Description / effect…"
        placeholderTextColor={colors.muted}
        multiline
        style={[styles.description, { color: colors.onSurface, fontFamily: fonts.body }]}
        textAlignVertical="top"
      />

      {/* Config chips */}
      <View style={styles.chipRow}>
        <Pressable
          testID={`${testID}-link-stat`}
          onPress={() => setPickerOpen(true)}
          style={({ pressed }) => [
            styles.chip,
            {
              borderColor: colors.borderStrong,
              backgroundColor: pressed ? colors.brandTertiary : colors.surfaceSecondary,
              flex: 1,
            },
          ]}
        >
          <Icon name="link-variant" size={14} color={colors.brandPrimary} />
          <Text
            numberOfLines={1}
            style={[styles.chipText, { color: colors.onSurface, fontFamily: fonts.display }]}
          >
            {ability.linkedStat ? linkedLabel : "Link stat"}
          </Text>
          {linkedTarget != null && (
            <Text style={[styles.chipTarget, { color: colors.muted, fontFamily: fonts.displayBold }]}>
              ≥{linkedTarget}
            </Text>
          )}
        </Pressable>

        <Pressable
          testID={`${testID}-effect-type`}
          onPress={() => onChange({ ...ability, effectType: cycleEffect(ability.effectType) })}
          style={({ pressed }) => [
            styles.chip,
            {
              borderColor: colors.borderStrong,
              backgroundColor: pressed ? colors.brandTertiary : colors.surfaceSecondary,
              minWidth: 96,
            },
          ]}
        >
          <Icon
            name={
              ability.effectType === "healing"
                ? "heart-plus-outline"
                : ability.effectType === "damage"
                  ? "sword"
                  : "circle-outline"
            }
            size={14}
            color={
              ability.effectType === "healing"
                ? colors.success
                : ability.effectType === "damage"
                  ? colors.brandSecondary
                  : colors.muted
            }
          />
          <Text style={[styles.chipText, { color: colors.onSurface, fontFamily: fonts.display }]}>
            {EFFECT_LABELS[ability.effectType]}
          </Text>
        </Pressable>
      </View>

      {ability.effectType !== "none" && (
        <View style={styles.rollRow}>
          <Text style={[styles.rollLabel, { color: colors.muted, fontFamily: fonts.displayBold }]}>
            {ability.effectType === "healing" ? "Healing roll" : "Damage roll"}
          </Text>
          <TextInput
            testID={`${testID}-effect-roll`}
            value={ability.effectRoll}
            onChangeText={(t) => onChange({ ...ability, effectRoll: t })}
            placeholder="e.g. 1d6+2"
            placeholderTextColor={colors.muted}
            autoCapitalize="none"
            autoCorrect={false}
            style={[
              styles.rollInput,
              { color: colors.onSurface, borderColor: colors.border, fontFamily: fonts.displayBold },
            ]}
          />
        </View>
      )}

      <Pressable
        testID={`${testID}-use`}
        onPress={() => onUse(ability)}
        style={({ pressed }) => [
          styles.useBtn,
          {
            backgroundColor: pressed ? colors.brandSecondary : colors.brandPrimary,
            borderColor: colors.borderStrong,
          },
        ]}
      >
        <Icon
          name={
            ability.linkedStat
              ? "dice-d20"
              : ability.effectType === "healing"
                ? "heart-plus"
                : ability.effectType === "damage"
                  ? "sword-cross"
                  : "dice-d20"
          }
          size={18}
          color={colors.onBrandPrimary}
        />
        <Text style={[styles.useText, { color: colors.onBrandPrimary, fontFamily: fonts.displayBold }]}>
          {ability.linkedStat
            ? "Use Ability"
            : ability.effectType === "healing" && ability.effectRoll.trim()
              ? "Roll Healing"
              : ability.effectType === "damage" && ability.effectRoll.trim()
                ? "Roll Damage"
                : "Use Ability"}
        </Text>
      </Pressable>

      <StatPickerModal
        visible={pickerOpen}
        stats={stats}
        value={ability.linkedStat}
        onSelect={(ref: StatRef | undefined) => onChange({ ...ability, linkedStat: ref })}
        onClose={() => setPickerOpen(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderWidth: 2,
    padding: 12,
    gap: 10,
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    borderBottomWidth: 1,
    paddingBottom: 4,
    gap: 4,
  },
  titleInput: {
    flex: 1,
    fontSize: 18,
    fontWeight: "700",
    paddingVertical: 4,
  },
  iconBtn: { padding: 4 },
  description: {
    fontSize: 15,
    minHeight: 60,
    paddingVertical: 4,
  },
  chipRow: { flexDirection: "row", gap: 8 },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderWidth: 1.5,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  chipText: { fontSize: 13, flexShrink: 1 },
  chipTarget: { fontSize: 12 },
  rollRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  rollLabel: { fontSize: 13, letterSpacing: 0.5 },
  rollInput: {
    flex: 1,
    borderWidth: 1.5,
    paddingHorizontal: 10,
    paddingVertical: 6,
    fontSize: 15,
    textAlign: "center",
  },
  useBtn: {
    marginTop: 2,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderWidth: 2,
    paddingVertical: 10,
  },
  useText: { fontSize: 15, fontWeight: "700", letterSpacing: 1 },
});
