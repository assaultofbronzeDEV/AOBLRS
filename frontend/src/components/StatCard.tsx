import React from "react";
import { View, Text, StyleSheet, TextInput } from "react-native";
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
      disableFullscreenUI
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
      <View style={[styles.header, { borderBottomColor: colors.borderStrong }]}>
        {/* Only the abbreviation label triggers a roll */}
        <View style={styles.headerNameCell}>
          <Text
            testID={`stat-main-${block.key}`}
            onPress={() => onRoll(block.name, block.value)}
            numberOfLines={1}
            style={[styles.headerName, { color: colors.onSurface, fontFamily: fonts.displayBold }]}
          >
            {block.key}
          </Text>
          <Text
            numberOfLines={1}
            style={[styles.headerFull, { color: colors.muted, fontFamily: fonts.display }]}
          >
            {block.name}
          </Text>
        </View>
        <NumberField value={block.value} onChange={setMain} testID={`stat-main-value-${block.key}`} />
      </View>

      <View style={styles.subs}>
        {block.subs.map((s, i) => (
          <View key={s.name} style={[styles.subRow, { borderBottomColor: colors.divider }]}>
            <View style={styles.subNameCell}>
              <Text
                testID={`sub-skill-${block.key}-${i}`}
                onPress={() => onRoll(s.name, s.value)}
                numberOfLines={2}
                style={[styles.subName, { color: colors.onSurface, fontFamily: fonts.display }]}
              >
                {s.name}
              </Text>
            </View>
            <NumberField
              value={s.value}
              onChange={(n) => setSub(i, n)}
              testID={`sub-skill-value-${block.key}-${i}`}
            />
          </View>
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
    paddingHorizontal: 10,
    paddingVertical: 10,
    borderBottomWidth: 2,
    gap: 8,
  },
  headerNameCell: {
    flex: 1,
    minWidth: 0,
  },
  headerName: {
    fontSize: 22,
    fontWeight: "700",
    letterSpacing: 1,
  },
  headerFull: {
    fontSize: 10,
    letterSpacing: 1.5,
    marginTop: -2,
    textTransform: "uppercase",
  },
  subs: {
    paddingHorizontal: 8,
    paddingVertical: 6,
  },
  subRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 8,
    paddingHorizontal: 4,
    borderBottomWidth: 1,
    gap: 8,
    minHeight: 42,
  },
  subNameCell: {
    flex: 1,
    minWidth: 0,
  },
  subName: {
    fontSize: 13,
    lineHeight: 16,
  },
  numInput: {
    fontSize: 15,
    fontWeight: "700",
    borderWidth: 1.5,
    width: 46,
    flexShrink: 0,
    paddingHorizontal: 4,
    paddingVertical: 4,
    textAlign: "center",
  },
});
