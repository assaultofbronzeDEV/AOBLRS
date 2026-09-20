import React, { useMemo, useRef, useState } from "react";
import { Modal, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import Icon from "@react-native-vector-icons/material-design-icons";
import * as Haptics from "expo-haptics";
import { fonts, useTheme } from "@/src/theme";
import {
  cloneEntityWithNewId,
  ExportEntity,
  ExportEntityType,
  parseEntityImportJson,
} from "@/src/storage/sheetTransfer";

type Props = {
  visible: boolean;
  expectedType: ExportEntityType | null;
  onClose: () => void;
  onImport: (entity: ExportEntity) => void;
};

const typeLabel = (type: ExportEntityType) =>
  type === "item" ? "Item" : type === "customPreset" ? "Custom Preset" : type === "statRoll" ? "Stat Roll" : `${type[0].toUpperCase()}${type.slice(1)}`;

export default function ImportEntityModal({ visible, expectedType, onClose, onImport }: Props) {
  const { colors } = useTheme();
  const [jsonText, setJsonText] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const fileInputRef = useRef<any>(null);
  const result = useMemo(() => (jsonText.trim() ? parseEntityImportJson(jsonText) : null), [jsonText]);
  const isMatch = result?.success && result.entityType === expectedType && result.entity;

  const handleFileChange = (event: any) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setJsonText(String(reader.result || ""));
    reader.readAsText(file);
  };

  const handleImport = () => {
    if (!isMatch || !result?.entity) return;
    onImport(cloneEntityWithNewId(result.entity));
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setMessage(`${typeLabel(expectedType!)} imported.`);
    setTimeout(() => {
      setJsonText("");
      setMessage(null);
      onClose();
    }, 700);
  };

  if (!visible || !expectedType) return null;
  const importedName = result?.entity && ("title" in result.entity ? result.entity.title : result.entity.name);

  return (
    <Modal visible transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={[styles.card, { backgroundColor: colors.surfaceSecondary, borderColor: colors.borderStrong }]}>
          {Platform.OS === "web" && (
            <input ref={fileInputRef} type="file" accept=".json,application/json" style={{ display: "none" }} onChange={handleFileChange} />
          )}
          <View style={[styles.header, { borderBottomColor: colors.borderStrong }]}>
            <View style={styles.headerTitle}>
              <Icon name="file-import-outline" size={22} color={colors.brandPrimary} />
              <Text style={[styles.title, { color: colors.onSurface, fontFamily: fonts.displayBold }]}>Import {typeLabel(expectedType)}</Text>
            </View>
            <Pressable onPress={onClose} hitSlop={10} style={styles.iconButton} accessibilityLabel="Close import">
              <Icon name="close" size={22} color={colors.onSurface} />
            </Pressable>
          </View>
          <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
            {Platform.OS === "web" && (
              <Pressable onPress={() => fileInputRef.current?.click()} style={[styles.fileButton, { borderColor: colors.borderStrong, backgroundColor: colors.surface }]}>
                <Icon name="folder-open-outline" size={18} color={colors.brandPrimary} />
                <Text style={[styles.buttonText, { color: colors.onSurface, fontFamily: fonts.displayBold }]}>Choose JSON File</Text>
              </Pressable>
            )}
            <TextInput
              multiline
              value={jsonText}
              onChangeText={(text) => { setJsonText(text); setMessage(null); }}
              placeholder={`Paste an exported ${expectedType} JSON file`}
              placeholderTextColor={colors.muted}
              style={[styles.input, { color: colors.onSurface, borderColor: result && !isMatch ? colors.error : colors.borderStrong, backgroundColor: colors.surface, fontFamily: Platform.OS === "ios" ? "Courier" : "monospace" }]}
            />
            {result && !result.success && <Text style={[styles.status, { color: colors.error, fontFamily: fonts.body }]}>{result.error}</Text>}
            {result?.success && !isMatch && <Text style={[styles.status, { color: colors.error, fontFamily: fonts.body }]}>This file contains a {result.entityType}, not a {expectedType}.</Text>}
            {isMatch && <Text style={[styles.status, { color: colors.success, fontFamily: fonts.body }]}>Ready to add: {importedName || `Unnamed ${expectedType}`}</Text>}
            {message && <Text style={[styles.status, { color: colors.success, fontFamily: fonts.body }]}>{message}</Text>}
            <Pressable disabled={!isMatch} onPress={handleImport} style={[styles.importButton, { backgroundColor: colors.brandPrimary, opacity: isMatch ? 1 : 0.45 }]}>
              <Icon name="file-import-outline" size={18} color={colors.onBrandPrimary} />
              <Text style={[styles.importText, { color: colors.onBrandPrimary, fontFamily: fonts.displayBold }]}>Import {typeLabel(expectedType)}</Text>
            </Pressable>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(0,0,0,0.65)", padding: 16 },
  card: { width: "100%", maxWidth: 540, maxHeight: "88%", borderWidth: 1, borderRadius: 14, overflow: "hidden" },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", borderBottomWidth: 1, paddingHorizontal: 16, paddingVertical: 14 },
  headerTitle: { flexDirection: "row", alignItems: "center", gap: 10 },
  title: { fontSize: 17 },
  iconButton: { padding: 4 },
  body: { padding: 16, gap: 12 },
  fileButton: { alignSelf: "flex-start", flexDirection: "row", alignItems: "center", gap: 8, borderWidth: 1.5, paddingHorizontal: 12, paddingVertical: 9 },
  buttonText: { fontSize: 13 },
  input: { minHeight: 180, borderWidth: 1.5, padding: 10, fontSize: 12, textAlignVertical: "top" },
  status: { fontSize: 13, lineHeight: 18 },
  importButton: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, paddingVertical: 11 },
  importText: { fontSize: 14 },
});
