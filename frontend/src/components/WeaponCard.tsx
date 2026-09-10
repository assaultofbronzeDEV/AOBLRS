import React from "react";
import { View, Text, StyleSheet, Pressable, TextInput } from "react-native";
import Icon from "@react-native-vector-icons/material-design-icons";
import { fonts, useTheme } from "@/src/theme";
import { AttackKind, StatBlock, Weapon } from "@/src/types";

type Props = {
  weapon: Weapon;
  stats: StatBlock[];
  onChange: (next: Weapon) => void;
  onDelete: () => void;
  onUse: (weapon: Weapon) => void;
  testID?: string;
};

const KIND_LABEL: Record<AttackKind, string> = {
  melee: "Melee",
  ranged: "Ranged",
};

// Resolve the attack skill (DEX subs). Falls back to DEX main if the sub-skill
// isn't there for some reason.
export function getAttackTarget(
  stats: StatBlock[],
  kind: AttackKind,
): { label: string; target: number } {
  const dex = stats.find((s) => s.key === "DEX");
  if (!dex) return { label: kind === "melee" ? "Melee Attack" : "Ranged Attack", target: 15 };
  const subName = kind === "melee" ? "Melee Attack" : "Ranged Attack";
  const sub = dex.subs.find((s) => s.name === subName);
  return { label: sub?.name ?? subName, target: sub?.value ?? dex.value };
}

export default function WeaponCard({ weapon, stats, onChange, onDelete, onUse, testID }: Props) {
  const { colors } = useTheme();
  const attackInfo = getAttackTarget(stats, weapon.attackKind);

  const toggleKind = () => {
    onChange({
      ...weapon,
      attackKind: weapon.attackKind === "melee" ? "ranged" : "melee",
    });
  };

  return (
    <View
      testID={testID}
      style={[styles.card, { borderColor: colors.borderStrong, backgroundColor: colors.surface }]}
    >
      <View style={[styles.titleRow, { borderBottomColor: colors.divider }]}>
        <TextInput
          testID={`${testID}-name`}
          value={weapon.name}
          onChangeText={(t) => onChange({ ...weapon, name: t })}
          placeholder="Weapon name"
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

      <View style={styles.chipRow}>
        <Pressable
          testID={`${testID}-kind`}
          onPress={toggleKind}
          style={({ pressed }) => [
            styles.chip,
            {
              borderColor: colors.borderStrong,
              backgroundColor: pressed ? colors.brandTertiary : colors.surfaceSecondary,
              flex: 1,
            },
          ]}
        >
          <Icon
            name={weapon.attackKind === "melee" ? "sword" : "bow-arrow"}
            size={14}
            color={colors.brandPrimary}
          />
          <Text
            numberOfLines={1}
            style={[styles.chipText, { color: colors.onSurface, fontFamily: fonts.display }]}
          >
            {KIND_LABEL[weapon.attackKind]} · {attackInfo.label}
          </Text>
          <Text style={[styles.chipTarget, { color: colors.muted, fontFamily: fonts.displayBold }]}>
            ≥{attackInfo.target}
          </Text>
        </Pressable>
      </View>

      <View style={styles.rollRow}>
        <Text style={[styles.rollLabel, { color: colors.muted, fontFamily: fonts.displayBold }]}>
          Damage roll
        </Text>
        <TextInput
          testID={`${testID}-damage-roll`}
          value={weapon.damageRoll}
          onChangeText={(t) => onChange({ ...weapon, damageRoll: t })}
          placeholder="e.g. 1d8+1"
          placeholderTextColor={colors.muted}
          autoCapitalize="none"
          autoCorrect={false}
          maxLength={12}
          style={[
            styles.rollInput,
            { color: colors.onSurface, borderColor: colors.border, fontFamily: fonts.displayBold },
          ]}
        />
      </View>

      <Pressable
        testID={`${testID}-attack`}
        onPress={() => onUse(weapon)}
        style={({ pressed }) => [
          styles.attackBtn,
          {
            backgroundColor: pressed ? colors.brandSecondary : colors.brandPrimary,
            borderColor: colors.borderStrong,
          },
        ]}
      >
        <Icon
          name={weapon.attackKind === "melee" ? "sword-cross" : "bow-arrow"}
          size={18}
          color={colors.onBrandPrimary}
        />
        <Text style={[styles.attackText, { color: colors.onBrandPrimary, fontFamily: fonts.displayBold }]}>
          Attack
        </Text>
      </Pressable>
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
  chipRow: { flexDirection: "row", gap: 8 },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderWidth: 1.5,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  chipText: { fontSize: 13, flexShrink: 1, flex: 1 },
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
  attackBtn: {
    marginTop: 2,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderWidth: 2,
    paddingVertical: 10,
  },
  attackText: { fontSize: 15, fontWeight: "700", letterSpacing: 1 },
});
