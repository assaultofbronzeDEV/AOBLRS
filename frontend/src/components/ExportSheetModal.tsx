import React, { useState, useMemo } from "react";
import {
  Modal,
  View,
  Text,
  StyleSheet,
  Pressable,
  TextInput,
  ScrollView,
  Platform,
} from "react-native";
import Icon from "@react-native-vector-icons/material-design-icons";
import * as Haptics from "expo-haptics";
import { fonts, useTheme } from "@/src/theme";
import { Character } from "@/src/types";
import { AgeId, DEFAULT_AGE_ID } from "@/src/ages";
import {
  createCharacterExportJson,
  createAllCharactersExportJson,
  createEntityExportJson,
  ExportEntity,
  ExportEntityType,
  triggerExportShare,
  sanitizeFilename,
} from "@/src/storage/sheetTransfer";

type Props = {
  visible: boolean;
  onClose: () => void;
  character?: Character | null;
  characters?: Character[] | null;
  entity?: { type: ExportEntityType; value: ExportEntity } | null;
  age?: AgeId;
};

export default function ExportSheetModal({ visible, onClose, character, characters, entity, age = DEFAULT_AGE_ID }: Props) {
  const { colors } = useTheme();
  const [copied, setCopied] = useState(false);
  const [sharingStatus, setSharingStatus] = useState<string | null>(null);

  const isBundle = !character && Array.isArray(characters);

  const jsonContent = useMemo(() => {
    if (!visible) return "";
    if (character) {
      return createCharacterExportJson(character);
    }
    if (characters && characters.length > 0) {
      return createAllCharactersExportJson(characters);
    }
    if (entity) {
      return createEntityExportJson(entity.type, entity.value, age);
    }
    return "";
  }, [visible, character, characters, entity, age]);

  const exportTitle = useMemo(() => {
    if (character) {
      return `${character.name || "Unnamed"} (${character.kind === "monster" ? "Enemy" : "Hero"})`;
    }
    if (characters) {
      return `All Sheets Backup (${characters.length} ${characters.length === 1 ? "sheet" : "sheets"})`;
    }
    if (entity) {
      const name = "title" in entity.value ? entity.value.title : entity.value.name;
      return name || `Unnamed ${entity.type}`;
    }
    return "Export Sheet";
  }, [character, characters, entity]);

  const filename = useMemo(() => {
    if (character) {
      return `aob_${character.kind}_${sanitizeFilename(character.name || "unnamed")}`;
    }
    if (entity) {
      const name = "title" in entity.value ? entity.value.title : entity.value.name;
      return `aob_${entity.type}_${sanitizeFilename(name || "unnamed")}`;
    }
    const dateStr = new Date().toISOString().split("T")[0];
    return `aob_all_sheets_backup_${dateStr}`;
  }, [character, entity]);

  const handleShare = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setSharingStatus("Preparing export...");
    const res = await triggerExportShare(filename, jsonContent, `Export: ${exportTitle}`);
    if (res.success) {
      setSharingStatus("Export started!");
      setTimeout(() => setSharingStatus(null), 2500);
    } else {
      setSharingStatus(res.error || "Export cancelled");
      setTimeout(() => setSharingStatus(null), 2500);
    }
  };

  const handleCopy = async () => {
    try {
      if (Platform.OS === "web" && typeof navigator !== "undefined" && navigator.clipboard) {
        await navigator.clipboard.writeText(jsonContent);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } else {
        // Trigger share sheet on mobile which has native "Copy" option
        await triggerExportShare(filename, jsonContent, exportTitle);
      }
    } catch {
      // Fallback
    }
  };

  if (!visible) return null;

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={[styles.card, { backgroundColor: colors.surfaceSecondary, borderColor: colors.borderStrong }]}>
          {/* Header */}
          <View style={[styles.header, { borderBottomColor: colors.borderStrong }]}>
            <View style={styles.headerLeft}>
              <Icon
                name={isBundle ? "archive-arrow-down" : "file-export"}
                size={22}
                color={colors.brandPrimary}
              />
              <View style={styles.headerTitles}>
                <Text style={[styles.title, { color: colors.onSurface, fontFamily: fonts.displayBold }]}>
                  {isBundle
                    ? "Export All Sheets"
                    : entity
                      ? `Export ${entity.type === "item" ? "Item" : entity.type === "customPreset" ? "Custom Preset" : entity.type === "statRoll" ? "Stat Roll" : entity.type[0].toUpperCase() + entity.type.slice(1)}`
                      : "Export Sheet"}
                </Text>
                <Text numberOfLines={1} style={[styles.subtitle, { color: colors.muted, fontFamily: fonts.body }]}>
                  {exportTitle}
                </Text>
              </View>
            </View>
            <Pressable onPress={onClose} hitSlop={10} style={styles.closeBtn}>
              <Icon name="close" size={22} color={colors.onSurface} />
            </Pressable>
          </View>

          {/* Body */}
          <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
            <Text style={[styles.description, { color: colors.onSurface, fontFamily: fonts.body }]}>
              {isBundle
                ? "This backup file contains all hero and enemy sheets with full stats, abilities, notes, weapons, custom sections, and inventory."
                : entity
                  ? `This file contains this ${entity.type} and can be shared or saved as a standalone JSON file.`
                  : "This file contains the complete sheet data: stats, skills, weapons, abilities, backstory, notes, custom sections, and equipment."}
            </Text>

            {/* Action Buttons */}
            <View style={styles.actionRow}>
              <Pressable
                testID="export-share-btn"
                onPress={handleShare}
                style={({ pressed }) => [
                  styles.primaryBtn,
                  {
                    backgroundColor: pressed ? colors.brandSecondary : colors.brandPrimary,
                  },
                ]}
              >
                <Icon
                  name={Platform.OS === "web" ? "download" : "share-variant"}
                  size={18}
                  color={colors.surface}
                />
                <Text style={[styles.primaryBtnText, { color: colors.surface, fontFamily: fonts.displayBold }]}>
                  {Platform.OS === "web" ? "Download JSON File" : "Share / Save File"}
                </Text>
              </Pressable>

              {Platform.OS === "web" && (
                <Pressable
                  testID="export-copy-btn"
                  onPress={handleCopy}
                  style={({ pressed }) => [
                    styles.secondaryBtn,
                    {
                      borderColor: colors.borderStrong,
                      backgroundColor: pressed ? colors.brandTertiary : colors.surface,
                    },
                  ]}
                >
                  <Icon name={copied ? "check" : "content-copy"} size={18} color={copied ? colors.success : colors.onSurface} />
                  <Text style={[styles.secondaryBtnText, { color: colors.onSurface, fontFamily: fonts.displayBold }]}>
                    {copied ? "Copied!" : "Copy JSON"}
                  </Text>
                </Pressable>
              )}
            </View>

            {sharingStatus && (
              <Text style={[styles.statusText, { color: colors.brandPrimary, fontFamily: fonts.body }]}>
                {sharingStatus}
              </Text>
            )}

            {/* JSON Code view */}
            <View style={styles.codeContainer}>
              <View style={[styles.codeHeader, { borderBottomColor: colors.borderStrong, backgroundColor: colors.surfaceTertiary }]}>
                <Text style={[styles.codeHeaderText, { color: colors.muted, fontFamily: fonts.displayBold }]}>
                  JSON PAYLOAD PREVIEW
                </Text>
              </View>
              <TextInput
                multiline
                editable={false}
                value={jsonContent}
                selectTextOnFocus
                style={[
                  styles.codeInput,
                  {
                    color: colors.onSurface,
                    backgroundColor: colors.surface,
                    borderColor: colors.borderStrong,
                    fontFamily: Platform.OS === "ios" ? "Courier" : "monospace",
                  },
                ]}
              />
            </View>
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
    maxHeight: "88%",
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
  headerTitles: {
    flex: 1,
  },
  title: {
    fontSize: 17,
    letterSpacing: 0.5,
  },
  subtitle: {
    fontSize: 13,
    marginTop: 2,
  },
  closeBtn: {
    padding: 4,
  },
  body: {
    padding: 16,
    gap: 14,
  },
  description: {
    fontSize: 13,
    lineHeight: 18,
  },
  actionRow: {
    flexDirection: "row",
    gap: 10,
    flexWrap: "wrap",
  },
  primaryBtn: {
    flex: 1,
    minWidth: 160,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    gap: 8,
  },
  primaryBtnText: {
    fontSize: 14,
    letterSpacing: 0.5,
  },
  secondaryBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    gap: 8,
  },
  secondaryBtnText: {
    fontSize: 14,
    letterSpacing: 0.5,
  },
  statusText: {
    fontSize: 13,
    textAlign: "center",
  },
  codeContainer: {
    marginTop: 6,
    borderRadius: 8,
    overflow: "hidden",
  },
  codeHeader: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderBottomWidth: 1,
  },
  codeHeaderText: {
    fontSize: 11,
    letterSpacing: 1,
  },
  codeInput: {
    height: 180,
    padding: 12,
    fontSize: 11,
    textAlignVertical: "top",
    borderWidth: 1,
    borderTopWidth: 0,
    borderBottomLeftRadius: 8,
    borderBottomRightRadius: 8,
  },
});
