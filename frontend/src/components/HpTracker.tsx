import React from "react";
import { View, Text, StyleSheet, Pressable, TextInput } from "react-native";
import Icon from "@react-native-vector-icons/material-design-icons";
import * as Haptics from "expo-haptics";
import { fonts, useTheme } from "@/src/theme";

type Props = {
  hp: number;
  maxHp: number;
  onChange: (hp: number) => void;
  editableMax?: boolean;
  onMaxChange?: (maxHp: number) => void;
};

const HEARTS_PER_ROW = 10;

export default function HpTracker({ hp, maxHp, onChange, editableMax, onMaxChange }: Props) {
  const { colors } = useTheme();
  const [maxDraft, setMaxDraft] = React.useState<string>(String(maxHp));

  React.useEffect(() => {
    setMaxDraft(String(maxHp));
  }, [maxHp]);

  const commitMax = () => {
    const n = Math.max(1, Math.min(80, parseInt(maxDraft.replace(/\D/g, ""), 10) || 1));
    setMaxDraft(String(n));
    onMaxChange?.(n);
  };

  const cells = Array.from({ length: maxHp }, (_, i) => i);
  const rows: number[][] = [];
  for (let i = 0; i < cells.length; i += HEARTS_PER_ROW) {
    rows.push(cells.slice(i, i + HEARTS_PER_ROW));
  }

  const step = (delta: number) => {
    const next = Math.max(0, Math.min(maxHp, hp + delta));
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
          <View style={styles.hpValues}>
            <Text testID="hp-current" style={[styles.hpNum, { color: colors.brandSecondary, fontFamily: fonts.displayBold }]}>
              {hp}
            </Text>
            <Text style={[styles.hpSlash, { color: colors.muted, fontFamily: fonts.display }]}>
              {" / "}
            </Text>
            {editableMax && onMaxChange ? (
              <TextInput
                testID="hp-max-input"
                value={maxDraft}
                onChangeText={(t) => setMaxDraft(t.replace(/\D/g, "").slice(0, 2))}
                onBlur={commitMax}
                onEndEditing={commitMax}
                keyboardType="number-pad"
                maxLength={2}
                disableFullscreenUI
                style={[
                  styles.hpMaxInput,
                  {
                    color: colors.onSurface,
                    borderColor: colors.border,
                    fontFamily: fonts.displayBold,
                  },
                ]}
              />
            ) : (
              <Text style={[styles.hpMax, { color: colors.muted, fontFamily: fonts.displayBold }]}>
                {maxHp}
              </Text>
            )}
          </View>

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
  controls: { flexDirection: "row", alignItems: "center", gap: 8 },
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
  hpMax: { fontSize: 20 },
  hpMaxInput: {
    fontSize: 18,
    fontWeight: "700",
    borderBottomWidth: 1.5,
    width: 34,
    textAlign: "center",
    paddingVertical: 0,
  },
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
