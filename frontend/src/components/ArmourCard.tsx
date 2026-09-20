import React from "react";
import { View, Text, StyleSheet, Pressable, TextInput } from "react-native";
import Icon from "@react-native-vector-icons/material-design-icons";
import { Armour } from "@/src/types";
import { fonts, useTheme } from "@/src/theme";

type Props = {
  armour: Armour;
  onChange: (next: Armour) => void;
  onChoose: () => void;
};

export default function ArmourCard({ armour, onChange, onChoose }: Props) {
  const { colors } = useTheme();

  return (
    <View style={[styles.card, { borderColor: colors.borderStrong, backgroundColor: colors.surface }]}>
      <View style={[styles.titleRow, { borderBottomColor: colors.divider }]}>
        <Icon name="shield-outline" size={18} color={colors.brandPrimary} />
        <Text style={[styles.label, { color: colors.muted, fontFamily: fonts.displayBold }]}>ARMOUR</Text>
        <Pressable testID="choose-armour" onPress={onChoose} hitSlop={8} accessibilityLabel="Choose armour">
          <Icon name="pencil" size={18} color={colors.brandPrimary} />
        </Pressable>
      </View>
      <TextInput
        testID="armour-name"
        value={armour.name}
        onChangeText={(name) => onChange({ ...armour, name })}
        placeholder="Armour name"
        placeholderTextColor={colors.muted}
        disableFullscreenUI
        style={[styles.name, { color: colors.onSurface, fontFamily: fonts.displayBold }]}
      />
      <TextInput
        testID="armour-description"
        value={armour.description}
        onChangeText={(description) => onChange({ ...armour, description })}
        placeholder="Description and movement notes"
        placeholderTextColor={colors.muted}
        multiline
        disableFullscreenUI
        style={[styles.description, { color: colors.muted, fontFamily: fonts.body }]}
      />
      <View style={styles.detailRow}>
        <View style={styles.speed}>
          <Icon name="run" size={15} color={colors.brandPrimary} />
          <Text style={[styles.speedLabel, { color: colors.muted, fontFamily: fonts.displayBold }]} numberOfLines={1}>MOVE</Text>
          <TextInput
            testID="armour-movement-speed"
            value={armour.movementSpeed}
            onChangeText={(movementSpeed) => onChange({ ...armour, movementSpeed: movementSpeed.replace(/\D/g, "").slice(0, 2) })}
            keyboardType="number-pad"
            maxLength={2}
            disableFullscreenUI
            style={[styles.speedInput, { color: colors.onSurface, borderColor: colors.border, fontFamily: fonts.displayBold }]}
          />
          <Text style={[styles.unit, { color: colors.muted, fontFamily: fonts.display }]} numberOfLines={1}>ft</Text>
        </View>
        <View style={styles.reduction}>
          <Text style={[styles.reductionLabel, { color: colors.muted, fontFamily: fonts.displayBold }]}>DAMAGE REDUCTION</Text>
          <TextInput
            testID="armour-damage-reduction"
            value={armour.damageReduction}
            onChangeText={(damageReduction) => onChange({ ...armour, damageReduction: damageReduction.replace(/\D/g, "").slice(0, 3) })}
            keyboardType="number-pad"
            maxLength={3}
            disableFullscreenUI
            style={[styles.reductionInput, { color: colors.onSurface, borderColor: colors.border, fontFamily: fonts.displayBold }]}
          />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderWidth: 2, padding: 10, gap: 7, minWidth: 0 },
  titleRow: { flexDirection: "row", alignItems: "center", gap: 5, borderBottomWidth: 1, paddingBottom: 4 },
  label: { flex: 1, fontSize: 11, letterSpacing: 1.5 },
  name: { fontSize: 16, fontWeight: "700", paddingVertical: 2 },
  description: { minHeight: 34, fontSize: 11, lineHeight: 15, padding: 0 },
  detailRow: { gap: 6, minWidth: 0 },
  speed: { flexDirection: "row", alignItems: "center", gap: 4, minWidth: 0, flexShrink: 1 },
  speedLabel: { fontSize: 10, letterSpacing: 0.7, flexShrink: 1 },
  speedInput: { width: 34, flexShrink: 0, borderWidth: 1.5, paddingVertical: 4, textAlign: "center", fontSize: 13 },
  unit: { fontSize: 12, flexShrink: 0 },
  reduction: { flexDirection: "row", alignItems: "center", gap: 6, minWidth: 0, flexShrink: 1 },
  reductionLabel: { fontSize: 10, letterSpacing: 0.5, flexShrink: 1 },
  reductionInput: { width: 38, flexShrink: 0, borderWidth: 1.5, paddingVertical: 4, textAlign: "center", fontSize: 13 },
});
