import React from "react";
import { View, Text, StyleSheet, TextInput, Pressable } from "react-native";
import Icon from "@react-native-vector-icons/material-design-icons";
import { fonts, useTheme } from "@/src/theme";
import { InventoryItem } from "@/src/types";

type Props = {
  items: InventoryItem[];
  onChange: (items: InventoryItem[]) => void;
  onAdd: () => void;
  onUse: (item: InventoryItem) => void;
};

export default function InventoryList({ items, onChange, onAdd, onUse }: Props) {
  const { colors } = useTheme();

  const update = (i: number, patch: Partial<InventoryItem>) => {
    onChange(items.map((it, idx) => (idx === i ? { ...it, ...patch } : it)));
  };
  const remove = (i: number) => onChange(items.filter((_, idx) => idx !== i));

  return (
    <View style={{ gap: 8 }}>
      {items.length === 0 && (
        <Text style={[styles.empty, { color: colors.muted, fontFamily: fonts.display }]}>
          No items yet.
        </Text>
      )}
      {items.map((it, i) => (
        <View
          key={it.id}
          testID={`inv-item-${i}`}
          style={[styles.row, { borderColor: colors.borderStrong, backgroundColor: colors.surface }]}
        >
          <Pressable
            testID={`inv-item-${i}-used`}
            onPress={() => {
              update(i, { used: !it.used });
              if (!it.used) onUse(it);
            }}
            hitSlop={6}
            style={[styles.check, { borderColor: colors.borderStrong }]}
          >
            {it.used && <Icon name="check" size={14} color={colors.brandPrimary} />}
          </Pressable>
          <View style={styles.itemDetails}>
            <TextInput
              testID={`inv-item-${i}-name`}
              value={it.name}
              onChangeText={(t) => update(i, { name: t })}
              placeholder="Item name"
              placeholderTextColor={colors.muted}
              disableFullscreenUI
              style={[
                styles.name,
                {
                  color: colors.onSurface,
                  fontFamily: fonts.body,
                  textDecorationLine: it.used ? "line-through" : "none",
                  opacity: it.used ? 0.6 : 1,
                },
              ]}
            />
            <TextInput
              testID={`inv-item-${i}-description`}
              value={it.description ?? ""}
              onChangeText={(t) => update(i, { description: t })}
              placeholder=""
              placeholderTextColor={colors.muted}
              multiline
              disableFullscreenUI
              style={[styles.description, { color: colors.muted, fontFamily: fonts.body }]}
            />
          </View>
          <View style={styles.qtyGroup}>
            <Pressable
              testID={`inv-item-${i}-qty-minus`}
              onPress={() => update(i, { qty: Math.max(0, it.qty - 1) })}
              hitSlop={6}
              style={[styles.qtyBtn, { borderColor: colors.borderStrong }]}
            >
              <Icon name="minus" size={12} color={colors.onSurface} />
            </Pressable>
            <Text
              testID={`inv-item-${i}-qty`}
              numberOfLines={1}
              style={[styles.qty, { color: colors.onSurface, fontFamily: fonts.displayBold }]}
            >
              {it.qty}
            </Text>
            <Pressable
              testID={`inv-item-${i}-qty-plus`}
              onPress={() => update(i, { qty: Math.min(999, it.qty + 1) })}
              hitSlop={6}
              style={[styles.qtyBtn, { borderColor: colors.borderStrong }]}
            >
              <Icon name="plus" size={12} color={colors.onSurface} />
            </Pressable>
          </View>
          <Pressable
            testID={`inv-item-${i}-delete`}
            onPress={() => remove(i)}
            hitSlop={6}
            style={styles.trashBtn}
          >
            <Icon name="trash-can-outline" size={16} color={colors.muted} />
          </Pressable>
        </View>
      ))}
      <Pressable
        testID="add-inv-item"
        onPress={onAdd}
        style={({ pressed }) => [
          styles.addBtn,
          {
            borderColor: colors.borderStrong,
            backgroundColor: pressed ? colors.brandTertiary : "transparent",
          },
        ]}
      >
        <Icon name="plus" size={18} color={colors.brandPrimary} />
        <Text style={[styles.addText, { color: colors.brandPrimary, fontFamily: fonts.displayBold }]}>
          Add Item
        </Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  empty: { fontStyle: "italic", fontSize: 14 },
  row: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 6,
    borderWidth: 1.5,
    paddingHorizontal: 8,
    paddingVertical: 6,
    overflow: "hidden",
  },
  check: {
    width: 20,
    height: 20,
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  itemDetails: { flex: 1, minWidth: 0 },
  name: {
    minWidth: 0,
    fontSize: 15,
    paddingVertical: 4,
    paddingHorizontal: 2,
  },
  description: {
    minHeight: 18,
    fontSize: 11,
    lineHeight: 15,
    paddingHorizontal: 2,
    paddingBottom: 3,
  },
  qtyGroup: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
    flexShrink: 0,
  },
  qtyBtn: {
    width: 22,
    height: 22,
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  qty: {
    fontSize: 14,
    width: 22,
    textAlign: "center",
    flexShrink: 0,
  },
  trashBtn: {
    padding: 2,
    flexShrink: 0,
  },
  addBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    borderWidth: 1.5,
    borderStyle: "dashed",
    paddingVertical: 10,
    marginTop: 2,
  },
  addText: { fontSize: 14, fontWeight: "700", letterSpacing: 0.5 },
});
