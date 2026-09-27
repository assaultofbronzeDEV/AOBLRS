import React, { useMemo, useState } from "react";
import { View, Text, StyleSheet, Modal, Pressable, ScrollView, TextInput } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Icon from "@react-native-vector-icons/material-design-icons";
import { fonts, useTheme, ThemeColors } from "@/src/theme";
import { Currency } from "@/src/types";
import { currencyToBronze, formatBronze } from "@/src/utils/currency";

export type ShopEntry = {
  id: string;
  name: string;
  category: string;
  meta?: string;
  notes?: string;
  icon?: string;
  priceBronze: number;
  priceLabel: string;
  payload: unknown;
};

export type ShopTabKey = "blacksmith" | "armoury" | "alchemist" | "general";

export type CustomShopForm = {
  extraLabel?: string; // e.g. "Damage Roll", "Damage Reduction", "Effect Roll (optional)"
  extraPlaceholder?: string;
  extraRequired?: boolean;
  buildEntry: (input: { name: string; price: string; notes: string; extra: string }) => ShopEntry | null;
};

export type ShopTabConfig = {
  key: ShopTabKey;
  label: string;
  icon: string;
  subtitle: string;
  entries: ShopEntry[];
  categoryOrder?: string[];
  customLabel?: string;
  customForm?: CustomShopForm;
  onImport?: () => void;
  onExport?: (entry: ShopEntry) => void;
};

export type CartLine = {
  key: string;
  tab: ShopTabKey;
  entryId: string;
  name: string;
  priceBronze: number;
  priceLabel: string;
  qty: number;
  payload: unknown;
};

type Props = {
  visible: boolean;
  currency: Currency;
  tabs: ShopTabConfig[];
  onClose: () => void;
  onCheckout: (cart: CartLine[]) => void;
};

