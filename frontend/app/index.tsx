import React, { useCallback, useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  FlatList,
  RefreshControl,
  Alert,
} from "react-native";
import { useRouter, useFocusEffect } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Icon from "@react-native-vector-icons/material-design-icons";
import { fonts, useTheme } from "@/src/theme";
import { Character, createEmptyCharacter } from "@/src/types";
import { HP_MAX } from "@/src/types";
import { deleteCharacter, loadAllCharacters, upsertCharacter } from "@/src/storage/characters";

export default function CharacterListScreen() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [characters, setCharacters] = useState<Character[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    const list = await loadAllCharacters();
    setCharacters(list);
    setLoading(false);
  }, []);

  useFocusEffect(
    useCallback(() => {
      refresh();
    }, [refresh]),
  );

  useEffect(() => {
    refresh();
  }, [refresh]);

  const createNew = async () => {
    const c = createEmptyCharacter();
    c.name = "New Hero";
    await upsertCharacter(c);
    router.push(`/character/${c.id}`);
  };

  const confirmDelete = (c: Character) => {
    Alert.alert(
      "Delete hero?",
      `Remove "${c.name || "Unnamed"}" permanently?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            const next = await deleteCharacter(c.id);
            setCharacters(next);
          },
        },
      ],
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.surface, paddingTop: insets.top }]}>
      <View style={[styles.header, { borderBottomColor: colors.borderStrong, backgroundColor: colors.surfaceSecondary }]}>
        <Text style={[styles.title, { color: colors.onSurface, fontFamily: fonts.displayBold }]}>
          ASSAULT OF BRONZE
        </Text>
        <Text style={[styles.subtitle, { color: colors.muted, fontFamily: fonts.display }]}>
          Lightweight Roleplay System
        </Text>
      </View>

      <FlatList
        testID="character-list"
        data={characters}
        keyExtractor={(c) => c.id}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={refresh} tintColor={colors.brandPrimary} />}
        contentContainerStyle={{ padding: 16, paddingBottom: 96 + insets.bottom, gap: 12 }}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Icon name="dice-d20-outline" size={80} color={colors.brandPrimary} />
            <Text style={[styles.emptyTitle, { color: colors.onSurface, fontFamily: fonts.displayBold }]}>
              No heroes yet
            </Text>
            <Text style={[styles.emptyText, { color: colors.muted, fontFamily: fonts.display }]}>
              Roll a new one to begin your adventure.
            </Text>
          </View>
        }
        renderItem={({ item }) => (
          <Pressable
            testID={`character-row-${item.id}`}
            onPress={() => router.push(`/character/${item.id}`)}
            onLongPress={() => confirmDelete(item)}
            style={({ pressed }) => [
              styles.row,
              {
                borderColor: colors.borderStrong,
                backgroundColor: pressed ? colors.brandTertiary : colors.surfaceSecondary,
              },
            ]}
          >
            <View style={[styles.avatar, { borderColor: colors.borderStrong, backgroundColor: colors.surfaceTertiary }]}>
              <Icon name="shield-sword" size={28} color={colors.brandPrimary} />
            </View>
            <View style={styles.rowInfo}>
              <Text
                numberOfLines={1}
                style={[styles.rowName, { color: colors.onSurface, fontFamily: fonts.displayBold }]}
              >
                {item.name || "Unnamed"}
              </Text>
              <Text numberOfLines={1} style={[styles.rowMeta, { color: colors.muted, fontFamily: fonts.display }]}>
                {item.className || "No class"} • Lvl {item.level || "1"}
              </Text>
              <View style={styles.hpRow}>
                <Icon name="cards-heart" size={14} color={colors.brandSecondary} />
                <Text style={[styles.hpText, { color: colors.onSurface, fontFamily: fonts.display }]}>
                  {item.hp} / {HP_MAX}
                </Text>
              </View>
            </View>
            <Icon name="chevron-right" size={26} color={colors.muted} />
          </Pressable>
        )}
      />

      <Pressable
        testID="create-character-fab"
        onPress={createNew}
        style={({ pressed }) => [
          styles.fab,
          {
            bottom: 24 + insets.bottom,
            backgroundColor: pressed ? colors.brandSecondary : colors.brandPrimary,
            borderColor: colors.borderStrong,
          },
        ]}
      >
        <Icon name="plus" size={22} color={colors.onBrandPrimary} />
        <Text style={[styles.fabText, { color: colors.onBrandPrimary, fontFamily: fonts.displayBold }]}>
          New Hero
        </Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 3,
    alignItems: "center",
  },
  title: { fontSize: 26, letterSpacing: 2, fontWeight: "700" },
  subtitle: { fontSize: 13, letterSpacing: 3, textTransform: "uppercase", marginTop: 2 },
  empty: {
    marginTop: 60,
    alignItems: "center",
    gap: 8,
    padding: 24,
  },
  emptyTitle: { fontSize: 22, fontWeight: "700" },
  emptyText: { fontSize: 15, textAlign: "center" },
  row: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 2.5,
    padding: 12,
    gap: 12,
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
  fab: {
    position: "absolute",
    right: 20,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderWidth: 2.5,
  },
  fabText: { fontSize: 15, fontWeight: "700", letterSpacing: 1 },
});
