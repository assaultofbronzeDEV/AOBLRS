import React from "react";
import { View, Text, TextInput, StyleSheet, TextInputProps } from "react-native";
import { fonts, useTheme } from "@/src/theme";

type Props = TextInputProps & {
  label: string;
  testID?: string;
  multiline?: boolean;
  minHeight?: number;
};

export default function LabeledField({
  label,
  testID,
  multiline,
  minHeight,
  style,
  ...rest
}: Props) {
  const { colors } = useTheme();
  return (
    <View style={styles.wrap}>
      <View style={[styles.labelBar, { backgroundColor: colors.surfaceTertiary, borderColor: colors.borderStrong }]}>
        <Text style={[styles.labelText, { color: colors.onSurfaceTertiary, fontFamily: fonts.displayBold }]}>
          {label}
        </Text>
      </View>
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
  labelText: {
    fontSize: 18,
    letterSpacing: 1,
    fontWeight: "700",
  },
  input: {
    borderWidth: 2,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
  },
});
