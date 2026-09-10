import React from "react";
import { View, Text, StyleSheet, Pressable, TextInput } from "react-native";
import { fonts, useTheme } from "@/src/theme";
import { StatBlock as StatBlockType } from "@/src/types";

type Props = {
  block: StatBlockType;
  onChange: (next: StatBlockType) => void;
  onRoll: (label: string, target: number) => void;
};

function NumberField({
  value,
  onChange,
  testID,
}: {
  value: number;
  onChange: (n: number) => void;
  testID: string;
}) {
  const { colors } = useTheme();
  return (
    <TextInput
      testID={testID}
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
  );
}

export default function StatCard({ block, onChange, onRoll }: Props) {
  const { colors } = useTheme();

  const setMain = (n: number) => onChange({ ...block, value: n });
  const setSub = (i: number, n: number) => {
    const subs = block.subs.map((s, idx) => (idx === i ? { ...s, value: n } : s));
    onChange({ ...block, subs });
  };

  return (
    <View
      testID={`stat-card-${block.key}`}
      style={[
        styles.card,
        { borderColor: colors.borderStrong, backgroundColor: colors.surface },
      ]}
    >
      <Pressable
        testID={`stat-main-${block.key}`}
        onPress={() => onRoll(block.name, block.value)}
        style={[styles.header, { borderBottomColor: colors.borderStrong }]}
      >
        <Text style={[styles.headerName, { color: colors.onSurface, fontFamily: fonts.displayBold }]}>
          {block.name}
        </Text>
        <NumberField value={block.value} onChange={setMain} testID={`stat-main-value-${block.key}`} />
      </Pressable>

      <View style={styles.subs}>
        {block.subs.map((s, i) => (
          <Pressable
            key={s.name}
            testID={`sub-skill-${block.key}-${i}`}
            onPress={() => onRoll(s.name, s.value)}
            style={({ pressed }) => [
              styles.subRow,
              { borderBottomColor: colors.divider, backgroundColor: pressed ? colors.brandTertiary : "transparent" },
            ]}
          >
            <Text style={[styles.subName, { color: colors.onSurface, fontFamily: fonts.display }]}>
              {s.name}
            </Text>
            <NumberField
              value={s.value}
              onChange={(n) => setSub(i, n)}
              testID={`sub-skill-value-${block.key}-${i}`}
            />
          </Pressable>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderWidth: 2.5,
    flex: 1,
    minWidth: 0,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderBottomWidth: 2,
  },
  headerName: {
    fontSize: 15,
    fontWeight: "700",
    letterSpacing: 0.8,
    flexShrink: 1,
  },
  subs: {
    paddingHorizontal: 8,
    paddingVertical: 6,
  },
  subRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 8,
    paddingHorizontal: 4,
    borderBottomWidth: 1,
    gap: 8,
  },
  subName: {
    fontSize: 15,
    flexShrink: 1,
  },
  numInput: {
    fontSize: 16,
    fontWeight: "700",
    borderWidth: 1.5,
    minWidth: 40,
    paddingHorizontal: 6,
    paddingVertical: 2,
    textAlign: "center",
  },
});
