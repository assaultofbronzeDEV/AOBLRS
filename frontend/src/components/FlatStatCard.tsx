import React from "react";
import { View, Text, StyleSheet, TextInput } from "react-native";
import { fonts, useTheme } from "@/src/theme";

type Props = {
  short: string; // 3-letter abbreviation
  full: string; // full label under short
  value: number;
  onChange: (n: number) => void;
  onRoll: (label: string, target: number) => void;
  testID?: string;
};

export default function FlatStatCard({ short, full, value, onChange, onRoll, testID }: Props) {
  const { colors } = useTheme();
  return (
    <View
      testID={testID}
      style={[styles.card, { borderColor: colors.borderStrong, backgroundColor: colors.surface }]}
    >
      <View style={styles.nameCol}>
        <Text
          testID={testID ? `${testID}-label` : undefined}
          onPress={() => onRoll(full, value)}
          numberOfLines={1}
          adjustsFontSizeToFit
          style={[styles.short, { color: colors.onSurface, fontFamily: fonts.displayBold }]}
        >
          {short}
        </Text>
        <Text
          numberOfLines={1}
          style={[styles.full, { color: colors.muted, fontFamily: fonts.display }]}
        >
          {full}
        </Text>
      </View>
      <TextInput
        testID={testID ? `${testID}-value` : undefined}
        value={String(value)}
        onChangeText={(t) => {
          const n = Math.max(0, Math.min(99, parseInt(t.replace(/\D/g, ""), 10) || 0));
          onChange(n);
        }}
        keyboardType="number-pad"
        maxLength={2}
        style={[
          styles.numInput,
          { color: colors.onSurface, borderColor: colors.border, fontFamily: fonts.displayBold },
        ]}
      />
    </View>
  );
}

// Short-code helper for arbitrary stat names.
export function abbreviateStat(name: string): string {
  const clean = name.trim().toUpperCase();
  if (!clean) return "STAT";
  const known: Record<string, string> = {
    STRENGTH: "STR",
    DEXTERITY: "DEX",
    INTELLIGENCE: "INT",
    CHARISMA: "CHA",
    "MELEE ATTACK": "MEL",
    "RANGED ATTACK": "RNG",
    "SPECIAL ABILITY": "SPC",
  };
  if (known[clean]) return known[clean];
  const words = clean.split(/\s+/);
  if (words.length >= 2) return (words[0][0] + words[1][0] + (words[2]?.[0] ?? "")).slice(0, 3);
  return clean.slice(0, 3);
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    minWidth: 0,
    borderWidth: 2.5,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 10,
    gap: 8,
  },
  nameCol: { flex: 1, minWidth: 0 },
  short: { fontSize: 22, fontWeight: "700", letterSpacing: 1 },
  full: { fontSize: 10, letterSpacing: 1.5, marginTop: -2, textTransform: "uppercase" },
  numInput: {
    fontSize: 16,
    fontWeight: "700",
    borderWidth: 1.5,
    width: 52,
    flexShrink: 0,
    paddingHorizontal: 6,
    paddingVertical: 4,
    textAlign: "center",
  },
});
