import React, { useEffect, useState } from "react";
import { Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import Icon from "@react-native-vector-icons/material-design-icons";
import { fonts, useTheme } from "@/src/theme";
import { PotionPreset } from "@/src/data/potions";

type Props = {
  visible: boolean;
  onClose: () => void;
  onSave: (potion: PotionPreset) => void;
};

export default function CustomPotionModal({ visible, onClose, onSave }: Props) {
  const { colors } = useTheme();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [ingredients, setIngredients] = useState("1");
  const [requiredLevel, setRequiredLevel] = useState("1");
  const [effectRoll, setEffectRoll] = useState("");

  useEffect(() => {
    if (visible) {
      setName("");
      setDescription("");
      setIngredients("1");
      setRequiredLevel("1");
      setEffectRoll("");
    }
  }, [visible]);

  const save = () => {
    const trimmedName = name.trim();
    if (!trimmedName) return;
    onSave({
      id: `custom-potion-${Date.now()}`,
      name: trimmedName,
      description: description.trim() || "A custom potion brewed at the table.",
      ingredients: Math.max(1, Math.min(9999, parseInt(ingredients.replace(/\D/g, ""), 10) || 1)),
      requiredLevel: Math.max(1, Math.min(20, parseInt(requiredLevel.replace(/\D/g, ""), 10) || 1)),
      effectRoll: effectRoll.trim() || undefined,
    });
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={[styles.card, { backgroundColor: colors.surfaceSecondary, borderColor: colors.borderStrong }]}>
          <View style={styles.header}>
            <View style={styles.titleRow}>
              <Icon name="flask-plus-outline" size={22} color={colors.brandPrimary} />
              <Text style={[styles.title, { color: colors.onSurface, fontFamily: fonts.displayBold }]}>Custom Potion</Text>
            </View>
            <Pressable onPress={onClose} hitSlop={10}><Icon name="close" size={22} color={colors.onSurface} /></Pressable>
          </View>
          <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
            <TextInput value={name} onChangeText={setName} placeholder="Potion name" placeholderTextColor={colors.muted} style={[styles.input, { color: colors.onSurface, borderColor: colors.borderStrong, backgroundColor: colors.surface }]} />
            <TextInput value={description} onChangeText={setDescription} placeholder="Description / effect" placeholderTextColor={colors.muted} multiline style={[styles.input, styles.description, { color: colors.onSurface, borderColor: colors.borderStrong, backgroundColor: colors.surface }]} />
            <View style={styles.fieldRow}>
              <TextInput value={ingredients} onChangeText={setIngredients} placeholder="Ingredients" keyboardType="number-pad" style={[styles.input, styles.smallInput, { color: colors.onSurface, borderColor: colors.borderStrong, backgroundColor: colors.surface }]} />
              <TextInput value={requiredLevel} onChangeText={setRequiredLevel} placeholder="Required level" keyboardType="number-pad" style={[styles.input, styles.smallInput, { color: colors.onSurface, borderColor: colors.borderStrong, backgroundColor: colors.surface }]} />
            </View>
            <TextInput value={effectRoll} onChangeText={setEffectRoll} placeholder="Effect roll (optional, e.g. 2d8 healing)" placeholderTextColor={colors.muted} style={[styles.input, { color: colors.onSurface, borderColor: colors.borderStrong, backgroundColor: colors.surface }]} />
            <Pressable disabled={!name.trim()} onPress={save} style={[styles.save, { backgroundColor: colors.brandPrimary, borderColor: colors.borderStrong, opacity: name.trim() ? 1 : 0.45 }]}>
              <Icon name="flask-plus-outline" size={18} color={colors.onBrandPrimary} />
              <Text style={[styles.saveText, { color: colors.onBrandPrimary, fontFamily: fonts.displayBold }]}>Save Potion</Text>
            </Pressable>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.65)", justifyContent: "center", padding: 16 },
  card: { width: "100%", maxWidth: 560, maxHeight: "88%", borderWidth: 1 },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", padding: 16, borderBottomWidth: 1 },
  titleRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  title: { fontSize: 18 },
  body: { padding: 16, gap: 12 },
  input: { borderWidth: 1.5, padding: 10, fontSize: 15, fontFamily: fonts.body },
  description: { minHeight: 80, textAlignVertical: "top" },
  fieldRow: { flexDirection: "row", gap: 10 },
  smallInput: { flex: 1 },
  save: { flexDirection: "row", justifyContent: "center", alignItems: "center", gap: 8, borderWidth: 1.5, padding: 12 },
  saveText: { fontSize: 14 },
});
