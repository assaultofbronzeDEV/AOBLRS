import React, { useMemo, useState } from "react";
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from "react-native";
import { useFonts } from "expo-font";
import Icon from "@react-native-vector-icons/material-design-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { fonts, useTheme } from "@/src/theme";
import type { Ability } from "@/src/types";
import {
  BEHAVIOUR_RUNES,
  INTENT_RUNES,
  POWER_RUNES,
  buildRunicSpell,
  type RuneOption,
  type SpellWheelSelection,
} from "@/src/utils/runicSpellcraft";

type Slot = { ring: "intent" | "behaviour" | "power"; position: number };

type PositionedSlot = Slot & {
  x: number;
  y: number;
  diameter: number;
};

type Props = {
  onClose: () => void;
  onCreate: (spell: Ability) => void;
};

const EMPTY_SELECTION: SpellWheelSelection = {
  intent: null,
  behaviours: [null, null, null],
  powers: [null, null, null, null],
};

const SLOT_LAYOUT: Record<Slot["ring"], { x: number; y: number; diameter: number }[]> = {
  intent: [{ x: 0.77, y: 0.67, diameter: 0.32 }],
  behaviour: [
    { x: 0.44, y: 0.60, diameter: 0.14 },
    { x: 0.36, y: 0.36, diameter: 0.14 },
    { x: 0.45, y: 0.145, diameter: 0.14 },
  ],
  power: [
    { x: 0.46, y: 0.90, diameter: 0.12 },
    { x: 0.20, y: 0.72, diameter: 0.12 },
    { x: 0.09, y: 0.40, diameter: 0.12 },
    { x: 0.22, y: 0.11, diameter: 0.12 },
  ],
};

function runeAt(selection: SpellWheelSelection, slot: Slot): string | null {
  if (slot.ring === "intent") return selection.intent;
  return slot.ring === "behaviour"
    ? selection.behaviours[slot.position]
    : selection.powers[slot.position];
}

function runeOptionsFor(slot: Slot): RuneOption[] {
  if (slot.ring === "intent") return INTENT_RUNES;
  return slot.ring === "behaviour" ? BEHAVIOUR_RUNES : POWER_RUNES;
}

function updateSelection(
  selection: SpellWheelSelection,
  slot: Slot,
  rune: string | null,
): SpellWheelSelection {
  if (slot.ring === "intent") return { ...selection, intent: rune };
  if (slot.ring === "behaviour") {
    const behaviours = [...selection.behaviours];
    behaviours[slot.position] = rune;
    return { ...selection, behaviours };
  }
  const powers = [...selection.powers];
  powers[slot.position] = rune;
  return { ...selection, powers };
}

function slotPosition(
  ring: Slot["ring"],
  position: number,
  wheelSize: number,
): PositionedSlot {
  const layout = SLOT_LAYOUT[ring][position];
  return {
    ring,
    position,
    x: wheelSize * layout.x,
    y: wheelSize * layout.y,
    diameter: wheelSize * layout.diameter,
  };
}

function selectedRune(selection: SpellWheelSelection, slot: Slot): RuneOption | undefined {
  const selected = runeAt(selection, slot);
  return selected ? runeOptionsFor(slot).find((rune) => rune.id === selected) : undefined;
}

