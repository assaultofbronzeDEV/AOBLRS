import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  SectionList,
  RefreshControl,
  Modal,
  Image,
} from "react-native";
import { useRouter, useFocusEffect } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Icon from "@react-native-vector-icons/material-design-icons";
import { fonts, setThemeMode, useTheme } from "@/src/theme";
import { Character, createEmptyCharacter, createEmptyMonster } from "@/src/types";
import { deleteCharacter, loadAllCharacters, upsertCharacter } from "@/src/storage/characters";

export default function CharacterListScreen() {
  const { colors, mode } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [characters, setCharacters] = useState<Character[]>([]);
  const [loading, setLoading] = useState(true);
  const [pendingDelete, setPendingDelete] = useState<Character | null>(null);
  const [heroesCollapsed, setHeroesCollapsed] = useState(false);
  const [monstersCollapsed, setMonstersCollapsed] = useState(false);

  const cycleTheme = () => {
    setThemeMode(mode === "dark" ? "light" : "dark");
  };

  const refresh = useCallback(async () => {
    const list = await loadAllCharacters();
    setCharacters(list);
    setLoading(false);
  }, []);

  useFocusEffect(useCallback(() => { refresh(); }, [refresh]));
  useEffect(() => { refresh(); }, [refresh]);

  const createHero = async () => {
    const c = createEmptyCharacter();
    c.name = "New Hero";
    await upsertCharacter(c);
    router.push(`/character/${c.id}`);
  };
  const createMonster = async () => {
    const m = createEmptyMonster();
    m.name = "New Monster";
    await upsertCharacter(m);
    router.push(`/character/${m.id}`);
  };

  const confirmDelete = (c: Character) => setPendingDelete(c);
  const performDelete = async () => {
    if (!pendingDelete) return;
    const next = await deleteCharacter(pendingDelete.id);
    setCharacters(next);
    setPendingDelete(null);
  };

  const sections = useMemo(() => {
    const heroes = characters.filter((c) => c.kind !== "monster");
    const monsters = characters.filter((c) => c.kind === "monster");
    return [
      {
        title: "Heroes",
        key: "hero" as const,
        total: heroes.length,
        collapsed: heroesCollapsed,
        data: heroesCollapsed ? [] : heroes,
      },
      {
        title: "Monsters",
        key: "monster" as const,
        total: monsters.length,
        collapsed: monstersCollapsed,
        data: monstersCollapsed ? [] : monsters,
      },
    ];
  }, [characters, heroesCollapsed, monstersCollapsed]);

  const toggleSection = (key: "hero" | "monster") => {
    if (key === "hero") setHeroesCollapsed((c) => !c);
    else setMonstersCollapsed((c) => !c);
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.surface, paddingTop: insets.top }]}>
      <View style={[styles.header, { borderBottomColor: colors.borderStrong, backgroundColor: colors.surfaceSecondary }]}>
        <Image
          source={require("@/assets/images/aob-logo.png")}
          resizeMode="contain"
          style={styles.logo}
          accessibilityLabel="Assault of Bronze — Lightweight Roleplay System"
        />
        <Pressable
          testID="theme-toggle"
          onPress={cycleTheme}
          hitSlop={8}
          style={({ pressed }) => [
            styles.themeBtn,
            {
              borderColor: colors.borderStrong,
              backgroundColor: pressed ? colors.brandTertiary : colors.surface,
            },
          ]}
        >
          <Icon
            name={mode === "dark" ? "weather-night" : "white-balance-sunny"}
            size={18}
            color={colors.onSurface}
          />
        </Pressable>
      </View>

      <SectionList
        testID="character-list"
        sections={sections}
        keyExtractor={(c) => c.id}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={refresh} tintColor={colors.brandPrimary} />}
        contentContainerStyle={{ padding: 16, paddingBottom: 120 + insets.bottom, gap: 8 }}
        stickySectionHeadersEnabled={false}
        renderSectionHeader={({ section }) => (
          <Pressable
            testID={`section-${section.key}-toggle`}
            onPress={() => toggleSection(section.key)}
            style={({ pressed }) => [
              styles.sectionHeader,
              {
                borderColor: colors.borderStrong,
                backgroundColor: pressed ? colors.brandTertiary : "transparent",
              },
            ]}
          >
            <Icon
              name={section.key === "monster" ? "spider" : "shield-sword"}
              size={16}
              color={colors.brandPrimary}
            />
            <Text style={[styles.sectionTitle, { color: colors.onSurface, fontFamily: fonts.displayBold }]}>
              {section.title}
            </Text>
            <Text style={[styles.sectionCount, { color: colors.muted, fontFamily: fonts.displayBold }]}>
              {section.total}
            </Text>
            <Icon
              name={section.collapsed ? "chevron-down" : "chevron-up"}
              size={22}
              color={colors.onSurface}
            />
          </Pressable>
        )}
        renderSectionFooter={({ section }) =>
          !section.collapsed && section.total === 0 ? (
            <Text style={[styles.emptyLine, { color: colors.muted, fontFamily: fonts.display }]}>
              {section.key === "monster" ? "No monsters yet. Add one below." : "No heroes yet. Roll a new one below."}
            </Text>
          ) : null
        }
        renderItem={({ item }) => (
          <View
            testID={`character-row-${item.id}`}
            style={[
              styles.row,
              { borderColor: colors.borderStrong, backgroundColor: colors.surfaceSecondary },
            ]}
          >
            <Pressable
              testID={`character-row-${item.id}-open`}
              onPress={() => router.push(`/character/${item.id}`)}
              onLongPress={() => confirmDelete(item)}
              style={({ pressed }) => [
                styles.rowMain,
                { backgroundColor: pressed ? colors.brandTertiary : "transparent" },
              ]}
            >
              <View style={[styles.avatar, { borderColor: colors.borderStrong, backgroundColor: colors.surfaceTertiary }]}>
                <Icon
                  name={item.kind === "monster" ? "spider" : "shield-sword"}
                  size={28}
                  color={colors.brandPrimary}
                />
              </View>
              <View style={styles.rowInfo}>
                <Text numberOfLines={1} style={[styles.rowName, { color: colors.onSurface, fontFamily: fonts.displayBold }]}>
                  {item.name || "Unnamed"}
                </Text>
                <Text numberOfLines={1} style={[styles.rowMeta, { color: colors.muted, fontFamily: fonts.display }]}>
                  {item.className || (item.kind === "monster" ? "Monster" : "No class")} • Lvl {item.level || "1"}
                </Text>
                <View style={styles.hpRow}>
                  <Icon name="cards-heart" size={14} color={colors.brandSecondary} />
                  <Text style={[styles.hpText, { color: colors.onSurface, fontFamily: fonts.display }]}>
                    {item.hp} / {item.maxHp}
                  </Text>
                </View>
              </View>
              <Icon name="chevron-right" size={26} color={colors.muted} />
            </Pressable>
            <Pressable
              testID={`character-row-${item.id}-delete`}
              onPress={() => confirmDelete(item)}
              hitSlop={6}
              style={({ pressed }) => [
                styles.rowDelete,
                {
                  borderLeftColor: colors.borderStrong,
                  backgroundColor: pressed ? colors.brandSecondary : "transparent",
                },
              ]}
            >
              <Icon name="trash-can-outline" size={20} color={colors.brandSecondary} />
            </Pressable>
          </View>
        )}
      />

      <View style={[styles.fabBar, { bottom: 20 + insets.bottom }]} pointerEvents="box-none">
        <Pressable
          testID="create-character-fab"
          onPress={createHero}
          style={({ pressed }) => [
            styles.fab,
            {
              backgroundColor: pressed ? colors.brandSecondary : colors.brandPrimary,
              borderColor: colors.borderStrong,
            },
          ]}
        >
          <Icon name="shield-sword" size={20} color={colors.onBrandPrimary} />
          <Text style={[styles.fabText, { color: colors.onBrandPrimary, fontFamily: fonts.displayBold }]}>
            New Hero
          </Text>
        </Pressable>
        <Pressable
          testID="create-monster-fab"
          onPress={createMonster}
          style={({ pressed }) => [
            styles.fab,
            {
              backgroundColor: pressed ? colors.brandTertiary : colors.surfaceSecondary,
              borderColor: colors.borderStrong,
            },
          ]}
        >
          <Icon name="spider" size={20} color={colors.brandSecondary} />
          <Text style={[styles.fabText, { color: colors.onSurface, fontFamily: fonts.displayBold }]}>
            New Monster
          </Text>
        </Pressable>
      </View>

      <Modal transparent visible={pendingDelete != null} animationType="fade" onRequestClose={() => setPendingDelete(null)}>
        <Pressable
          testID="delete-confirm-backdrop"
          style={styles.confirmBackdrop}
          onPress={() => setPendingDelete(null)}
        >
          <Pressable
            style={[styles.confirmCard, { backgroundColor: colors.surface, borderColor: colors.borderStrong }]}
            onPress={(e) => e.stopPropagation()}
          >
            <Icon name="alert-circle-outline" size={36} color={colors.brandSecondary} />
            <Text style={[styles.confirmTitle, { color: colors.onSurface, fontFamily: fonts.displayBold }]}>
              Delete {pendingDelete?.kind === "monster" ? "monster" : "hero"}?
            </Text>
            <Text style={[styles.confirmText, { color: colors.muted, fontFamily: fonts.display }]}>
              This permanently removes "{pendingDelete?.name || "Unnamed"}" and all their data.
            </Text>
            <View style={styles.confirmButtons}>
              <Pressable
                testID="delete-confirm-cancel"
                onPress={() => setPendingDelete(null)}
                style={({ pressed }) => [
                  styles.confirmBtn,
                  { borderColor: colors.borderStrong, backgroundColor: pressed ? colors.brandTertiary : colors.surfaceSecondary },
                ]}
              >
                <Text style={[styles.confirmBtnText, { color: colors.onSurface, fontFamily: fonts.displayBold }]}>
                  Cancel
                </Text>
              </Pressable>
              <Pressable
                testID="delete-confirm-delete"
                onPress={performDelete}
                style={({ pressed }) => [
                  styles.confirmBtn,
                  { borderColor: colors.borderStrong, backgroundColor: pressed ? "#6b1f20" : colors.brandSecondary },
                ]}
              >
                <Text style={[styles.confirmBtnText, { color: colors.onBrandSecondary, fontFamily: fonts.displayBold }]}>
                  Delete
                </Text>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 3,
    alignItems: "center",
    position: "relative",
  },
  themeBtn: {
    position: "absolute",
    right: 12,
    top: "50%",
    marginTop: -18,
    width: 36,
    height: 36,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
  },
  logo: { width: "100%", maxWidth: 320, height: 80 },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderBottomWidth: 2,
    paddingVertical: 8,
    marginTop: 8,
  },
  sectionTitle: { fontSize: 20, letterSpacing: 1.5, flex: 1 },
  sectionCount: { fontSize: 14 },
  emptyLine: { fontStyle: "italic", fontSize: 14, textAlign: "center", paddingVertical: 8 },
  row: {
    flexDirection: "row",
    alignItems: "stretch",
    borderWidth: 2.5,
    overflow: "hidden",
  },
  rowMain: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 12,
  },
  rowDelete: {
    width: 52,
    borderLeftWidth: 2,
    alignItems: "center",
    justifyContent: "center",
  },
  avatar: {
    width: 54,
    height: 54,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
  },
  rowInfo: { flex: 1, gap: 2 },
  rowName: { fontSize: 20, fontWeight: "700" },
  rowMeta: { fontSize: 14, letterSpacing: 0.5 },
  hpRow: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 2 },
  hpText: { fontSize: 13 },
  fabBar: {
    position: "absolute",
    left: 16,
    right: 16,
    flexDirection: "row",
    gap: 10,
  },
  fab: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderWidth: 2.5,
  },
  fabText: { fontSize: 14, fontWeight: "700", letterSpacing: 1 },
  confirmBackdrop: {
    flex: 1,
    backgroundColor: "rgba(20,14,8,0.85)",
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  confirmCard: {
    width: "100%",
    maxWidth: 340,
    borderWidth: 3,
    padding: 20,
    alignItems: "center",
    gap: 10,
  },
  confirmTitle: { fontSize: 22, fontWeight: "700", letterSpacing: 1 },
  confirmText: { fontSize: 14, textAlign: "center" },
  confirmButtons: { flexDirection: "row", gap: 10, marginTop: 8, alignSelf: "stretch" },
  confirmBtn: {
    flex: 1,
    borderWidth: 2,
    paddingVertical: 12,
    alignItems: "center",
  },
  confirmBtnText: { fontSize: 15, fontWeight: "700", letterSpacing: 0.8 },
});