export default function ShoppingModal({ visible, currency, tabs, onClose, onCheckout }: Props) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const styles = getStyles(colors);
  const [activeTab, setActiveTab] = useState<ShopTabKey>(tabs[0]?.key ?? "blacksmith");
  const [cart, setCart] = useState<CartLine[]>([]);
  const [customFormOpen, setCustomFormOpen] = useState(false);
  const [customName, setCustomName] = useState("");
  const [customPrice, setCustomPrice] = useState("");
  const [customNotes, setCustomNotes] = useState("");
  const [customExtra, setCustomExtra] = useState("");

  const purseBronze = currencyToBronze(currency);
  const totalBronze = cart.reduce((sum, line) => sum + line.priceBronze * line.qty, 0);
  const canAfford = totalBronze <= purseBronze;
  const activeConfig = tabs.find((t) => t.key === activeTab) ?? tabs[0];

  const grouped = useMemo(() => {
    if (!activeConfig) return [];
    const map = new Map<string, ShopEntry[]>();
    for (const entry of activeConfig.entries) {
      const arr = map.get(entry.category) ?? [];
      arr.push(entry);
      map.set(entry.category, arr);
    }
    const keys = Array.from(map.keys());
    const order = activeConfig.categoryOrder;
    keys.sort((a, b) => {
      if (!order) return a.localeCompare(b);
      const ai = order.indexOf(a);
      const bi = order.indexOf(b);
      return (ai < 0 ? 999 : ai) - (bi < 0 ? 999 : bi);
    });
    return keys.map((k) => ({ key: k, items: map.get(k)! }));
  }, [activeConfig]);

  const addToCart = (entry: ShopEntry) => {
    setCart((prev) => {
      const idx = prev.findIndex((l) => l.tab === activeTab && l.entryId === entry.id);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = { ...next[idx], qty: next[idx].qty + 1 };
        return next;
      }
      return [
        ...prev,
        {
          key: `${activeTab}-${entry.id}-${Date.now()}`,
          tab: activeTab,
          entryId: entry.id,
          name: entry.name,
          priceBronze: entry.priceBronze,
          priceLabel: entry.priceLabel,
          qty: 1,
          payload: entry.payload,
        },
      ];
    });
  };

  const removeFromCart = (key: string) => {
    setCart((prev) =>
      prev
        .map((l) => (l.key === key ? { ...l, qty: l.qty - 1 } : l))
        .filter((l) => l.qty > 0),
    );
  };

  const resetCustomForm = () => {
    setCustomName("");
    setCustomPrice("");
    setCustomNotes("");
    setCustomExtra("");
  };

  const openCustomForm = () => {
    resetCustomForm();
    setCustomFormOpen(true);
  };

  const submitCustomForm = () => {
    if (!activeConfig?.customForm) return;
    const entry = activeConfig.customForm.buildEntry({
      name: customName,
      price: customPrice,
      notes: customNotes,
      extra: customExtra,
    });
    if (!entry) return;
    addToCart(entry);
    resetCustomForm();
    setCustomFormOpen(false);
  };

  const handleClose = () => {
    setCart([]);
    setCustomFormOpen(false);
    onClose();
  };

  const handleCheckout = () => {
    if (cart.length === 0 || !canAfford) return;
    onCheckout(cart);
    setCart([]);
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={handleClose}>
      <View style={styles.backdrop}>
        <Pressable style={StyleSheet.absoluteFill} onPress={handleClose} />
        <View style={styles.keyboardAvoiding}>
          <View style={[styles.sheet, { paddingTop: insets.top, paddingBottom: 12 + insets.bottom }]}>
            <View style={styles.header}>
              <View style={styles.grabber} />
              <View style={styles.headerRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.title} numberOfLines={1}>Shopping</Text>
                  <Text style={styles.subtitle} numberOfLines={2}>
                    {activeConfig?.subtitle ?? "Visit a store to buy gear."}
                  </Text>
                </View>
                <Pressable
                  testID="shopping-close"
                  onPress={handleClose}
                  hitSlop={10}
                  style={({ pressed }) => [styles.closeBtn, { backgroundColor: pressed ? colors.brandTertiary : "transparent" }]}
                >
                  <Icon name="close" size={20} color={colors.onSurface} />
                </Pressable>
              </View>

              <View style={styles.tabRow}>
                {tabs.map((tab) => {
                  const isActive = tab.key === activeTab;
                  return (
                    <Pressable
                      key={tab.key}
                      testID={`shopping-tab-${tab.key}`}
                      onPress={() => setActiveTab(tab.key)}
                      style={({ pressed }) => [
                        styles.tabBtn,
                        {
                          borderColor: colors.borderStrong,
                          backgroundColor: isActive ? colors.brandPrimary : pressed ? colors.brandTertiary : colors.surface,
                        },
                      ]}
                    >
                      <Icon name={tab.icon as any} size={15} color={isActive ? colors.onBrandPrimary : colors.brandPrimary} />
                      <Text style={[styles.tabBtnText, { color: isActive ? colors.onBrandPrimary : colors.onSurface }]}>
                        {tab.label}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>

              {activeConfig && (activeConfig.customForm || activeConfig.onImport) && (
                <View style={styles.actionRow}>
                  {activeConfig.customForm && (
                    <Pressable
                      testID={`shopping-custom-${activeTab}`}
                      onPress={openCustomForm}
                      style={({ pressed }) => [
                        styles.customBtn,
                        { borderColor: colors.brandPrimary, backgroundColor: pressed ? colors.brandSecondary : colors.brandPrimary, flex: 1 },
                      ]}
                    >
                      <Icon name="pencil-plus" size={16} color={colors.onBrandPrimary} />
                      <Text style={[styles.customBtnText, { color: colors.onBrandPrimary }]}>
                        {activeConfig.customLabel ?? "Create custom"}
                      </Text>
                    </Pressable>
                  )}
                  {activeConfig.onImport && (
                    <Pressable
                      testID={`shopping-import-${activeTab}`}
                      onPress={() => {
                        activeConfig.onImport?.();
                        handleClose();
                      }}
                      style={({ pressed }) => [styles.importBtn, { borderColor: colors.brandPrimary, backgroundColor: pressed ? colors.brandTertiary : colors.surface }]}
                      accessibilityLabel="Import JSON"
                    >
                      <Icon name="file-import-outline" size={18} color={colors.brandPrimary} />
                    </Pressable>
                  )}
                </View>
              )}
            </View>

            <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.body}>
                {grouped.length === 0 && <Text style={styles.emptyText}>Nothing in stock right now.</Text>}
                {grouped.map(({ key, items }) => (
                  <View key={key} style={{ gap: 6 }}>
                    <Text style={styles.sectionHeader}>{key}</Text>
                    {items.map((entry) => {
                      const affordable = entry.priceBronze <= purseBronze;
                      return (
                        <Pressable
                          key={entry.id}
                          testID={`shopping-entry-${entry.id}`}
                          onPress={() => addToCart(entry)}
                          style={({ pressed }) => [
                            styles.entryRow,
                            {
                              borderColor: colors.borderStrong,
                              backgroundColor: pressed ? colors.brandTertiary : colors.surface,
                              opacity: affordable ? 1 : 0.45,
                            },
                          ]}
                        >
                          {entry.icon ? <Icon name={entry.icon as any} size={18} color={colors.brandPrimary} /> : null}
                          <View style={{ flex: 1, minWidth: 0 }}>
                            <Text style={styles.entryName} numberOfLines={1}>{entry.name}</Text>
                            {entry.notes ? <Text style={styles.entryNotes} numberOfLines={2}>{entry.notes}</Text> : null}
                          </View>
                          {entry.meta ? (
                            <View style={styles.metaChip}>
                              <Text style={styles.metaChipText}>{entry.meta}</Text>
                            </View>
                          ) : null}
                          {activeConfig?.onExport && (
                            <Pressable
                              testID={`shopping-export-${entry.id}`}
                              onPress={(event) => {
                                event.stopPropagation();
                                activeConfig.onExport?.(entry);
                              }}
                              hitSlop={8}
                              accessibilityLabel={`Export ${entry.name}`}
                            >
                              <Icon name="file-export-outline" size={17} color={colors.brandPrimary} />
                            </Pressable>
                          )}
                          <View style={styles.priceChip}>
                            <Text style={styles.priceChipText}>{entry.priceLabel}</Text>
                          </View>
                          <Icon name={affordable ? "cart-plus" : "lock-outline"} size={20} color={affordable ? colors.brandPrimary : colors.muted} />
                        </Pressable>
                      );
                    })}
                  </View>
                ))}
              </ScrollView>

            <View style={[styles.cartBar, { borderTopColor: colors.divider, backgroundColor: colors.surfaceSecondary }]}>
                {cart.length === 0 ? (
                  <Text style={styles.cartEmptyText}>Your cart is empty — tap an item to add it.</Text>
                ) : (
                  <ScrollView style={styles.cartList} contentContainerStyle={{ gap: 4 }}>
                    {cart.map((line) => (
                      <View key={line.key} style={styles.cartLine}>
                        <Text style={styles.cartLineText} numberOfLines={1}>
                          {line.qty}× {line.name}
                        </Text>
                        <Text style={styles.cartLinePrice}>{line.priceLabel}</Text>
                        <Pressable
                          testID={`shopping-cart-remove-${line.key}`}
                          onPress={() => removeFromCart(line.key)}
                          hitSlop={8}
                        >
                          <Icon name="minus-circle-outline" size={18} color={colors.muted} />
                        </Pressable>
                      </View>
                    ))}
                  </ScrollView>
                )}
                <View style={styles.cartFooter}>
                  <Text style={[styles.cartTotalText, { color: canAfford ? colors.onSurface : colors.error }]}>
                    Total: {formatBronze(totalBronze)}
                  </Text>
                  <Pressable
                    testID="shopping-checkout"
                    onPress={handleCheckout}
                    disabled={cart.length === 0 || !canAfford}
                    style={({ pressed }) => [
                      styles.checkoutBtn,
                      {
                        borderColor: colors.brandPrimary,
                        backgroundColor: cart.length === 0 || !canAfford ? colors.surfaceTertiary : pressed ? colors.brandSecondary : colors.brandPrimary,
                        opacity: cart.length === 0 || !canAfford ? 0.6 : 1,
                      },
                    ]}
                  >
                    <Icon name="cart-check" size={18} color={colors.onBrandPrimary} />
                    <Text style={[styles.checkoutBtnText, { color: colors.onBrandPrimary }]}>Checkout</Text>
                  </Pressable>
                </View>
              </View>
          </View>
        </View>
      </View>

      <Modal
        visible={customFormOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setCustomFormOpen(false)}
      >
        <View style={styles.formBackdrop}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setCustomFormOpen(false)} />
          <View style={[styles.formCard, { backgroundColor: colors.surface, borderColor: colors.borderStrong }]}>
            <Text style={styles.formTitle}>{activeConfig?.customLabel ?? "Create custom item"}</Text>
            <TextInput
              testID="shopping-custom-name"
              value={customName}
              onChangeText={setCustomName}
              placeholder="Name"
              placeholderTextColor={colors.muted}
              style={[styles.formInput, { color: colors.onSurface, borderColor: colors.borderStrong }]}
            />
            <TextInput
              testID="shopping-custom-price"
              value={customPrice}
              onChangeText={setCustomPrice}
              placeholder="Price (e.g. 10g, 5s, 2b)"
              placeholderTextColor={colors.muted}
              autoCapitalize="none"
              style={[styles.formInput, { color: colors.onSurface, borderColor: colors.borderStrong }]}
            />
            {activeConfig?.customForm?.extraLabel && (
              <TextInput
                testID="shopping-custom-extra"
                value={customExtra}
                onChangeText={setCustomExtra}
                placeholder={activeConfig.customForm.extraPlaceholder ?? activeConfig.customForm.extraLabel}
                placeholderTextColor={colors.muted}
                style={[styles.formInput, { color: colors.onSurface, borderColor: colors.borderStrong }]}
              />
            )}
            <TextInput
              testID="shopping-custom-notes"
              value={customNotes}
              onChangeText={setCustomNotes}
              placeholder="Description / notes (optional)"
              placeholderTextColor={colors.muted}
              multiline
              style={[styles.formInput, styles.formInputMultiline, { color: colors.onSurface, borderColor: colors.borderStrong }]}
            />
            <View style={styles.formActions}>
              <Pressable
                testID="shopping-custom-cancel"
                onPress={() => setCustomFormOpen(false)}
                style={({ pressed }) => [styles.formCancelBtn, { borderColor: colors.borderStrong, backgroundColor: pressed ? colors.brandTertiary : colors.surface }]}
              >
                <Text style={[styles.formCancelText, { color: colors.onSurface }]}>Cancel</Text>
              </Pressable>
              <Pressable
                testID="shopping-custom-submit"
                onPress={submitCustomForm}
                disabled={!customName.trim() || (!!activeConfig?.customForm?.extraRequired && !customExtra.trim())}
                style={({ pressed }) => [
                  styles.formSubmitBtn,
                  {
                    borderColor: colors.brandPrimary,
                    backgroundColor:
                      !customName.trim() || (!!activeConfig?.customForm?.extraRequired && !customExtra.trim())
                        ? colors.surfaceTertiary
                        : pressed
                          ? colors.brandSecondary
                          : colors.brandPrimary,
                  },
                ]}
              >
                <Icon name="cart-plus" size={16} color={colors.onBrandPrimary} />
                <Text style={[styles.formSubmitText, { color: colors.onBrandPrimary }]}>Add to Cart</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </Modal>
  );
}

const getStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    backdrop: { flex: 1, backgroundColor: "rgba(20,14,8,0.6)", justifyContent: "flex-end" },
    keyboardAvoiding: { flex: 1, width: "100%", justifyContent: "flex-end" },
    sheet: {
      flex: 1,
      width: "100%",
      height: "100%",
      maxHeight: "100%",
      backgroundColor: colors.surface,
      borderWidth: 3,
      borderColor: colors.borderStrong,
    },
    header: {
      paddingHorizontal: 16,
      paddingTop: 8,
      paddingBottom: 10,
      borderBottomWidth: 2,
      borderBottomColor: colors.divider,
      backgroundColor: colors.surfaceSecondary,
      gap: 8,
    },
    grabber: { alignSelf: "center", width: 42, height: 4, backgroundColor: colors.muted, opacity: 0.4, marginBottom: 4 },
    headerRow: { flexDirection: "row", alignItems: "flex-start", gap: 8 },
    title: { fontSize: 20, color: colors.onSurface, fontFamily: fonts.displayBold, letterSpacing: 1.5 },
    subtitle: { fontSize: 12, color: colors.muted, fontFamily: fonts.display, marginTop: 2 },
    closeBtn: { width: 34, height: 34, borderWidth: 2, borderColor: colors.borderStrong, alignItems: "center", justifyContent: "center" },
    tabRow: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
    tabBtn: { flexDirection: "row", alignItems: "center", gap: 5, borderWidth: 1.5, paddingHorizontal: 10, paddingVertical: 6 },
    tabBtnText: { fontSize: 12, fontFamily: fonts.displayBold, letterSpacing: 0.5 },
    actionRow: { flexDirection: "row", gap: 8 },
    customBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, borderWidth: 2.5, paddingVertical: 10 },
    customBtnText: { fontSize: 14, fontFamily: fonts.displayBold, letterSpacing: 1 },
    importBtn: { width: 42, minHeight: 40, borderWidth: 1.5, alignItems: "center", justifyContent: "center" },
    body: { padding: 12, gap: 14, paddingBottom: 24 },
    emptyText: { fontSize: 13, color: colors.muted, fontFamily: fonts.display, fontStyle: "italic", textAlign: "center", paddingVertical: 20 },
    sectionHeader: {
      fontSize: 12,
      color: colors.brandPrimary,
      fontFamily: fonts.displayBold,
      letterSpacing: 2,
      borderBottomWidth: 1.5,
      borderBottomColor: colors.divider,
      paddingBottom: 3,
      marginTop: 4,
    },
    entryRow: { flexDirection: "row", alignItems: "center", gap: 10, borderWidth: 2, paddingVertical: 10, paddingHorizontal: 10 },
    entryName: { fontSize: 15, color: colors.onSurface, fontFamily: fonts.displayBold, letterSpacing: 0.5 },
    entryNotes: { fontSize: 12, color: colors.muted, fontFamily: fonts.display, lineHeight: 16, marginTop: 2 },
    metaChip: {
      borderWidth: 1.5,
      borderColor: colors.borderStrong,
      backgroundColor: colors.surfaceSecondary,
      paddingHorizontal: 6,
      paddingVertical: 3,
      minWidth: 42,
      alignItems: "center",
    },
    metaChipText: { fontSize: 12, color: colors.onSurface, fontFamily: fonts.displayBold, letterSpacing: 0.5 },
    priceChip: {
      borderWidth: 1.5,
      borderColor: colors.brandPrimary,
      backgroundColor: colors.brandPrimary,
      paddingHorizontal: 6,
      paddingVertical: 3,
      minWidth: 42,
      alignItems: "center",
    },
    priceChipText: { fontSize: 12, color: colors.onBrandPrimary, fontFamily: fonts.displayBold, letterSpacing: 0.5 },
    cartBar: { borderTopWidth: 2, padding: 10, gap: 8 },
    cartEmptyText: { fontSize: 12, color: colors.muted, fontFamily: fonts.display, fontStyle: "italic", textAlign: "center" },
    cartList: { maxHeight: 110 },
    cartLine: { flexDirection: "row", alignItems: "center", gap: 8 },
    cartLineText: { flex: 1, minWidth: 0, fontSize: 13, color: colors.onSurface, fontFamily: fonts.display },
    cartLinePrice: { fontSize: 12, color: colors.muted, fontFamily: fonts.displayBold },
    cartFooter: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 10 },
    cartTotalText: { fontSize: 15, fontFamily: fonts.displayBold, letterSpacing: 0.5 },
    checkoutBtn: { flexDirection: "row", alignItems: "center", gap: 6, borderWidth: 2, paddingHorizontal: 14, paddingVertical: 10 },
    checkoutBtnText: { fontSize: 14, fontFamily: fonts.displayBold, letterSpacing: 1 },
    formBackdrop: { flex: 1, backgroundColor: "rgba(20,14,8,0.6)", alignItems: "center", justifyContent: "center", padding: 20 },
    formCard: { width: "100%", maxWidth: 420, borderWidth: 3, padding: 16, gap: 10 },
    formTitle: { fontSize: 16, fontFamily: fonts.displayBold, letterSpacing: 1, marginBottom: 4 },
    formInput: { borderWidth: 1.5, paddingHorizontal: 10, paddingVertical: 8, fontSize: 14 },
    formInputMultiline: { minHeight: 70, textAlignVertical: "top" },
    formActions: { flexDirection: "row", gap: 10, marginTop: 4 },
    formCancelBtn: { flex: 1, borderWidth: 1.5, alignItems: "center", justifyContent: "center", paddingVertical: 10 },
    formCancelText: { fontSize: 14, fontFamily: fonts.displayBold, letterSpacing: 0.5 },
    formSubmitBtn: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, borderWidth: 2, paddingVertical: 10 },
    formSubmitText: { fontSize: 14, fontFamily: fonts.displayBold, letterSpacing: 0.5 },
  });