export default function RunicSpellcraftModal({ onClose, onCreate }: Props) {
  const { colors } = useTheme();
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const [fontLoaded, fontError] = useFonts({
    Aryndosian: require("@/assets/fonts/Aryndosian-Regular.ttf"),
  });
  const [selection, setSelection] = useState<SpellWheelSelection>(EMPTY_SELECTION);
  const [activeSlot, setActiveSlot] = useState<Slot | null>(null);

  const spell = useMemo(() => buildRunicSpell(selection), [selection]);
  const runeCount =
    (selection.intent ? 1 : 0) +
    selection.behaviours.filter(Boolean).length +
    selection.powers.filter(Boolean).length;
  const ringLabel = activeSlot
    ? activeSlot.ring === "intent"
      ? "Intent"
      : `${activeSlot.ring === "behaviour" ? "Behaviour" : "Power"} ${activeSlot.position + 1}`
    : "Rune";
  const wheelSize = Math.min(
    width - 60,
    390,
    Math.max(240, height - insets.top - insets.bottom - 320),
  );
  const modalWidth = Math.min(width - 24, 560);
  const modalMaxHeight = height - insets.top - insets.bottom - 20;
  const positionedSlots: PositionedSlot[] = [
    slotPosition("intent", 0, wheelSize),
    ...Array.from({ length: 3 }, (_, position) => slotPosition("behaviour", position, wheelSize)),
    ...Array.from({ length: 4 }, (_, position) => slotPosition("power", position, wheelSize)),
  ];

  const selectRune = (rune: RuneOption) => {
    if (!activeSlot) return;
    setSelection((current) => updateSelection(current, activeSlot, rune.id));
    setActiveSlot(null);
  };

  const clearSlot = () => {
    if (!activeSlot) return;
    setSelection((current) => updateSelection(current, activeSlot, null));
    setActiveSlot(null);
  };

  return (
    <>
      <Modal transparent visible animationType="slide" onRequestClose={onClose}>
        <View style={[styles.backdrop, { paddingTop: insets.top + 8, paddingBottom: insets.bottom + 8 }]}>
          <View
            testID="runic-spellcraft-modal"
            style={[
              styles.modal,
              {
                width: modalWidth,
                maxHeight: modalMaxHeight,
                backgroundColor: colors.surface,
                borderColor: colors.borderStrong,
              },
            ]}
          >
          <View style={[styles.header, { borderBottomColor: colors.divider }]}>
            <View style={styles.headerText}>
              <Text style={[styles.title, { color: colors.onSurface, fontFamily: fonts.displayBold }]}>
                Runic Spellcraft
              </Text>
              <Text style={[styles.subtitle, { color: colors.muted, fontFamily: fonts.body }]}>
                Choose a circle, then place its rune.
              </Text>
            </View>
            <Pressable
              testID="runic-spellcraft-close"
              onPress={onClose}
              hitSlop={8}
              accessibilityLabel="Close Runic Spellcraft"
              style={styles.closeButton}
            >
              <Icon name="close" size={24} color={colors.onSurface} />
            </Pressable>
          </View>

          <ScrollView
            style={styles.scroll}
            contentContainerStyle={styles.content}
            keyboardShouldPersistTaps="handled"
          >
            <View
              testID="spell-wheel"
              style={[
                styles.wheel,
                {
                  width: wheelSize,
                  height: wheelSize,
                  borderColor: colors.divider,
                },
              ]}
            >
              {positionedSlots.map((slot) => {
                const active =
                  activeSlot != null &&
                  activeSlot.ring === slot.ring &&
                  activeSlot.position === slot.position;
                const rune = selectedRune(selection, slot);
                const emptyLabel =
                  slot.ring === "intent" ? "I" : `${slot.ring === "behaviour" ? "B" : "P"}${slot.position + 1}`;
                return (
                  <Pressable
                    key={`${slot.ring}-${slot.position}`}
                    testID={`spell-wheel-slot-${slot.ring}-${slot.position}`}
                    onPress={() => setActiveSlot({ ring: slot.ring, position: slot.position })}
                    accessibilityRole="button"
                    accessibilityLabel={`${slot.ring} rune slot ${slot.position + 1}${rune ? `, ${rune.name}` : ", empty"}`}
                    accessibilityState={{ selected: active }}
                    style={[
                      styles.wheelSlot,
                      {
                        left: slot.x - slot.diameter / 2,
                        top: slot.y - slot.diameter / 2,
                        width: slot.diameter,
                        height: slot.diameter,
                        borderColor: active ? colors.brandSecondary : colors.borderStrong,
                        backgroundColor: active ? colors.brandTertiary : colors.surface,
                        borderWidth: active ? 3 : 2,
                      },
                    ]}
                  >
                    <Text
                      adjustsFontSizeToFit
                      numberOfLines={1}
                      style={[
                        rune && fontLoaded ? styles.runeGlyph : styles.emptySlotText,
                        {
                          color: rune ? colors.onSurface : colors.muted,
                          fontFamily: rune && fontLoaded ? "Aryndosian" : fonts.displayBold,
                          fontSize: rune ? slot.diameter * 0.62 : slot.diameter * 0.32,
                        },
                      ]}
                    >
                      {rune?.glyph ?? emptyLabel}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            {fontError ? (
              <Text style={[styles.fontError, { color: colors.error, fontFamily: fonts.body }]}>
                The Aryndosian rune font could not be loaded. Reopen the wheel after restarting the app.
              </Text>
            ) : null}

            <View style={[styles.ruleBox, { backgroundColor: colors.surfaceSecondary, borderColor: colors.border }]}>
              <Text style={[styles.ruleText, { color: colors.onSurface, fontFamily: fonts.displayBold }]}>
                {runeCount} / 8 runes · {runeCount === 0 ? "Choose an Intent" : runeCount <= 4 ? "Once Per Turn" : "Once Per Rest"}
              </Text>
              <Text style={[styles.ruleHint, { color: colors.muted, fontFamily: fonts.body }]}>
                Intent is required. One to four runes make a once-per-turn spell; five to eight make a once-per-rest spell.
              </Text>
              {spell?.effectRoll ? (
                <Text style={[styles.ruleHint, { color: colors.onSurface, fontFamily: fonts.display }]}>
                  {spell.effectType === "healing" ? "Healing" : "Damage"} roll: {spell.effectRoll}
                </Text>
              ) : null}
            </View>

            {spell ? (
              <View style={[styles.preview, { borderColor: colors.borderStrong }]}>
                <Text style={[styles.sectionTitle, { color: colors.onSurface, fontFamily: fonts.displayBold }]}>
                  Spell preview
                </Text>
                <Text style={[styles.previewTitle, { color: colors.brandPrimary, fontFamily: fonts.displayBold }]}>
                  {spell.title}
                </Text>
                <Text style={[styles.previewDescription, { color: colors.onSurface, fontFamily: fonts.body }]}>
                  {spell.description}
                </Text>
              </View>
            ) : (
              <Text style={[styles.ruleHint, { color: colors.muted, fontFamily: fonts.body }]}>
                Choose an Intent rune in the central circle to preview the spell.
              </Text>
            )}
          </ScrollView>

          <View style={[styles.footer, { borderTopColor: colors.divider }]}>
            <Pressable
              testID="runic-spellcraft-cancel"
              onPress={onClose}
              style={[styles.footerButton, styles.cancelButton, { borderColor: colors.border }]}
            >
              <Text style={[styles.footerButtonText, { color: colors.onSurface, fontFamily: fonts.displayBold }]}>
                Cancel
              </Text>
            </Pressable>
            <Pressable
              testID="runic-spellcraft-create"
              disabled={!spell || !fontLoaded}
              onPress={() => {
                if (spell) onCreate(spell);
              }}
              style={[
                styles.footerButton,
                {
                  backgroundColor: spell ? colors.brandPrimary : colors.surfaceTertiary,
                  borderColor: colors.borderStrong,
                  opacity: spell && fontLoaded ? 1 : 0.6,
                },
              ]}
            >
              <Text
                style={[
                  styles.footerButtonText,
                  { color: spell && fontLoaded ? colors.onBrandPrimary : colors.onSurfaceTertiary, fontFamily: fonts.displayBold },
                ]}
              >
                Forge Spell
              </Text>
            </Pressable>
          </View>
          </View>
        </View>
      </Modal>

      <Modal
        transparent
        visible={activeSlot != null}
        animationType="fade"
        onRequestClose={() => setActiveSlot(null)}
      >
        <View style={styles.pickerBackdrop}>
          <View
            testID="rune-picker-modal"
            accessibilityViewIsModal
            style={[
              styles.pickerCard,
              {
                width: Math.min(width - 32, 460),
                maxHeight: height - insets.top - insets.bottom - 40,
                backgroundColor: colors.surface,
                borderColor: colors.borderStrong,
              },
            ]}
          >
            <View style={[styles.pickerHeader, { borderBottomColor: colors.divider }]}>
              <View style={styles.headerText}>
                <Text style={[styles.title, { color: colors.onSurface, fontFamily: fonts.displayBold }]}>
                  Choose {ringLabel} Rune
                </Text>
                <Text style={[styles.subtitle, { color: colors.muted, fontFamily: fonts.body }]}>
                  Tap a rune to place it in the selected wheel circle.
                </Text>
              </View>
              <Pressable
                testID="rune-picker-close"
                onPress={() => setActiveSlot(null)}
                hitSlop={8}
                accessibilityLabel="Close rune picker"
                style={styles.closeButton}
              >
                <Icon name="close" size={24} color={colors.onSurface} />
              </Pressable>
            </View>

            <ScrollView
              contentContainerStyle={styles.runePickerOptions}
              keyboardShouldPersistTaps="handled"
            >
              {activeSlot
                ? runeOptionsFor(activeSlot).map((rune) => {
                    const selected = runeAt(selection, activeSlot) === rune.id;
                    return (
                      <Pressable
                        key={rune.id}
                        testID={`select-rune-${rune.id}`}
                        onPress={() => selectRune(rune)}
                        accessibilityRole="button"
                        accessibilityState={{ selected }}
                        style={[
                          styles.runeOption,
                          {
                            backgroundColor: selected ? colors.brandTertiary : colors.surfaceSecondary,
                            borderColor: selected ? colors.brandSecondary : colors.border,
                          },
                        ]}
                      >
                        <Text
                          style={[
                            styles.optionGlyph,
                            {
                              color: colors.onSurface,
                              fontFamily: fontLoaded ? "Aryndosian" : fonts.displayBold,
                            },
                          ]}
                        >
                          {rune.glyph}
                        </Text>
                        <View style={styles.runeOptionText}>
                          <Text style={[styles.runeName, { color: colors.onSurface, fontFamily: fonts.displayBold }]}>
                            {rune.name}
                          </Text>
                          <Text style={[styles.runeMeaning, { color: colors.muted, fontFamily: fonts.body }]}>
                            {rune.meaning}
                          </Text>
                        </View>
                        {selected ? <Icon name="check" size={20} color={colors.brandSecondary} /> : null}
                      </Pressable>
                    );
                  })
                : null}
            </ScrollView>

            <View style={[styles.pickerFooter, { borderTopColor: colors.divider }]}>
              {activeSlot && runeAt(selection, activeSlot) ? (
                <Pressable
                  testID="spell-wheel-clear-slot"
                  onPress={clearSlot}
                  style={[styles.footerButton, styles.clearButton, { borderColor: colors.border }]}
                >
                  <Text style={[styles.clearButtonText, { color: colors.onSurface, fontFamily: fonts.displayBold }]}>
                    Remove Rune
                  </Text>
                </Pressable>
              ) : null}
              <Pressable
                testID="rune-picker-cancel"
                onPress={() => setActiveSlot(null)}
                style={[styles.footerButton, { backgroundColor: colors.brandPrimary, borderColor: colors.borderStrong }]}
              >
                <Text style={[styles.footerButtonText, { color: colors.onBrandPrimary, fontFamily: fonts.displayBold }]}>
                  Cancel
                </Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.68)",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 12,
  },
  modal: { borderWidth: 2, borderRadius: 12, overflow: "hidden" },
  header: { flexDirection: "row", alignItems: "center", padding: 14, borderBottomWidth: 1, gap: 12 },
  headerText: { flex: 1, gap: 4 },
  title: { fontSize: 20 },
  subtitle: { fontSize: 13, lineHeight: 18 },
  closeButton: { padding: 4 },
  scroll: { flex: 1 },
  content: { alignItems: "center", padding: 14, gap: 14 },
  fontError: { width: "100%", fontSize: 12, lineHeight: 17, textAlign: "center" },
  wheel: { position: "relative", alignItems: "center", justifyContent: "center" },
  wheelSlot: {
    position: "absolute",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 999,
    padding: 2,
  },
  pickerBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.72)",
    alignItems: "center",
    justifyContent: "center",
    padding: 16,
  },
  pickerCard: { borderWidth: 2, borderRadius: 12, overflow: "hidden" },
  pickerHeader: { flexDirection: "row", alignItems: "center", padding: 14, borderBottomWidth: 1, gap: 12 },
  runePickerOptions: { padding: 14, gap: 9 },
  pickerFooter: { flexDirection: "row", padding: 12, gap: 10, borderTopWidth: 1 },
  runeGlyph: { textAlign: "center", includeFontPadding: false },
  emptySlotText: { textAlign: "center", includeFontPadding: false },
  ruleBox: { width: "100%", borderWidth: 1, borderRadius: 8, padding: 10, gap: 5 },
  ruleText: { fontSize: 15 },
  ruleHint: { fontSize: 12, lineHeight: 17 },
  sectionTitle: { fontSize: 16 },
  clearButton: { flex: 1, backgroundColor: "transparent" },
  clearButtonText: { fontSize: 12 },
  runeOption: { width: "100%", flexDirection: "row", alignItems: "center", gap: 10, borderWidth: 1, borderRadius: 8, padding: 10, minHeight: 68 },
  optionGlyph: { width: 32, textAlign: "center", fontSize: 28 },
  runeOptionText: { flex: 1 },
  runeName: { fontSize: 13 },
  runeMeaning: { fontSize: 11, lineHeight: 15, marginTop: 3 },
  preview: { width: "100%", borderWidth: 1, borderRadius: 8, padding: 10, gap: 6 },
  previewTitle: { fontSize: 15 },
  previewDescription: { fontSize: 12, lineHeight: 18 },
  footer: { flexDirection: "row", padding: 12, gap: 10, borderTopWidth: 1 },
  footerButton: { flex: 1, minHeight: 44, borderWidth: 1, borderRadius: 8, alignItems: "center", justifyContent: "center" },
  cancelButton: { backgroundColor: "transparent" },
  footerButtonText: { fontSize: 14 },
});
