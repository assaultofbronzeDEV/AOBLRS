import React from "react";
import { View, Text, StyleSheet, Pressable } from "react-native";
import Icon from "@react-native-vector-icons/material-design-icons";
import * as Haptics from "expo-haptics";
import { fonts, useTheme } from "@/src/theme";
import { HP_MAX } from "@/src/types";

type Props = {
  hp: number;
  onChange: (hp: number) => void;
};

const HEARTS_PER_ROW = 10;

export default function HpTracker({ hp, onChange }: Props) {
  const { colors } = useTheme();
  const cells = Array.from({ length: HP_MAX }, (_, i) => i);
  const rows: number[][] = [];
  for (let i = 0; i < cells.length; i += HEARTS_PER_ROW) {
    rows.push(cells.slice(i, i + HEARTS_PER_ROW));
  }

  const step = (delta: number) => {
    const next = Math.max(0, Math.min(HP_MAX, hp + delta));
    if (next !== hp) {
      Haptics.selectionAsync();
      onChange(next);
    }
  };

  const tapHeart = (idx: number) => {
    Haptics.selectionAsync();
    const filled = idx < hp;
    const next = filled ? idx : idx + 1;
    onChange(next);
  };

  return (
    <View style={styles.wrap}>
      <View style={styles.headerRow}>
        <Text style={[styles.label, { color: colors.onSurface, fontFamily: fonts.displayBold }]}>HP</Text>

        <View style={styles.controls}>
          <Pressable
            testID="hp-minus"
            onPress={() => step(-1)}
            onLongPress={() => step(-5)}
            hitSlop={8}
            style={({ pressed }) => [
              styles.stepBtn,
              {
                borderColor: colors.borderStrong,
                backgroundColor: pressed ? colors.brandTertiary : colors.surface,
              },
            ]}
          >
            <Icon name="minus" size={20} color={colors.onSurface} />
          </Pressable>

          <View style={styles.hpValues}>
            <Text testID="hp-current" style={[styles.hpNum, { color: colors.brandSecondary, fontFamily: fonts.displayBold }]}>
              {hp}
            </Text>
            <Text style={[styles.hpSlash, { color: colors.muted, fontFamily: fonts.display }]}>
              {" / "}{HP_MAX}
            </Text>
          </View>

          <Pressable
            testID="hp-plus"
            onPress={() => step(1)}
            onLongPress={() => step(5)}
            hitSlop={8}
            style={({ pressed }) => [
              styles.stepBtn,
              {
                borderColor: colors.borderStrong,
                backgroundColor: pressed ? colors.brandTertiary : colors.surface,
              },
            ]}
          >
            <Icon name="plus" size={20} color={colors.onSurface} />
          </Pressable>
        </View>
      </View>

      <View style={styles.heartsWrap}>
        {rows.map((row, rIdx) => (
          <View key={rIdx} style={styles.heartRow}>
            {row.map((i) => (
              <Pressable
                key={i}
                testID={`hp-heart-${i}`}
                onPress={() => tapHeart(i)}
                hitSlop={2}
                style={styles.heartBtn}
              >
                <Icon
                  name={i < hp ? "cards-heart" : "cards-heart-outline"}
                  size={24}
                  color={i < hp ? colors.brandSecondary : colors.onSurface}
                />
              </Pressable>
            ))}
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 6 },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  label: {
    fontSize: 20,
    letterSpacing: 1.5,
  },
  controls: { flexDirection: "row", alignItems: "center", gap: 10 },
  stepBtn: {
    width: 34,
    height: 34,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
  },
  hpValues: { flexDirection: "row", alignItems: "baseline", minWidth: 76, justifyContent: "center" },
  hpNum: { fontSize: 26, fontWeight: "700" },
  hpSlash: { fontSize: 18 },
  heartsWrap: {
    gap: 4,
  },
  heartRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  heartBtn: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 2,
  },
});
