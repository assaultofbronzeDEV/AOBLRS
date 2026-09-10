import React from "react";
import { View, Text, StyleSheet, Modal, Pressable, ScrollView } from "react-native";
import Icon from "@react-native-vector-icons/material-design-icons";
import { fonts, useTheme } from "@/src/theme";
import { StatBlock, StatRef } from "@/src/types";

type Props = {
  visible: boolean;
  stats: StatBlock[];
  value?: StatRef;
  onSelect: (ref: StatRef | undefined) => void;
  onClose: () => void;
};

function refsMatch(a?: StatRef, b?: StatRef) {
  if (!a || !b) return false;
  return a.kind === b.kind && a.statKey === b.statKey && a.subIndex === b.subIndex;
}

export function labelForRef(stats: StatBlock[], ref?: StatRef): string {
  if (!ref) return "None";
  const block = stats.find((s) => s.key === ref.statKey);
  if (!block) return "None";
  if (ref.kind === "main") return block.name;
  if (ref.subIndex == null) return block.name;
  const sub = block.subs[ref.subIndex];
  return sub ? `${block.key} · ${sub.name}` : block.name;
}

export function valueForRef(stats: StatBlock[], ref?: StatRef): number | null {
  if (!ref) return null;
  const block = stats.find((s) => s.key === ref.statKey);
  if (!block) return null;
  if (ref.kind === "main") return block.value;
  if (ref.subIndex == null) return block.value;
  return block.subs[ref.subIndex]?.value ?? null;
}

export default function StatPickerModal({ visible, stats, value, onSelect, onClose }: Props) {
  const { colors } = useTheme();

  const rows: { label: string; ref?: StatRef; target?: number }[] = [
    { label: "None (no linked stat)", ref: undefined },
  ];
  for (const block of stats) {
    rows.push({
      label: block.name,
      ref: { kind: "main", statKey: block.key },
      target: block.value,
    });
    block.subs.forEach((sub, i) => {
      rows.push({
        label: `   ${sub.name}`,
        ref: { kind: "sub", statKey: block.key, subIndex: i },
        target: sub.value,
      });
    });
  }

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable
          style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.borderStrong }]}
          onPress={(e) => e.stopPropagation()}
        >
          <View style={[styles.header, { borderBottomColor: colors.borderStrong }]}>
            <Text style={[styles.title, { color: colors.onSurface, fontFamily: fonts.displayBold }]}>
              Link to Stat
            </Text>
            <Pressable testID="stat-picker-close" onPress={onClose} hitSlop={8}>
              <Icon name="close" size={22} color={colors.onSurface} />
            </Pressable>
          </View>
          <ScrollView contentContainerStyle={{ paddingVertical: 8 }}>
            {rows.map((r, i) => {
              const selected = value ? refsMatch(value, r.ref) : r.ref === undefined;
              return (
                <Pressable
                  key={i}
                  testID={`stat-picker-row-${i}`}
                  onPress={() => {
                    onSelect(r.ref);
                    onClose();
                  }}
                  style={({ pressed }) => [
                    styles.row,
                    {
                      backgroundColor: selected
                        ? colors.brandTertiary
                        : pressed
                          ? colors.surfaceSecondary
                          : "transparent",
                      borderBottomColor: colors.divider,
                    },
                  ]}
                >
                  <Text style={[styles.rowText, { color: colors.onSurface, fontFamily: fonts.display }]}>
                    {r.label}
                  </Text>
                  <View style={styles.rowRight}>
                    {r.target != null && (
                      <Text style={[styles.rowTarget, { color: colors.muted, fontFamily: fonts.displayBold }]}>
                        ≥ {r.target}
                      </Text>
                    )}
                    {selected && <Icon name="check" size={18} color={colors.brandPrimary} />}
                  </View>
                </Pressable>
              );
            })}
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(20,14,8,0.7)",
    justifyContent: "flex-end",
  },
  card: {
    maxHeight: "80%",
    borderTopWidth: 3,
    borderLeftWidth: 3,
    borderRightWidth: 3,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 2,
  },
  title: { fontSize: 20, fontWeight: "700", letterSpacing: 1 },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  rowText: { fontSize: 16, flex: 1 },
  rowRight: { flexDirection: "row", alignItems: "center", gap: 8 },
  rowTarget: { fontSize: 14 },
});
