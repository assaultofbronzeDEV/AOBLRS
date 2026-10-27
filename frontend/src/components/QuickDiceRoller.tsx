import React, { useState } from "react";
import { View, Text, StyleSheet, Pressable, TextInput } from "react-native";
import Icon from "@react-native-vector-icons/material-design-icons";
import { fonts, useTheme } from "@/src/theme";

type Props = {
  initiativeBonus: number;
  onRoll: (notation: string, label: string) => void;
};

export default function QuickDiceRoller({ initiativeBonus, onRoll }: Props) {
  const { colors } = useTheme();
  const [d20, setD20] = useState("1d20");

  return (
    <View style={[styles.card, { borderColor: colors.borderStrong, backgroundColor: colors.surface }]}>
      <Text style={[styles.label, { color: colors.muted, fontFamily: fonts.displayBold }]}>DICE ROLLER</Text>
      <View style={styles.row}>
        <Text style={[styles.dieLabel, { color: colors.muted, fontFamily: fonts.displayBold }]}>D20</Text>
        <TextInput
          testID="quick-roll-d20-input"
          value={d20}
          onChangeText={setD20}
          autoCapitalize="none"
          autoCorrect={false}
          maxLength={24}
          disableFullscreenUI
          style={[styles.input, { color: colors.onSurface, borderColor: colors.border, fontFamily: fonts.displayBold }]}
        />
        <Pressable
          testID="quick-roll-d20"
          onPress={() => d20.trim() && onRoll(d20.trim(), "D20 Roll")}
          style={({ pressed }) => [styles.rollButton, { borderColor: colors.borderStrong, backgroundColor: pressed ? colors.brandSecondary : colors.brandPrimary }]}
          accessibilityLabel={`Roll ${d20 || "D20"}`}
        >
          <Icon name="dice-multiple-outline" size={17} color={colors.onBrandPrimary} />
        </Pressable>
      </View>
      <View style={styles.row}>
        <Text style={[styles.initiativeLabel, { color: colors.muted, fontFamily: fonts.displayBold }]}>INIT</Text>
        <Text
          testID="quick-roll-initiative-notation"
          style={[styles.input, styles.initiativeNotation, { color: colors.onSurface, borderColor: colors.border, fontFamily: fonts.displayBold }]}
        >
          1d6 + {initiativeBonus}
        </Text>
        <Pressable
          testID="quick-roll-initiative"
          onPress={() => onRoll(`1d6+${initiativeBonus}`, "Initiative")}
          style={({ pressed }) => [styles.rollButton, { borderColor: colors.borderStrong, backgroundColor: pressed ? colors.brandSecondary : colors.brandPrimary }]}
          accessibilityLabel={`Roll initiative, 1d6 plus Dexterity ${initiativeBonus}`}
        >
          <Icon name="dice-multiple-outline" size={17} color={colors.onBrandPrimary} />
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { minWidth: 0, borderWidth: 2, padding: 10, gap: 7 },
  label: { fontSize: 11, letterSpacing: 1.5 },
  row: { flexDirection: "row", alignItems: "center", gap: 6 },
  dieLabel: { width: 27, fontSize: 11, letterSpacing: 0.5 },
  initiativeLabel: { width: 38, fontSize: 11, letterSpacing: 0.5 },
  input: { flex: 1, minWidth: 0, borderWidth: 1.5, paddingHorizontal: 8, paddingVertical: 5, fontSize: 14, textAlign: "center" },
  initiativeNotation: { textAlignVertical: "center" },
  rollButton: { width: 34, height: 32, borderWidth: 1.5, alignItems: "center", justifyContent: "center" },
});