import React, { useMemo } from "react";
import { View, Text, StyleSheet, Modal, Pressable, ScrollView } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Icon from "@react-native-vector-icons/material-design-icons";
import { fonts, useTheme, ThemeColors } from "@/src/theme";

export type PickerEntry = {
  id: string;
  name: string;
  category: string;
  meta?: string; // secondary info shown on the right (e.g. "1d6", "5s")
  price?: string;
  notes?: string;
  icon?: string; // material-design-icons name
};

type Props = {
  visible: boolean;
  title: string;
  subtitle?: string;
  presets: PickerEntry[];
  categoryOrder?: string[]; // preferred display order for section headers
  customLabel?: string; // e.g. "Create custom weapon"
  emptyMetaHint?: string; // hint to show at bottom if no meta info
  onClose: () => void;
  onSelect: (preset: PickerEntry) => void;
  onCustom: () => void;
  testIDPrefix?: string;
};

export default function PickerSheet({
  visible,
  title,
  subtitle,
  presets,
  categoryOrder,
  customLabel = "Create custom",
  onClose,
  onSelect,
  onCustom,
  testIDPrefix = "picker",
}: Props) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const styles = getStyles(colors);

  const grouped = useMemo(() => {
    const map = new Map<string, PickerEntry[]>();
    for (const p of presets) {
      const arr = map.get(p.category) ?? [];
      arr.push(p);
      map.set(p.category, arr);
    }
    const keys = Array.from(map.keys());
    if (categoryOrder) {
      keys.sort((a, b) => {
        const ai = categoryOrder.indexOf(a);
        const bi = categoryOrder.indexOf(b);
        return (ai < 0 ? 999 : ai) - (bi < 0 ? 999 : bi);
      });
    } else {
      keys.sort();
    }
    return keys.map((k) => ({ key: k, items: map.get(k)! }));
  }, [presets, categoryOrder]);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.backdrop}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
        <View style={styles.keyboardAvoiding}>
          <View style={[styles.sheet, { paddingTop: insets.top, paddingBottom: 12 + insets.bottom }]}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.grabber} />
            <View style={styles.headerRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.title} numberOfLines={1}>
                  {title}
                </Text>
                {subtitle && (
                  <Text style={styles.subtitle} numberOfLines={2}>
                    {subtitle}
                  </Text>
                )}
              </View>
              <Pressable
                testID={`${testIDPrefix}-close`}
                onPress={onClose}
                hitSlop={10}
                style={({ pressed }) => [
                  styles.closeBtn,
                  { backgroundColor: pressed ? colors.brandTertiary : "transparent" },
                ]}
              >
                <Icon name="close" size={20} color={colors.onSurface} />
              </Pressable>
            </View>

            {/* Custom CTA */}
            <Pressable
              testID={`${testIDPrefix}-custom`}
              onPress={() => {
                onCustom();
                onClose();
              }}
              style={({ pressed }) => [
                styles.customBtn,
                {
                  borderColor: colors.brandPrimary,
                  backgroundColor: pressed ? colors.brandSecondary : colors.brandPrimary,
                },
              ]}
            >
              <Icon name="pencil-plus" size={16} color={colors.onBrandPrimary} />
              <Text style={[styles.customBtnText, { color: colors.onBrandPrimary }]}>
                {customLabel}
              </Text>
            </Pressable>
          </View>

          {/* Body */}
          <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.body}>
            {grouped.length === 0 && (
              <Text style={styles.emptyText}>
                Nothing here yet — hit &quot;{customLabel}&quot; above.
              </Text>
            )}
            {grouped.map(({ key, items }) => (
              <View key={key} style={{ gap: 6 }}>
                <Text style={styles.sectionHeader}>{key}</Text>
                {items.map((p) => (
                  <Pressable
                    key={p.id}
                    testID={`${testIDPrefix}-preset-${p.id}`}
                    onPress={() => {
                      onSelect(p);
                      onClose();
                    }}
                    style={({ pressed }) => [
                      styles.entryRow,
                      {
                        borderColor: colors.borderStrong,
                        backgroundColor: pressed
                          ? colors.brandTertiary
                          : colors.surface,
                      },
                    ]}
                  >
                    {p.icon ? (
                      <Icon
                        name={p.icon as any}
                        size={18}
                        color={colors.brandPrimary}
                        style={{ marginRight: 2 }}
                      />
                    ) : null}
                    <View style={{ flex: 1, minWidth: 0 }}>
                      <Text style={styles.entryName} numberOfLines={1}>
                        {p.name}
                      </Text>
                      {p.notes ? (
                        <Text style={styles.entryNotes} numberOfLines={2}>
                          {p.notes}
                        </Text>
                      ) : null}
                    </View>
                    {p.meta ? (
                      <View style={styles.metaChip}>
                        <Text style={styles.metaChipText}>{p.meta}</Text>
                      </View>
                    ) : null}
                    {p.price ? (
                      <View style={styles.priceChip}>
                        <Icon name="cash" size={13} color={colors.onBrandPrimary} />
                        <Text style={styles.priceChipText}>{p.price}</Text>
                      </View>
                    ) : null}
                    <Icon name="plus-circle-outline" size={20} color={colors.brandPrimary} />
                  </Pressable>
                ))}
              </View>
            ))}
          </ScrollView>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const getStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    backdrop: {
      flex: 1,
      backgroundColor: "rgba(20,14,8,0.6)",
      justifyContent: "flex-end",
    },
    keyboardAvoiding: { flex: 1, width: "100%", justifyContent: "flex-end" },
    sheet: {
      flex: 1,
      width: "100%",
      height: "100%",
      maxHeight: "100%",
      backgroundColor: colors.surface,
      borderWidth: 3,
      borderColor: colors.borderStrong,
    },
    header: {
      paddingHorizontal: 16,
      paddingTop: 8,
      paddingBottom: 12,
      borderBottomWidth: 2,
      borderBottomColor: colors.divider,
      backgroundColor: colors.surfaceSecondary,
      gap: 10,
    },
    grabber: {
      alignSelf: "center",
      width: 42,
      height: 4,
      backgroundColor: colors.muted,
      opacity: 0.4,
      marginBottom: 6,
    },
    headerRow: { flexDirection: "row", alignItems: "flex-start", gap: 8 },
    title: {
      fontSize: 20,
      color: colors.onSurface,
      fontFamily: fonts.displayBold,
      letterSpacing: 1.5,
    },
    subtitle: {
      fontSize: 12,
      color: colors.muted,
      fontFamily: fonts.display,
      marginTop: 2,
    },
    closeBtn: {
      width: 34,
      height: 34,
      borderWidth: 2,
      borderColor: colors.borderStrong,
      alignItems: "center",
      justifyContent: "center",
    },
    customBtn: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 6,
      borderWidth: 2.5,
      paddingVertical: 10,
    },
    customBtnText: {
      fontSize: 14,
      fontFamily: fonts.displayBold,
      letterSpacing: 1,
    },
    body: { padding: 12, gap: 14, paddingBottom: 24 },
    emptyText: {
      fontSize: 13,
      color: colors.muted,
      fontFamily: fonts.display,
      fontStyle: "italic",
      textAlign: "center",
      paddingVertical: 20,
    },
    sectionHeader: {
      fontSize: 12,
      color: colors.brandPrimary,
      fontFamily: fonts.displayBold,
      letterSpacing: 2,
      borderBottomWidth: 1.5,
      borderBottomColor: colors.divider,
      paddingBottom: 3,
      marginTop: 4,
    },
    entryRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
      borderWidth: 2,
      paddingVertical: 10,
      paddingHorizontal: 10,
    },
    entryName: {
      fontSize: 15,
      color: colors.onSurface,
      fontFamily: fonts.displayBold,
      letterSpacing: 0.5,
    },
    entryNotes: {
      fontSize: 12,
      color: colors.muted,
      fontFamily: fonts.display,
      lineHeight: 16,
      marginTop: 2,
    },
    metaChip: {
      borderWidth: 1.5,
      borderColor: colors.borderStrong,
      backgroundColor: colors.surfaceSecondary,
      paddingHorizontal: 6,
      paddingVertical: 3,
      minWidth: 42,
      alignItems: "center",
    },
    metaChipText: {
      fontSize: 12,
      color: colors.onSurface,
      fontFamily: fonts.displayBold,
      letterSpacing: 0.5,
    },
    priceChip: {
      flexDirection: "row",
      alignItems: "center",
      gap: 3,
      borderWidth: 1.5,
      borderColor: colors.brandPrimary,
      backgroundColor: colors.brandPrimary,
      paddingHorizontal: 6,
      paddingVertical: 3,
      minWidth: 42,
      justifyContent: "center",
    },
    priceChipText: {
      fontSize: 12,
      color: colors.onBrandPrimary,
      fontFamily: fonts.displayBold,
      letterSpacing: 0.5,
    },
  });
