import React, { useEffect, useMemo, useState } from "react";
import { Modal, View, Text, StyleSheet, Pressable, ScrollView, TextInput } from "react-native";
import Icon from "@react-native-vector-icons/material-design-icons";
import * as Haptics from "expo-haptics";
import { fonts, useTheme } from "@/src/theme";
import { TraitRef, traitKey } from "@/src/data/lineages";
import { StatKey } from "@/src/types";
import { CustomPreset, CustomPresetKind } from "@/src/storage/customPresets";
import ExportSheetModal from "@/src/components/ExportSheetModal";
import ImportEntityModal from "@/src/components/ImportEntityModal";
import { ExportEntity } from "@/src/storage/sheetTransfer";

export const MAX_TRAITS = 4;

const STATS_ORDER: StatKey[] = ["STR", "DEX", "INT", "CHA"];
const STAT_TITLES: Record<StatKey, string> = {
  STR: "STRENGTH",
  DEX: "DEXTERITY",
  INT: "INTELLIGENCE",
  CHA: "CHARISMA",
};
const SUB_NAMES: Record<StatKey, string[]> = {
  STR: ["Lifting", "Climbing", "Intimidation", "Vitality"],
  DEX: ["Melee Attack", "Ranged Attack", "Sleight of Hand", "Stealth"],
  INT: ["Perception", "Investigation", "History", "First Aid"],
  CHA: ["Persuasion", "Deception", "Haggling", "Creature Handling"],
};

// Must mirror MONSTER_SLOTS order in app/character-hero.tsx's monster creation flow.
const MONSTER_TRAIT_SLOTS: TraitRef[] = [
  { statKey: "STR", subIndex: null },
  { statKey: "DEX", subIndex: null },
  { statKey: "DEX", subIndex: 0 },
  { statKey: "DEX", subIndex: 1 },
  { statKey: "INT", subIndex: null },
];

const heroTraitSlots = (): TraitRef[] =>
  STATS_ORDER.flatMap((statKey) => [
    { statKey, subIndex: null },
    ...Array.from({ length: 4 }, (_, subIndex) => ({ statKey, subIndex })),
  ]);

const traitLabel = (t: TraitRef) => (t.subIndex == null ? `${STAT_TITLES[t.statKey]} (Main)` : SUB_NAMES[t.statKey][t.subIndex]);

const kindLabel: Record<CustomPresetKind, string> = {
  race: "Race",
  class: "Class",
  monsterType: "Enemy Type",
};

type Props = {
  visible: boolean;
  kind: CustomPresetKind;
  onClose: () => void;
  onSaved: (preset: Omit<CustomPreset, "id" | "createdAt">) => void;
};

