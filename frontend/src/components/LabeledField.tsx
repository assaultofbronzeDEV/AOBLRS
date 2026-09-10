import React, { useState } from "react";
import { View, Text, TextInput, StyleSheet, TextInputProps, Pressable } from "react-native";
import Icon from "@react-native-vector-icons/material-design-icons";
import { fonts, useTheme } from "@/src/theme";

type Props = TextInputProps & {
  label: string;
  testID?: string;
  multiline?: boolean;
  minHeight?: number;
  collapsible?: boolean;
};

export default function LabeledField({
  label,
  testID,
  multiline,
  minHeight,
  style,
  collapsible,
  ...rest
}: Props) {
  const { colors } = useTheme();
  const [collapsed, setCollapsed] = useState(false);

  const HeaderContent = (
    <View style={styles.labelInner}>
      <Text style={[styles.labelText, { color: colors.onSurfaceTertiary, fontFamily: fonts.displayBold }]}>
        {label}
      </Text>
      {collapsible && (
        <Icon
          name={collapsed ? "chevron-down" : "chevron-up"}
          size={22}
          color={colors.onSurfaceTertiary}
        />
      )}
    </View>
  );

  return (
    <View style={styles.wrap}>
      {collapsible ? (
        <Pressable
          testID={testID ? `${testID}-toggle` : undefined}
          onPress={() => setCollapsed((c) => !c)}
          style={({ pressed }) => [
            styles.labelBar,
            {
              backgroundColor: pressed ? colors.brandTertiary : colors.surfaceTertiary,
              borderColor: colors.borderStrong,
              borderBottomWidth: collapsed ? 2 : 0,
            },
          ]}
        >
          {HeaderContent}
        </Pressable>
      ) : (
        <View
          style={[
            styles.labelBar,
            { backgroundColor: colors.surfaceTertiary, borderColor: colors.borderStrong },
          ]}
        >
          {HeaderContent}
        </View>
      )}
      {!collapsed && (
        <TextInput
          testID={testID}
          multiline={multiline}
          placeholderTextColor={colors.muted}
          style={[
            styles.input,
            {
              color: colors.onSurface,
              borderColor: colors.borderStrong,
              backgroundColor: colors.surface,
              minHeight: minHeight ?? (multiline ? 120 : 44),
              textAlignVertical: multiline ? "top" : "center",
              fontFamily: fonts.body,
            },
            style,
          ]}
          {...rest}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {},
  labelBar: {
    borderWidth: 2,
    borderBottomWidth: 0,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  labelInner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  labelText: {
    fontSize: 18,
    letterSpacing: 1,
    fontWeight: "700",
    flex: 1,
  },
  input: {
    borderWidth: 2,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
  },
});
