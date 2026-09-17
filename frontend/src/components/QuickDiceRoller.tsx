import React, { useState } from "react";
import { View, Text, StyleSheet, Pressable, TextInput } from "react-native";
import Icon from "@react-native-vector-icons/material-design-icons";
import { fonts, useTheme } from "@/src/theme";

type Props = {
  onRoll: (notation: string, label: string) => void;
};

export default function QuickDiceRoller({ onRoll }: Props) {
  const { colors } = useTheme();
  const [d20, setD20] = useState("1d20");
  const [d6, setD6] = useState("1d6");
  const rows = [
    { label: "D20", value: d20, setValue: setD20 },
    { label: "D6", value: d6, setValue: setD6 },
  ];

  return (
    <View style={[styles.card, { borderColor: colors.borderStrong, backgroundColor: colors.surface }]}>
      <Text style={[styles.label, { color: colors.muted, fontFamily: fonts.displayBold }]}>DICE ROLLER</Text>
      {rows.map((row) => (
        <View key={row.label} style={styles.row}>
          <Text style={[styles.dieLabel, { color: colors.muted, fontFamily: fonts.displayBold }]}>{row.label}</Text>
          <TextInput
            testID={`quick-roll-${row.label.toLowerCase()}-input`}
            value={row.value}
            onChangeText={row.setValue}
            autoCapitalize="none"
            autoCorrect={false}
            maxLength={24}
            disableFullscreenUI
            style={[styles.input, { color: colors.onSurface, borderColor: colors.border, fontFamily: fonts.displayBold }]}
          />
          <Pressable
            testID={`quick-roll-${row.label.toLowerCase()}`}
            onPress={() => row.value.trim() && onRoll(row.value.trim(), `${row.label} Roll`)}
            style={({ pressed }) => [styles.rollButton, { borderColor: colors.borderStrong, backgroundColor: pressed ? colors.brandSecondary : colors.brandPrimary }]}
            accessibilityLabel={`Roll ${row.value || row.label}`}
          >
            <Icon name="dice-multiple-outline" size={17} color={colors.onBrandPrimary} />
          </Pressable>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { flex: 1, minWidth: 0, borderWidth: 2, padding: 10, gap: 7 },
  label: { fontSize: 11, letterSpacing: 1.5 },
  row: { flexDirection: "row", alignItems: "center", gap: 6 },
  dieLabel: { width: 27, fontSize: 11, letterSpacing: 0.5 },
  input: { flex: 1, minWidth: 0, borderWidth: 1.5, paddingHorizontal: 8, paddingVertical: 5, fontSize: 14, textAlign: "center" },
  rollButton: { width: 34, height: 32, borderWidth: 1.5, alignItems: "center", justifyContent: "center" },
});