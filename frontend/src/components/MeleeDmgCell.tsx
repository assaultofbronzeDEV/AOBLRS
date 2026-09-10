import React, { useState } from "react";
import { View, Text, StyleSheet, Pressable, TextInput } from "react-native";
import Icon from "@react-native-vector-icons/material-design-icons";
import { fonts, useTheme } from "@/src/theme";

type Props = {
  value: string;
  onChange: (next: string) => void;
  onRoll: (notation: string) => void;
};

export default function MeleeDmgCell({ value, onChange, onRoll }: Props) {
  const { colors } = useTheme();
  const [editing, setEditing] = useState(false);

  return (
    <View style={[styles.cell, { borderColor: colors.borderStrong, backgroundColor: colors.surface }]}>
      <View style={styles.labelRow}>
        <Text
          style={[styles.label, { color: colors.muted, fontFamily: fonts.displayBold }]}
          numberOfLines={1}
        >
          MELEE DMG
        </Text>
        <Pressable
          testID="melee-dmg-edit"
          onPress={() => setEditing((e) => !e)}
          hitSlop={6}
          style={styles.editBtn}
        >
          <Icon
            name={editing ? "check" : "pencil-outline"}
            size={14}
            color={colors.muted}
          />
        </Pressable>
      </View>

      {editing ? (
        <TextInput
          testID="input-melee-dmg"
          value={value}
          onChangeText={onChange}
          autoFocus
          autoCapitalize="none"
          autoCorrect={false}
          maxLength={12}
          placeholder="1d6"
          placeholderTextColor={colors.muted}
          returnKeyType="done"
          onSubmitEditing={() => setEditing(false)}
          style={[
            styles.input,
            { color: colors.onSurface, borderColor: colors.border, fontFamily: fonts.displayBold },
          ]}
        />
      ) : (
        <Pressable
          testID="melee-dmg-roll"
          onPress={() => value.trim() && onRoll(value.trim())}
          style={({ pressed }) => [
            styles.rollBtn,
            {
              backgroundColor: pressed ? colors.brandSecondary : colors.brandPrimary,
              borderColor: colors.borderStrong,
            },
          ]}
        >
          <Icon name="sword" size={16} color={colors.onBrandPrimary} />
          <Text
            numberOfLines={1}
            style={[styles.rollText, { color: colors.onBrandPrimary, fontFamily: fonts.displayBold }]}
          >
            {value.trim() || "Set roll"}
          </Text>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  cell: {
    flex: 1,
    minWidth: 0,
    borderWidth: 2,
    padding: 10,
    gap: 6,
    alignItems: "stretch",
  },
  labelRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 4,
  },
  label: {
    fontSize: 11,
    letterSpacing: 1.5,
    fontWeight: "700",
    flex: 1,
    textAlign: "center",
    marginLeft: 18,
  },
  editBtn: { padding: 2 },
  input: {
    borderWidth: 1.5,
    paddingHorizontal: 8,
    paddingVertical: 8,
    fontSize: 18,
    textAlign: "center",
  },
  rollBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    borderWidth: 2,
    paddingVertical: 8,
    paddingHorizontal: 8,
  },
  rollText: {
    fontSize: 18,
    fontWeight: "700",
    letterSpacing: 0.5,
    flexShrink: 1,
  },
});
