import React, { useMemo, useState } from "react";
import { View, Text, StyleSheet, Modal, Pressable, ScrollView, TextInput } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Icon from "@react-native-vector-icons/material-design-icons";
import * as Haptics from "expo-haptics";
import { fonts, useTheme, ThemeColors } from "@/src/theme";
import { LootBundle, parseLootBundleImportJson } from "@/src/storage/sheetTransfer";

type Props = {
  visible: boolean;
  onClose: () => void;
  onGenerate: () => void;
  onImport: (bundle: LootBundle) => void;
};

export default function LootModal({ visible, onClose, onGenerate, onImport }: Props) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const styles = getStyles(colors);
  const [jsonText, setJsonText] = useState("");

  const result = useMemo(() => (jsonText.trim() ? parseLootBundleImportJson(jsonText) : null), [jsonText]);

  const handleClose = () => {
    setJsonText("");
    onClose();
  };

  const handleImport = () => {
    if (!result?.success || !result.bundle) return;
    onImport(result.bundle);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setJsonText("");
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={handleClose}>
      <View style={styles.backdrop}>
        <Pressable style={StyleSheet.absoluteFill} onPress={handleClose} />
        <View style={styles.keyboardAvoiding}>
          <View style={[styles.sheet, { paddingTop: insets.top, paddingBottom: 12 + insets.bottom }]}>
            <View style={styles.header}>
              <View style={styles.grabber} />
              <View style={styles.headerRow}>
                <Text style={styles.title} numberOfLines={1}>Loot</Text>
                <Pressable
                  testID="loot-close"
                  onPress={handleClose}
                  hitSlop={10}
                  style={({ pressed }) => [styles.closeBtn, { backgroundColor: pressed ? colors.brandTertiary : "transparent" }]}
                >
                  <Icon name="close" size={20} color={colors.onSurface} />
                </Pressable>
              </View>
            </View>

            <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
              <View style={styles.section}>
                <Icon name="treasure-chest" size={40} color={colors.brandPrimary} />
                <Text style={styles.sectionText}>
                  Roll for a random haul pulled from every storefront category — weapons, armour, potions, and general goods.
                </Text>
                <Pressable
                  testID="loot-generate"
                  onPress={onGenerate}
                  style={({ pressed }) => [styles.primaryBtn, { borderColor: colors.brandPrimary, backgroundColor: pressed ? colors.brandSecondary : colors.brandPrimary }]}
                >
                  <Icon name="dice-multiple" size={18} color={colors.onBrandPrimary} />
                  <Text style={[styles.primaryBtnText, { color: colors.onBrandPrimary }]}>Generate Random Loot</Text>
                </Pressable>
              </View>

              <View style={[styles.divider, { backgroundColor: colors.divider }]} />

              <View style={styles.section}>
                <Text style={styles.sectionHeading}>Import Loot</Text>
                <Text style={styles.sectionText}>Paste a loot bundle exported by your GM to add its contents to your inventory.</Text>
                <TextInput
                  testID="loot-import-input"
                  multiline
                  value={jsonText}
                  onChangeText={setJsonText}
                  placeholder="Paste an exported loot bundle JSON"
                  placeholderTextColor={colors.muted}
                  style={[styles.importInput, { color: colors.onSurface, borderColor: result && !result.success ? colors.error : colors.borderStrong, backgroundColor: colors.surface }]}
                />
                {result && !result.success && (
                  <Text style={[styles.statusText, { color: colors.error }]}>{result.error}</Text>
                )}
                {result?.success && result.bundle && (
                  <Text style={[styles.statusText, { color: colors.success }]}>
                    Ready to add: {result.bundle.items.length} item(s)
                    {result.bundle.currency && (result.bundle.currency.gold || result.bundle.currency.silver || result.bundle.currency.bronze)
                      ? ` and coin`
                      : ""}
                    .
                  </Text>
                )}
                <Pressable
                  testID="loot-import-submit"
                  disabled={!result?.success}
                  onPress={handleImport}
                  style={({ pressed }) => [
                    styles.primaryBtn,
                    {
                      borderColor: colors.brandPrimary,
                      backgroundColor: !result?.success ? colors.surfaceTertiary : pressed ? colors.brandSecondary : colors.brandPrimary,
                      opacity: !result?.success ? 0.6 : 1,
                    },
                  ]}
                >
                  <Icon name="file-import-outline" size={18} color={colors.onBrandPrimary} />
                  <Text style={[styles.primaryBtnText, { color: colors.onBrandPrimary }]}>Import Loot</Text>
                </Pressable>
              </View>
            </ScrollView>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const getStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    backdrop: { flex: 1, backgroundColor: "rgba(20,14,8,0.6)", justifyContent: "flex-end" },
    keyboardAvoiding: { flex: 1, width: "100%", justifyContent: "flex-end" },
    sheet: {
      width: "100%",
      maxHeight: "85%",
      backgroundColor: colors.surface,
      borderWidth: 3,
      borderColor: colors.borderStrong,
    },
    header: {
      paddingHorizontal: 16,
      paddingTop: 8,
      paddingBottom: 10,
      borderBottomWidth: 2,
      borderBottomColor: colors.divider,
      backgroundColor: colors.surfaceSecondary,
    },
    grabber: { alignSelf: "center", width: 42, height: 4, backgroundColor: colors.muted, opacity: 0.4, marginBottom: 6 },
    headerRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
    title: { fontSize: 20, color: colors.onSurface, fontFamily: fonts.displayBold, letterSpacing: 1.5 },
    closeBtn: { width: 34, height: 34, borderWidth: 2, borderColor: colors.borderStrong, alignItems: "center", justifyContent: "center" },
    body: { padding: 16, gap: 16 },
    section: { alignItems: "center", gap: 12 },
    sectionHeading: { fontSize: 15, color: colors.onSurface, fontFamily: fonts.displayBold, letterSpacing: 1, alignSelf: "flex-start" },
    sectionText: { fontSize: 13, color: colors.muted, fontFamily: fonts.display, textAlign: "center", lineHeight: 18 },
    divider: { height: 2, width: "100%" },
    primaryBtn: { flexDirection: "row", alignItems: "center", gap: 8, borderWidth: 2.5, paddingHorizontal: 18, paddingVertical: 12, alignSelf: "stretch", justifyContent: "center" },
    primaryBtnText: { fontSize: 14, fontFamily: fonts.displayBold, letterSpacing: 1 },
    importInput: { minHeight: 100, borderWidth: 1.5, padding: 10, fontSize: 12, textAlignVertical: "top", alignSelf: "stretch" },
    statusText: { fontSize: 12, fontFamily: fonts.body, alignSelf: "flex-start" },
  });
