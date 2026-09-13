import React from "react";
import { View, Text, StyleSheet, Pressable, TextInput } from "react-native";
import Icon from "@react-native-vector-icons/material-design-icons";
import { fonts, useTheme } from "@/src/theme";
import { Currency } from "@/src/types";

type Props = {
  value: Currency;
  onChange: (next: Currency) => void;
};

type CoinKey = keyof Currency;

const COIN_META: Record<
  CoinKey,
  { label: string; short: string; color: string }
> = {
  gold: { label: "Gold", short: "g", color: "#D4AF37" },
  silver: { label: "Silver", short: "s", color: "#B8B8B8" },
  bronze: { label: "Bronze", short: "b", color: "#B26941" },
};

const KEYS: CoinKey[] = ["gold", "silver", "bronze"];

export default function CurrencyPurse({ value, onChange }: Props) {
  const { colors } = useTheme();

  const bump = (key: CoinKey, delta: number) => {
    onChange({ ...value, [key]: Math.max(0, Math.min(9999, value[key] + delta)) });
  };

  const setRaw = (key: CoinKey, raw: string) => {
    const n = parseInt(raw.replace(/\D/g, ""), 10);
    onChange({ ...value, [key]: Number.isFinite(n) ? Math.max(0, Math.min(9999, n)) : 0 });
  };

  return (
    <View
      testID="currency-purse"
      style={[
        styles.wrap,
        { borderColor: colors.borderStrong, backgroundColor: colors.surfaceSecondary },
      ]}
    >
      <View style={[styles.header, { borderBottomColor: colors.divider }]}>
        <Icon name="sack" size={14} color={colors.brandPrimary} />
        <Text
          style={[
            styles.headerText,
            { color: colors.onSurface, fontFamily: fonts.displayBold },
          ]}
        >
          PURSE
        </Text>
      </View>
      <View style={styles.row}>
        {KEYS.map((k) => {
          const meta = COIN_META[k];
          return (
            <View key={k} style={styles.coinCol}>
              <View style={styles.coinTitleRow}>
                <View style={[styles.coinDot, { backgroundColor: meta.color, borderColor: colors.borderStrong }]} />
                <Text
                  style={[
                    styles.coinLabel,
                    { color: colors.onSurface, fontFamily: fonts.displayBold },
                  ]}
                >
                  {meta.short.toUpperCase()}
                </Text>
              </View>
              <View style={styles.stepper}>
                <Pressable
                  testID={`purse-${k}-minus`}
                  onPress={() => bump(k, -1)}
                  onLongPress={() => bump(k, -10)}
                  hitSlop={6}
                  style={({ pressed }) => [
                    styles.stepBtn,
                    {
                      borderColor: colors.borderStrong,
                      backgroundColor: pressed ? colors.brandTertiary : colors.surface,
                    },
                  ]}
                >
                  <Icon name="minus" size={12} color={colors.onSurface} />
                </Pressable>
                <TextInput
                  testID={`purse-${k}-value`}
                  value={String(value[k])}
                  onChangeText={(t) => setRaw(k, t)}
                  keyboardType="number-pad"
                  maxLength={4}
                  disableFullscreenUI
                  style={[
                    styles.valueInput,
                    {
                      color: colors.onSurface,
                      borderColor: colors.borderStrong,
                      backgroundColor: colors.surface,
                      fontFamily: fonts.displayBold,
                    },
                  ]}
                />
                <Pressable
                  testID={`purse-${k}-plus`}
                  onPress={() => bump(k, 1)}
                  onLongPress={() => bump(k, 10)}
                  hitSlop={6}
                  style={({ pressed }) => [
                    styles.stepBtn,
                    {
                      borderColor: colors.borderStrong,
                      backgroundColor: pressed ? colors.brandTertiary : colors.surface,
                    },
                  ]}
                >
                  <Icon name="plus" size={12} color={colors.onSurface} />
                </Pressable>
              </View>
            </View>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    borderWidth: 2,
    overflow: "hidden",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderBottomWidth: 1.5,
  },
  headerText: { fontSize: 11, letterSpacing: 2 },
  row: {
    flexDirection: "row",
    padding: 8,
    gap: 6,
  },
  coinCol: { flex: 1, alignItems: "center", gap: 4 },
  coinTitleRow: { flexDirection: "row", alignItems: "center", gap: 4 },
  coinDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    borderWidth: 1,
  },
  coinLabel: { fontSize: 11, letterSpacing: 1.5 },
  stepper: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    alignSelf: "stretch",
    justifyContent: "center",
  },
  stepBtn: {
    width: 22,
    height: 26,
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
  },
  valueInput: {
    borderWidth: 1.5,
    minWidth: 44,
    height: 26,
    paddingHorizontal: 4,
    paddingVertical: 0,
    fontSize: 14,
    textAlign: "center",
  },
});
