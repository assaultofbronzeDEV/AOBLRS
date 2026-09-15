import React, { useState, useMemo, useRef } from "react";
import {
  Modal,
  View,
  Text,
  StyleSheet,
  Pressable,
  TextInput,
  ScrollView,
  Platform,
  ActivityIndicator,
} from "react-native";
import Icon from "@react-native-vector-icons/material-design-icons";
import * as Haptics from "expo-haptics";
import { fonts, useTheme } from "@/src/theme";
import { Character } from "@/src/types";
import {
  parseImportJson,
  cloneCharacterWithNewIds,
} from "@/src/storage/sheetTransfer";
import { loadAllCharacters, saveAllCharacters } from "@/src/storage/characters";
import { AgeId, DEFAULT_AGE_ID } from "@/src/ages";

type Props = {
  visible: boolean;
  onClose: () => void;
  onImportSuccess: (count: number) => void;
  age?: AgeId;
};

export default function ImportSheetModal({ visible, onClose, onImportSuccess, age = DEFAULT_AGE_ID }: Props) {
  const { colors } = useTheme();
  const [jsonText, setJsonText] = useState("");
  const [importMode, setImportMode] = useState<"new" | "overwrite">("new");
  const [isImporting, setIsImporting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const fileInputRef = useRef<any>(null);

  const parseResult = useMemo(() => {
    if (!jsonText.trim()) return null;
    return parseImportJson(jsonText);
  }, [jsonText]);

  const handleFileChange = (e: any) => {
    try {
      const file = e.target.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (event) => {
        const content = event.target?.result as string;
        if (content) {
          setJsonText(content);
          setErrorMessage(null);
        }
      };
      reader.readAsText(file);
    } catch (err: any) {
      setErrorMessage(`Failed to read file: ${err.message || "unknown error"}`);
    }
  };

  const handlePickFile = () => {
    if (Platform.OS === "web" && fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleConfirmImport = async () => {
    if (!parseResult || !parseResult.success || !parseResult.characters || parseResult.characters.length === 0) {
      setErrorMessage("No valid character sheets to import.");
      return;
    }

    setIsImporting(true);
    setErrorMessage(null);

    try {
      const existingList = await loadAllCharacters(age);
      let importedCharacters: Character[] = [];

      if (importMode === "new") {
        // Generate new IDs for all imported characters so they never collide with existing
        importedCharacters = parseResult.characters.map((c) => ({ ...cloneCharacterWithNewIds(c), age }));
        const updatedList = [...importedCharacters, ...existingList];
        await saveAllCharacters(updatedList, age);
      } else {
        // Overwrite mode: replace existing matching ID, or append if new
        const map = new Map<string, Character>();
        existingList.forEach((c) => map.set(c.id, c));
        parseResult.characters.forEach((c) => {
          const imported = { ...c, age, updatedAt: new Date().toISOString() };
          map.set(c.id, imported);
          importedCharacters.push(imported);
        });
        await saveAllCharacters(Array.from(map.values()), age);
      }

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setSuccessMessage(`Successfully imported ${importedCharacters.length} ${importedCharacters.length === 1 ? "sheet" : "sheets"}!`);
      
      setTimeout(() => {
        setJsonText("");
        setSuccessMessage(null);
        setIsImporting(false);
        onImportSuccess(importedCharacters.length);
        onClose();
      }, 1000);
    } catch (err: any) {
      setIsImporting(false);
      setErrorMessage(`Import failed: ${err.message || "unknown error"}`);
    }
  };

  if (!visible) return null;

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={[styles.card, { backgroundColor: colors.surfaceSecondary, borderColor: colors.borderStrong }]}>
          {/* Hidden File Input for Web */}
          {Platform.OS === "web" && (
            <input
              type="file"
              ref={fileInputRef}
              accept=".json,application/json"
              style={{ display: "none" }}
              onChange={handleFileChange}
            />
          )}

          {/* Header */}
          <View style={[styles.header, { borderBottomColor: colors.borderStrong }]}>
            <View style={styles.headerLeft}>
              <Icon name="file-import" size={22} color={colors.brandPrimary} />
              <View>
                <Text style={[styles.title, { color: colors.onSurface, fontFamily: fonts.displayBold }]}>
                  Import Sheets
                </Text>
                <Text style={[styles.subtitle, { color: colors.muted, fontFamily: fonts.body }]}>
                  Restore from JSON file or clipboard
                </Text>
              </View>
            </View>
            <Pressable onPress={onClose} hitSlop={10} style={styles.closeBtn}>
              <Icon name="close" size={22} color={colors.onSurface} />
            </Pressable>
          </View>

          {/* Body */}
          <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
            {/* Action Bar */}
            <View style={styles.actionsBar}>
              {Platform.OS === "web" && (
                <Pressable
                  testID="import-pick-file-btn"
                  onPress={handlePickFile}
                  style={({ pressed }) => [
                    styles.filePickBtn,
                    {
                      borderColor: colors.borderStrong,
                      backgroundColor: pressed ? colors.brandTertiary : colors.surface,
                    },
                  ]}
                >
                  <Icon name="folder-open-outline" size={18} color={colors.brandPrimary} />
                  <Text style={[styles.filePickBtnText, { color: colors.onSurface, fontFamily: fonts.displayBold }]}>
                    Choose .JSON File
                  </Text>
                </Pressable>
              )}
            </View>

            {/* Paste Area */}
            <View style={styles.inputSection}>
              <Text style={[styles.label, { color: colors.onSurface, fontFamily: fonts.displayBold }]}>
                Paste Sheet JSON Data
              </Text>
              <TextInput
                testID="import-json-input"
                multiline
                placeholder='Paste raw JSON here, e.g. {"schema":"aob-sheet-v1", ...}'
                placeholderTextColor={colors.muted}
                value={jsonText}
                onChangeText={(text) => {
                  setJsonText(text);
                  setErrorMessage(null);
                }}
                style={[
                  styles.jsonInput,
                  {
                    color: colors.onSurface,
                    backgroundColor: colors.surface,
                    borderColor: parseResult && !parseResult.success ? colors.brandSecondary : colors.borderStrong,
                    fontFamily: Platform.OS === "ios" ? "Courier" : "monospace",
                  },
                ]}
              />
              {jsonText.trim().length > 0 && (
                <Pressable
                  onPress={() => setJsonText("")}
                  style={styles.clearInputBtn}
                >
                  <Text style={[styles.clearInputText, { color: colors.muted, fontFamily: fonts.body }]}>
                    Clear
                  </Text>
                </Pressable>
              )}
            </View>

            {/* Error message */}
            {(errorMessage || (parseResult && !parseResult.success)) && (
              <View style={[styles.errorBox, { backgroundColor: "rgba(239, 68, 68, 0.15)", borderColor: colors.brandSecondary }]}>
                <Icon name="alert-circle-outline" size={18} color={colors.brandSecondary} />
                <Text style={[styles.errorText, { color: colors.brandSecondary, fontFamily: fonts.body }]}>
                  {errorMessage || parseResult?.error}
                </Text>
              </View>
            )}

            {/* Success message */}
            {successMessage && (
              <View style={[styles.successBox, { backgroundColor: "rgba(34, 197, 94, 0.15)", borderColor: colors.success }]}>
                <Icon name="check-circle-outline" size={18} color={colors.success} />
                <Text style={[styles.successText, { color: colors.success, fontFamily: fonts.displayBold }]}>
                  {successMessage}
                </Text>
              </View>
            )}

            {/* Sheet Preview */}
            {parseResult?.success && parseResult.characters && parseResult.characters.length > 0 && (
              <View style={styles.previewSection}>
                <View style={styles.previewHeader}>
                  <Text style={[styles.previewHeading, { color: colors.onSurface, fontFamily: fonts.displayBold }]}>
                    Found {parseResult.characters.length} {parseResult.characters.length === 1 ? "Sheet" : "Sheets"} to Import:
                  </Text>
                </View>

                {parseResult.characters.map((char, i) => (
                  <View
                    key={char.id || i}
                    style={[
                      styles.previewCard,
                      { borderColor: colors.borderStrong, backgroundColor: colors.surface },
                    ]}
                  >
                    <View style={[styles.previewAvatar, { backgroundColor: colors.surfaceTertiary, borderColor: colors.borderStrong }]}>
                      <Icon
                        name={char.kind === "monster" ? "spider" : "shield-sword"}
                        size={20}
                        color={colors.brandPrimary}
                      />
                    </View>
                    <View style={styles.previewInfo}>
                      <Text style={[styles.previewName, { color: colors.onSurface, fontFamily: fonts.displayBold }]}>
                        {char.name || "Unnamed"}
                      </Text>
                      <Text style={[styles.previewMeta, { color: colors.muted, fontFamily: fonts.body }]}>
                        {char.className || (char.kind === "monster" ? "Enemy" : "Hero")} • Lvl {char.level || "1"} • HP {char.hp}/{char.maxHp}
                      </Text>
                      <Text style={[styles.previewSubMeta, { color: colors.muted, fontFamily: fonts.body }]}>
                        {char.weapons?.length || 0} weapons • {(char.oncePerTurn?.length || 0) + (char.oncePerRest?.length || 0) + (char.heroAbilities?.length || 0)} abilities • {char.inventoryItems?.length || 0} items
                      </Text>
                    </View>
                  </View>
                ))}

                {/* Import Mode Selection */}
                <View style={[styles.modeSelection, { borderColor: colors.borderStrong, backgroundColor: colors.surface }]}>
                  <Text style={[styles.modeLabel, { color: colors.onSurface, fontFamily: fonts.displayBold }]}>
                    Import Handling:
                  </Text>
                  
                  <Pressable
                    onPress={() => setImportMode("new")}
                    style={styles.modeOption}
                  >
                    <Icon
                      name={importMode === "new" ? "radiobox-marked" : "radiobox-blank"}
                      size={18}
                      color={importMode === "new" ? colors.brandPrimary : colors.muted}
                    />
                    <View style={styles.modeOptionText}>
                      <Text style={[styles.modeOptionTitle, { color: colors.onSurface, fontFamily: fonts.displayBold }]}>
                        Import as New Copies (Safe)
                      </Text>
                      <Text style={[styles.modeOptionDesc, { color: colors.muted, fontFamily: fonts.body }]}>
                        Assigns fresh IDs so existing sheets will not be overwritten.
                      </Text>
                    </View>
                  </Pressable>

                  <Pressable
                    onPress={() => setImportMode("overwrite")}
                    style={styles.modeOption}
                  >
                    <Icon
                      name={importMode === "overwrite" ? "radiobox-marked" : "radiobox-blank"}
                      size={18}
                      color={importMode === "overwrite" ? colors.brandPrimary : colors.muted}
                    />
                    <View style={styles.modeOptionText}>
                      <Text style={[styles.modeOptionTitle, { color: colors.onSurface, fontFamily: fonts.displayBold }]}>
                        Update / Overwrite by ID
                      </Text>
                      <Text style={[styles.modeOptionDesc, { color: colors.muted, fontFamily: fonts.body }]}>
                        Replaces sheets that have matching IDs, or creates them if new.
                      </Text>
                    </View>
                  </Pressable>
                </View>

                {/* Confirm Import Button */}
                <Pressable
                  testID="confirm-import-btn"
                  disabled={isImporting}
                  onPress={handleConfirmImport}
                  style={({ pressed }) => [
                    styles.confirmBtn,
                    {
                      backgroundColor: pressed ? colors.brandSecondary : colors.brandPrimary,
                      opacity: isImporting ? 0.7 : 1,
                    },
                  ]}
                >
                  {isImporting ? (
                    <ActivityIndicator color={colors.surface} />
                  ) : (
                    <>
                      <Icon name="check-bold" size={18} color={colors.surface} />
                      <Text style={[styles.confirmBtnText, { color: colors.surface, fontFamily: fonts.displayBold }]}>
                        Import {parseResult.characters.length} {parseResult.characters.length === 1 ? "Sheet" : "Sheets"}
                      </Text>
                    </>
                  )}
                </Pressable>
              </View>
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.65)",
    justifyContent: "center",
    alignItems: "center",
    padding: 16,
  },
  card: {
    width: "100%",
    maxWidth: 540,
    maxHeight: "90%",
    borderRadius: 14,
    borderWidth: 1,
    overflow: "hidden",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    flex: 1,
  },
  title: {
    fontSize: 17,
    letterSpacing: 0.5,
  },
  subtitle: {
    fontSize: 12,
    marginTop: 2,
  },
  closeBtn: {
    padding: 4,
  },
  body: {
    padding: 16,
    gap: 14,
  },
  actionsBar: {
    flexDirection: "row",
    gap: 10,
  },
  filePickBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 8,
    borderWidth: 1,
    gap: 8,
  },
  filePickBtnText: {
    fontSize: 13,
  },
  inputSection: {
    gap: 6,
    position: "relative",
  },
  label: {
    fontSize: 12,
    letterSpacing: 0.5,
  },
  jsonInput: {
    height: 120,
    padding: 12,
    fontSize: 11,
    textAlignVertical: "top",
    borderRadius: 8,
    borderWidth: 1,
  },
  clearInputBtn: {
    position: "absolute",
    right: 8,
    top: 28,
    padding: 4,
  },
  clearInputText: {
    fontSize: 11,
  },
  errorBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
  },
  errorText: {
    fontSize: 12,
    flex: 1,
  },
  successBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
  },
  successText: {
    fontSize: 13,
    flex: 1,
  },
  previewSection: {
    gap: 10,
    marginTop: 4,
  },
  previewHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  previewHeading: {
    fontSize: 13,
    letterSpacing: 0.5,
  },
  previewCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    gap: 10,
  },
  previewAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
  },
  previewInfo: {
    flex: 1,
    gap: 2,
  },
  previewName: {
    fontSize: 14,
  },
  previewMeta: {
    fontSize: 12,
  },
  previewSubMeta: {
    fontSize: 11,
  },
  modeSelection: {
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    gap: 10,
  },
  modeLabel: {
    fontSize: 12,
    letterSpacing: 0.5,
  },
  modeOption: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
  },
  modeOptionText: {
    flex: 1,
    gap: 2,
  },
  modeOptionTitle: {
    fontSize: 13,
  },
  modeOptionDesc: {
    fontSize: 11,
  },
  confirmBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
    borderRadius: 8,
    gap: 8,
    marginTop: 4,
  },
  confirmBtnText: {
    fontSize: 15,
    letterSpacing: 0.5,
  },
});
