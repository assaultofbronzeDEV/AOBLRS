import React, { useState } from "react";
import { View, Text, StyleSheet, TextInput, Pressable } from "react-native";
import Icon from "@react-native-vector-icons/material-design-icons";
import { fonts, useTheme } from "@/src/theme";
import { CustomSection } from "@/src/types";

type Props = {
  section: CustomSection;
  onChange: (next: CustomSection) => void;
  onDelete: () => void;
};

export default function CustomSectionCard({ section, onChange, onDelete }: Props) {
  const { colors } = useTheme();
  const [collapsed, setCollapsed] = useState(false);

  return (
    <View testID={`custom-section-${section.id}`}>
      <View
        style={[
          styles.labelBar,
          {
            backgroundColor: colors.surfaceTertiary,
            borderColor: colors.borderStrong,
            borderBottomWidth: collapsed ? 2 : 0,
          },
        ]}
      >
        <TextInput
          testID={`custom-section-${section.id}-title`}
          value={section.title}
          onChangeText={(t) => onChange({ ...section, title: t })}
          placeholder="Section title"
          placeholderTextColor={colors.muted}
          disableFullscreenUI
          style={[styles.labelInput, { color: colors.onSurfaceTertiary, fontFamily: fonts.displayBold }]}
        />
        <Pressable
          testID={`custom-section-${section.id}-toggle`}
          onPress={() => setCollapsed((c) => !c)}
          hitSlop={8}
          style={styles.iconBtn}
        >
          <Icon
            name={collapsed ? "chevron-down" : "chevron-up"}
            size={22}
            color={colors.onSurfaceTertiary}
          />
        </Pressable>
        <Pressable
          testID={`custom-section-${section.id}-delete`}
          onPress={onDelete}
          hitSlop={8}
          style={styles.iconBtn}
        >
          <Icon name="trash-can-outline" size={20} color={colors.muted} />
        </Pressable>
      </View>
      {!collapsed && (
        <TextInput
          testID={`custom-section-${section.id}-content`}
          value={section.content}
          onChangeText={(t) => onChange({ ...section, content: t })}
          multiline
          placeholder="Notes…"
          placeholderTextColor={colors.muted}
          disableFullscreenUI
          style={[
            styles.input,
            {
              color: colors.onSurface,
              borderColor: colors.borderStrong,
              backgroundColor: colors.surface,
              fontFamily: fonts.body,
            },
          ]}
          textAlignVertical="top"
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  labelBar: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 2,
    borderBottomWidth: 0,
    paddingHorizontal: 12,
    paddingVertical: 4,
    gap: 4,
  },
  labelInput: {
    flex: 1,
    fontSize: 18,
    fontWeight: "700",
    letterSpacing: 1,
    paddingVertical: 4,
  },
  iconBtn: { padding: 4 },
  input: {
    borderWidth: 2,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    minHeight: 120,
  },
});
