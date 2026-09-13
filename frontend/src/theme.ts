// Design tokens for Assault of Bronze Companion (parchment / dark forge).
// Keys mirror the "color" block of /app/design_guidelines.json.

import { useEffect, useReducer, useMemo } from "react";
import { Appearance, Platform, StyleSheet, useColorScheme as useSystemColorScheme } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";

export type ColorScheme = "light" | "dark";
export type ThemeMode = "light" | "dark";

const light = {
  // Surfaces (parchment tones)
  surface: "#F5F0E6",
  onSurface: "#2A241E",
  surfaceSecondary: "#E8DFC9",
  onSurfaceSecondary: "#2A241E",
  surfaceTertiary: "#D5C4A1",
  onSurfaceTertiary: "#2A241E",
  surfaceInverse: "#2A241E",
  onSurfaceInverse: "#F5F0E6",
  muted: "#7A6A58",

  // Brand (bronze / dark brown)
  brand: "#B26941",
  onBrand: "#FFFFFF",
  brandPrimary: "#B26941",
  onBrandPrimary: "#FFFFFF",
  brandSecondary: "#8A2A2B",
  onBrandSecondary: "#FFFFFF",
  brandTertiary: "#D9BCA3",
  onBrandTertiary: "#2A241E",

  // Status
  success: "#2E6F40",
  onSuccess: "#FFFFFF",
  warning: "#D4AF37",
  onWarning: "#2A241E",
  error: "#8A2A2B",
  onError: "#FFFFFF",
  info: "#1D4ED8",
  onInfo: "#FFFFFF",

  // Lines (heavy ink)
  border: "#2A241E",
  borderStrong: "#1A110B",
  divider: "#D5C4A1",
};

const dark = {
  // Surfaces (dark forge)
  surface: "#171008",
  onSurface: "#EBDFC6",
  surfaceSecondary: "#22180E",
  onSurfaceSecondary: "#EBDFC6",
  surfaceTertiary: "#3A2A19",
  onSurfaceTertiary: "#EBDFC6",
  surfaceInverse: "#F5F0E6",
  onSurfaceInverse: "#171008",
  muted: "#A08F73",

  // Brand (glowing bronze)
  brand: "#D48C5C",
  onBrand: "#171008",
  brandPrimary: "#D48C5C",
  onBrandPrimary: "#171008",
  brandSecondary: "#C25A5B",
  onBrandSecondary: "#F5F0E6",
  brandTertiary: "#5A3F25",
  onBrandTertiary: "#EBDFC6",

  // Status (softened for dark)
  success: "#6FB683",
  onSuccess: "#0F1A11",
  warning: "#E8C36A",
  onWarning: "#2A241E",
  error: "#D26869",
  onError: "#171008",
  info: "#7DA3FF",
  onInfo: "#0B1223",

  // Lines (light ink on dark)
  border: "#8A7154",
  borderStrong: "#C0A57F",
  divider: "#3A2A19",
};

export type ThemeColors = typeof light;

export const themes: { light: ThemeColors; dark: ThemeColors } = { light, dark };

// ---------- Theme mode preference (light / dark) ----------
const STORAGE_KEY = "aob:theme-mode";
let currentMode: ThemeMode = "light";
let modeLoaded = false;
const listeners = new Set<() => void>();

const emit = () => listeners.forEach((l) => l());

async function loadMode() {
  try {
    const saved = await AsyncStorage.getItem(STORAGE_KEY);
    if (saved === "light" || saved === "dark") {
      currentMode = saved;
      emit();
    } else if (saved === "system") {
      // Legacy value from an earlier build — normalize to light.
      currentMode = "light";
      AsyncStorage.setItem(STORAGE_KEY, "light").catch(() => {});
      emit();
    }
  } finally {
    modeLoaded = true;
  }
}
if ((Platform.OS as string) !== "server") loadMode();

export function setThemeMode(mode: ThemeMode) {
  currentMode = mode;
  AsyncStorage.setItem(STORAGE_KEY, mode).catch(() => {});
  emit();
}

export function getThemeMode(): ThemeMode {
  return currentMode;
}

function useThemeMode(): ThemeMode {
  const [, force] = useReducer((n: number) => n + 1, 0);
  useEffect(() => {
    listeners.add(force);
    if (!modeLoaded) loadMode();
    return () => {
      listeners.delete(force);
    };
  }, []);
  return currentMode;
}

// ---------- Public useTheme ----------
export function useTheme(): { scheme: ColorScheme; colors: ThemeColors; mode: ThemeMode } {
  const mode = useThemeMode();
  // Only "light" or "dark" now; ignore system preference.
  const scheme: ColorScheme = mode === "dark" ? "dark" : "light";
  return { scheme, colors: themes[scheme], mode };
}

// Backwards-compatible: previously we forced light. Now we respect user pref.
export function setColorScheme(scheme: ColorScheme | null) {
  if (scheme != null) {
    Appearance.setColorScheme?.(scheme);
  }
}

export function makeStyles<T extends StyleSheet.NamedStyles<T> | StyleSheet.NamedStyles<any>>(
  factory: (colors: ThemeColors) => T & StyleSheet.NamedStyles<any>,
): () => T {
  return function useStyles(): T {
    const { colors } = useTheme();
    return useMemo(() => StyleSheet.create(factory(colors)), [colors]);
  };
}

// Font family constants — use platform serif to keep old-scroll feel.
export const fonts = {
  display: Platform.select({ ios: "Georgia", android: "serif", default: "serif" })!,
  displayBold: Platform.select({ ios: "Georgia-Bold", android: "serif", default: "serif" })!,
  body: Platform.select({ ios: "Georgia", android: "serif", default: "serif" })!,
};
