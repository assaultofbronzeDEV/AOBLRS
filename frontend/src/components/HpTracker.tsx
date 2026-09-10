import React from "react";
import { View, Text, StyleSheet, Pressable, TextInput } from "react-native";
import Icon from "@react-native-vector-icons/material-design-icons";
import * as Haptics from "expo-haptics";
import { fonts, useTheme } from "@/src/theme";

type Props = {
  hp: number;
  hpMax: number;
  onChange: (hp: number, hpMax: number) => void;
};

export default function HpTracker({ hp, hpMax, onChange }: Props) {
  const { colors } = useTheme();
  const cells = Array.from({ length: hpMax }, (_, i) => i);

  const toggle = (idx: number) => {
    Haptics.selectionAsync();
    // If tapping a filled heart, deplete it. If tapping empty, restore it.
    // Standard behavior: hp = number of filled hearts. Toggle sets hp to idx or idx+1.
    const filled = idx < hp;
    const newHp = filled ? idx : idx + 1;
    onChange(newHp, hpMax);
  };

  const changeMax = (text: string) => {
    const n = Math.max(1, Math.min(50, parseInt(text.replace(/\D/g, ""), 10) || 1));
    onChange(Math.min(hp, n), n);
  };

  return (
    <View style={styles.wrap}>
      <View style={styles.headerRow}>
        <Text style={[styles.label, { color: colors.onSurface, fontFamily: fonts.displayBold }]}>HP</Text>
        <View style={styles.hpValues}>
          <Text testID="hp-current" style={[styles.hpNum, { color: colors.brandSecondary, fontFamily: fonts.displayBold }]}>
            {hp}
          </Text>
          <Text style={[styles.hpSlash, { color: colors.muted, fontFamily: fonts.display }]}> / </Text>
          <TextInput
            testID="hp-max-input"
            value={String(hpMax)}
            onChangeText={changeMax}
            keyboardType="number-pad"
            maxLength={2}
            style={[
              styles.hpMaxInput,
              { color: colors.onSurface, borderColor: colors.border, fontFamily: fonts.displayBold },
            ]}
          />
        </View>
      </View>
      <View style={styles.hearts}>
        {cells.map((i) => (
          <Pressable
            key={i}
            testID={`hp-heart-${i}`}
            onPress={() => toggle(i)}
            hitSlop={4}
            style={styles.heartBtn}
          >
            <Icon
              name={i < hp ? "cards-heart" : "cards-heart-outline"}
              size={28}
              color={i < hp ? colors.brandSecondary : colors.onSurface}
            />
          </Pressable>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: 6,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  label: {
    fontSize: 20,
    letterSpacing: 1.5,
  },
  hpValues: { flexDirection: "row", alignItems: "center" },
  hpNum: { fontSize: 24, fontWeight: "700" },
  hpSlash: { fontSize: 22 },
  hpMaxInput: {
    fontSize: 20,
    fontWeight: "700",
    borderBottomWidth: 1.5,
    minWidth: 34,
    textAlign: "center",
    paddingVertical: 0,
  },
  hearts: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 2,
  },
  heartBtn: {
    padding: 2,
  },
});
