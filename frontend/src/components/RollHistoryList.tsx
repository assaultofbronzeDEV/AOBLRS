import React from "react";
import { View, Text, StyleSheet, Pressable } from "react-native";
import Icon from "@react-native-vector-icons/material-design-icons";
import { fonts, useTheme } from "@/src/theme";
import { RollHistoryEntry } from "@/src/types";

type Props = {
  history: RollHistoryEntry[];
  onClear: () => void;
};

function verdictColor(entry: RollHistoryEntry, colors: any): string {
  if (entry.verdict === "crit-success") return colors.warning;
  if (entry.verdict === "crit-fail") return colors.brandSecondary;
  if (entry.verdict === "success") return colors.success;
  if (entry.verdict === "fail") return colors.error;
  if (entry.effect) return entry.effect.type === "healing" ? colors.success : colors.brandSecondary;
  return colors.onSurface;
}

function formatTime(iso: string): string {
  try {
    const d = new Date(iso);
    const h = d.getHours().toString().padStart(2, "0");
    const m = d.getMinutes().toString().padStart(2, "0");
    return `${h}:${m}`;
  } catch {
    return "";
  }
}

export default function RollHistoryList({ history, onClear }: Props) {
  const { colors } = useTheme();
  return (
    <View style={{ gap: 6 }}>
      {history.length === 0 ? (
        <Text style={[styles.empty, { color: colors.muted, fontFamily: fonts.display }]}>
          No rolls yet.
        </Text>
      ) : (
        <>
          {history.map((e) => (
            <View
              key={e.id}
              testID={`roll-entry-${e.id}`}
              style={[styles.row, { borderColor: colors.divider }]}
            >
              <View style={styles.rowTop}>
                <Text
                  numberOfLines={1}
                  style={[styles.label, { color: colors.onSurface, fontFamily: fonts.displayBold }]}
                >
                  {e.label}
                </Text>
                <Text style={[styles.time, { color: colors.muted, fontFamily: fonts.body }]}>
                  {formatTime(e.at)}
                </Text>
              </View>
              <View style={styles.rowBottom}>
                {e.target != null && (
                  <Text
                    style={[
                      styles.pill,
                      { color: verdictColor(e, colors), fontFamily: fonts.displayBold },
                    ]}
                  >
                    d20 {e.rolled} vs ≥{e.target}
                    {e.mode ? ` (${e.mode === "advantage" ? "ADV" : "DIS"})` : ""}
                  </Text>
                )}
                {e.verdict && (
                  <Text
                    style={[
                      styles.pill,
                      { color: verdictColor(e, colors), fontFamily: fonts.displayBold },
                    ]}
                  >
                    {verdictText(e.verdict)}
                  </Text>
                )}
                {e.effect && (
                  <Text
                    style={[
                      styles.pill,
                      { color: verdictColor(e, colors), fontFamily: fonts.displayBold },
                    ]}
                  >
                    {e.effect.type === "healing" ? "HEAL" : "DMG"} {e.effect.total} ({e.effect.notation})
                  </Text>
                )}
              </View>
            </View>
          ))}
          <Pressable
            testID="roll-history-clear"
            onPress={onClear}
            style={({ pressed }) => [
              styles.clearBtn,
              {
                borderColor: colors.borderStrong,
                backgroundColor: pressed ? colors.brandTertiary : "transparent",
              },
            ]}
          >
            <Icon name="broom" size={16} color={colors.muted} />
            <Text style={[styles.clearText, { color: colors.muted, fontFamily: fonts.displayBold }]}>
              Clear history
            </Text>
          </Pressable>
        </>
      )}
    </View>
  );
}

function verdictText(v: string): string {
  if (v === "crit-success") return "NAT 20";
  if (v === "crit-fail") return "NAT 1";
  if (v === "success") return "SUCCESS";
  return "FAILURE";
}

const styles = StyleSheet.create({
  empty: { fontStyle: "italic", fontSize: 14 },
  row: {
    borderBottomWidth: 1,
    paddingVertical: 6,
    gap: 2,
  },
  rowTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  rowBottom: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 2,
  },
  label: { fontSize: 14, flex: 1 },
  time: { fontSize: 12 },
  pill: { fontSize: 12, letterSpacing: 0.5 },
  clearBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    borderWidth: 1.5,
    borderStyle: "dashed",
    paddingVertical: 8,
    marginTop: 4,
  },
  clearText: { fontSize: 13, fontWeight: "700", letterSpacing: 0.5 },
});