export default function CustomPresetModal({ visible, kind, onClose, onSaved }: Props) {
  const { colors } = useTheme();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [good, setGood] = useState<TraitRef[]>([]);
  const [bad, setBad] = useState<TraitRef[]>([]);
  const [weaponName, setWeaponName] = useState("");
  const [weaponAttackKind, setWeaponAttackKind] = useState<"melee" | "ranged">("melee");
  const [weaponDamageRoll, setWeaponDamageRoll] = useState("1d6");
  const [maxHealth, setMaxHealth] = useState("15");
  const [exportOpen, setExportOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);

  useEffect(() => {
    if (visible) {
      setName("");
      setDescription("");
      setGood([]);
      setBad([]);
      setWeaponName("");
      setWeaponAttackKind("melee");
      setWeaponDamageRoll("1d6");
      setMaxHealth("15");
    }
  }, [visible]);

  const slots = useMemo(() => (kind === "monsterType" ? MONSTER_TRAIT_SLOTS : heroTraitSlots()), [kind]);

  if (!visible) return null;

  const goodKeys = new Set(good.map(traitKey));
  const badKeys = new Set(bad.map(traitKey));

  const toggleGood = (t: TraitRef) => {
    const k = traitKey(t);
    Haptics.selectionAsync();
    if (goodKeys.has(k)) {
      setGood(good.filter((g) => traitKey(g) !== k));
      return;
    }
    if (good.length >= MAX_TRAITS) return;
    setBad(bad.filter((b) => traitKey(b) !== k));
    setGood([...good, t]);
  };

  const toggleBad = (t: TraitRef) => {
    const k = traitKey(t);
    Haptics.selectionAsync();
    if (badKeys.has(k)) {
      setBad(bad.filter((b) => traitKey(b) !== k));
      return;
    }
    if (bad.length >= MAX_TRAITS) return;
    setGood(good.filter((g) => traitKey(g) !== k));
    setBad([...bad, t]);
  };

  const canSave = name.trim().length > 0;

  const draftPreset: CustomPreset = {
    id: "draft",
    kind,
    name: name.trim() || `Custom ${kindLabel[kind]}`,
    description: description.trim(),
    good,
    bad,
    weapon: kind === "class" ? { name: weaponName.trim() || "Simple Weapon", attackKind: weaponAttackKind, damageRoll: weaponDamageRoll.trim() || "1d6" } : undefined,
    maxHealth: kind === "monsterType" ? Math.max(1, parseInt(maxHealth, 10) || 15) : undefined,
    createdAt: new Date().toISOString(),
  };

  const save = () => {
    if (!canSave) return;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    onSaved({
      kind,
      name: name.trim(),
      description: description.trim(),
      good,
      bad,
      weapon: draftPreset.weapon,
      maxHealth: draftPreset.maxHealth,
    });
  };

  const handleImport = (entity: ExportEntity) => {
    const preset = entity as CustomPreset;
    if (preset.kind !== kind) return;
    setName(preset.name ?? "");
    setDescription(preset.description ?? "");
    setGood(Array.isArray(preset.good) ? preset.good : []);
    setBad(Array.isArray(preset.bad) ? preset.bad : []);
    if (preset.weapon) {
      setWeaponName(preset.weapon.name ?? "");
      setWeaponAttackKind(preset.weapon.attackKind === "ranged" ? "ranged" : "melee");
      setWeaponDamageRoll(preset.weapon.damageRoll ?? "1d6");
    }
    if (preset.maxHealth != null) setMaxHealth(String(preset.maxHealth));
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={[styles.card, { backgroundColor: colors.surfaceSecondary, borderColor: colors.borderStrong }]}>
          <View style={[styles.header, { borderBottomColor: colors.borderStrong }]}>
            <View style={styles.headerLeft}>
              <Icon name="pencil-plus" size={22} color={colors.brandPrimary} />
              <Text style={[styles.title, { color: colors.onSurface, fontFamily: fonts.displayBold }]}>
                Create Custom {kindLabel[kind]}
              </Text>
            </View>
            <Pressable onPress={onClose} hitSlop={10} style={styles.closeBtn}>
              <Icon name="close" size={22} color={colors.onSurface} />
            </Pressable>
          </View>

          <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
            <View style={styles.importExportRow}>
              <Pressable
                testID="custom-preset-import"
                onPress={() => setImportOpen(true)}
                style={[styles.ieBtn, { borderColor: colors.borderStrong, backgroundColor: colors.surface }]}
              >
                <Icon name="file-import-outline" size={16} color={colors.onSurface} />
                <Text style={[styles.ieBtnText, { color: colors.onSurface, fontFamily: fonts.displayBold }]}>Import</Text>
              </Pressable>
              <Pressable
                testID="custom-preset-export"
                onPress={() => canSave && setExportOpen(true)}
                disabled={!canSave}
                style={[styles.ieBtn, { borderColor: colors.borderStrong, backgroundColor: colors.surface, opacity: canSave ? 1 : 0.4 }]}
              >
                <Icon name="file-export-outline" size={16} color={colors.onSurface} />
                <Text style={[styles.ieBtnText, { color: colors.onSurface, fontFamily: fonts.displayBold }]}>Export</Text>
              </Pressable>
            </View>

            <Text style={[styles.fieldLabel, { color: colors.muted, fontFamily: fonts.displayBold }]}>NAME</Text>
            <TextInput
              testID="custom-preset-name"
              value={name}
              onChangeText={setName}
              placeholder={`Name your ${kindLabel[kind].toLowerCase()}`}
              placeholderTextColor={colors.muted}
              style={[styles.input, { color: colors.onSurface, borderColor: colors.borderStrong, fontFamily: fonts.displayBold }]}
            />

            <Text style={[styles.fieldLabel, { color: colors.muted, fontFamily: fonts.displayBold }]}>DESCRIPTION</Text>
            <TextInput
              testID="custom-preset-description"
              value={description}
              onChangeText={setDescription}
              placeholder="A short description or lore blurb"
              placeholderTextColor={colors.muted}
              multiline
              style={[styles.input, styles.textArea, { color: colors.onSurface, borderColor: colors.borderStrong, fontFamily: fonts.body }]}
            />

            {kind === "monsterType" && (
              <>
                <Text style={[styles.fieldLabel, { color: colors.muted, fontFamily: fonts.displayBold }]}>MAX HEALTH</Text>
                <TextInput
                  testID="custom-preset-max-health"
                  value={maxHealth}
                  onChangeText={(t) => setMaxHealth(t.replace(/\D/g, "").slice(0, 3))}
                  keyboardType="number-pad"
                  placeholder="15"
                  placeholderTextColor={colors.muted}
                  style={[styles.input, { color: colors.onSurface, borderColor: colors.borderStrong, fontFamily: fonts.displayBold }]}
                />
              </>
            )}

            {kind === "class" && (
              <>
                <Text style={[styles.fieldLabel, { color: colors.muted, fontFamily: fonts.displayBold }]}>STARTING WEAPON</Text>
                <TextInput
                  testID="custom-preset-weapon-name"
                  value={weaponName}
                  onChangeText={setWeaponName}
                  placeholder="Weapon name"
                  placeholderTextColor={colors.muted}
                  style={[styles.input, { color: colors.onSurface, borderColor: colors.borderStrong, fontFamily: fonts.displayBold }]}
                />
                <View style={styles.weaponRow}>
                  <Pressable
                    testID="custom-preset-weapon-melee"
                    onPress={() => setWeaponAttackKind("melee")}
                    style={[
                      styles.weaponKindBtn,
                      { borderColor: colors.borderStrong, backgroundColor: weaponAttackKind === "melee" ? colors.brandPrimary : colors.surface },
                    ]}
                  >
                    <Icon name="sword" size={14} color={weaponAttackKind === "melee" ? colors.onBrandPrimary : colors.onSurface} />
                    <Text style={[styles.weaponKindText, { color: weaponAttackKind === "melee" ? colors.onBrandPrimary : colors.onSurface, fontFamily: fonts.displayBold }]}>
                      Melee
                    </Text>
                  </Pressable>
                  <Pressable
                    testID="custom-preset-weapon-ranged"
                    onPress={() => setWeaponAttackKind("ranged")}
                    style={[
                      styles.weaponKindBtn,
                      { borderColor: colors.borderStrong, backgroundColor: weaponAttackKind === "ranged" ? colors.brandPrimary : colors.surface },
                    ]}
                  >
                    <Icon name="bow-arrow" size={14} color={weaponAttackKind === "ranged" ? colors.onBrandPrimary : colors.onSurface} />
                    <Text style={[styles.weaponKindText, { color: weaponAttackKind === "ranged" ? colors.onBrandPrimary : colors.onSurface, fontFamily: fonts.displayBold }]}>
                      Ranged
                    </Text>
                  </Pressable>
                  <TextInput
                    testID="custom-preset-weapon-damage"
                    value={weaponDamageRoll}
                    onChangeText={setWeaponDamageRoll}
                    placeholder="1d6"
                    placeholderTextColor={colors.muted}
                    style={[styles.input, styles.weaponDamageInput, { color: colors.onSurface, borderColor: colors.borderStrong, fontFamily: fonts.displayBold }]}
                  />
                </View>
              </>
            )}

            <Text style={[styles.fieldLabel, { color: colors.muted, fontFamily: fonts.displayBold }]}>
              GOOD STATS ({good.length}/{MAX_TRAITS})
            </Text>
            <Text style={[styles.hint, { color: colors.muted, fontFamily: fonts.body }]}>Natural strengths — a low roll goes here.</Text>
            <View style={styles.traitGrid}>
              {slots.map((t) => {
                const k = traitKey(t);
                const active = goodKeys.has(k);
                return (
                  <Pressable
                    key={`good-${k}`}
                    testID={`custom-preset-good-${k}`}
                    onPress={() => toggleGood(t)}
                    style={[
                      styles.traitChip,
                      { borderColor: active ? colors.success : colors.borderStrong, backgroundColor: active ? colors.success : colors.surface },
                    ]}
                  >
                    <Text style={[styles.traitChipText, { color: active ? colors.onBrandPrimary : colors.onSurface, fontFamily: fonts.body }]}>
                      {traitLabel(t)}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            <Text style={[styles.fieldLabel, { color: colors.muted, fontFamily: fonts.displayBold, marginTop: 8 }]}>
              BAD STATS ({bad.length}/{MAX_TRAITS})
            </Text>
            <Text style={[styles.hint, { color: colors.muted, fontFamily: fonts.body }]}>Weak spots — a high roll goes here.</Text>
            <View style={styles.traitGrid}>
              {slots.map((t) => {
                const k = traitKey(t);
                const active = badKeys.has(k);
                return (
                  <Pressable
                    key={`bad-${k}`}
                    testID={`custom-preset-bad-${k}`}
                    onPress={() => toggleBad(t)}
                    style={[
                      styles.traitChip,
                      { borderColor: active ? colors.error : colors.borderStrong, backgroundColor: active ? colors.error : colors.surface },
                    ]}
                  >
                    <Text style={[styles.traitChipText, { color: active ? colors.onBrandPrimary : colors.onSurface, fontFamily: fonts.body }]}>
                      {traitLabel(t)}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            <Pressable
              testID="custom-preset-save"
              onPress={save}
              disabled={!canSave}
              style={[styles.saveBtn, { backgroundColor: colors.brandPrimary, borderColor: colors.borderStrong, opacity: canSave ? 1 : 0.4 }]}
            >
              <Icon name="check-circle" size={18} color={colors.onBrandPrimary} />
              <Text style={[styles.saveBtnText, { color: colors.onBrandPrimary, fontFamily: fonts.displayBold }]}>
                Save Custom {kindLabel[kind]}
              </Text>
            </Pressable>
          </ScrollView>
        </View>
      </View>

      <ExportSheetModal visible={exportOpen} onClose={() => setExportOpen(false)} entity={{ type: "customPreset", value: draftPreset }} />
      <ImportEntityModal visible={importOpen} expectedType="customPreset" onClose={() => setImportOpen(false)} onImport={handleImport} />
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
    maxWidth: 560,
    maxHeight: "90%",
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
  headerLeft: { flexDirection: "row", alignItems: "center", gap: 10, flex: 1 },
  title: { fontSize: 16, letterSpacing: 0.4, flexShrink: 1 },
  closeBtn: { padding: 4 },
  body: { padding: 16, gap: 6 },
  importExportRow: { flexDirection: "row", gap: 8, marginBottom: 8 },
  ieBtn: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, borderWidth: 1.5, paddingVertical: 8 },
  ieBtnText: { fontSize: 12, letterSpacing: 0.4 },
  fieldLabel: { fontSize: 11, letterSpacing: 1, marginTop: 6 },
  hint: { fontSize: 11, lineHeight: 14, marginBottom: 4 },
  input: { borderWidth: 1.5, paddingHorizontal: 10, paddingVertical: 8, fontSize: 14 },
  textArea: { minHeight: 60, textAlignVertical: "top" },
  weaponRow: { flexDirection: "row", gap: 6, alignItems: "center" },
  weaponKindBtn: { flexDirection: "row", alignItems: "center", gap: 4, borderWidth: 1.5, paddingHorizontal: 8, paddingVertical: 8 },
  weaponKindText: { fontSize: 11 },
  weaponDamageInput: { flex: 1, minWidth: 0 },
  traitGrid: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  traitChip: { borderWidth: 1.5, paddingHorizontal: 8, paddingVertical: 6 },
  traitChipText: { fontSize: 11 },
  saveBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderWidth: 2,
    paddingVertical: 12,
    marginTop: 12,
  },
  saveBtnText: { fontSize: 14, letterSpacing: 0.5 },
});
