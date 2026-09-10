// Design tokens for Assault of Bronze Companion (parchment / medieval scroll).
// Keys mirror the "color" block of /app/design_guidelines.json.

import { useMemo } from "react";
import { Appearance, StyleSheet, useColorScheme } from "react-native";

export type ColorScheme = "light" | "dark";

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

export type ThemeColors = typeof light;

export const defaultScheme = "light" satisfies ColorScheme;

export const themes: { light: ThemeColors; dark?: ThemeColors } = { light };

export function setColorScheme(scheme: ColorScheme | null) {
  Appearance.setColorScheme?.(scheme);
}

setColorScheme?.(themes.dark ? null : defaultScheme);

export function useTheme(): { scheme: ColorScheme; colors: ThemeColors } {
  const system = useColorScheme();
  const scheme: ColorScheme = system && themes[system] ? system : defaultScheme;
  return { scheme, colors: themes[scheme] ?? themes.light };
}

export function makeStyles<T extends StyleSheet.NamedStyles<T> | StyleSheet.NamedStyles<any>>(
  factory: (colors: ThemeColors) => T & StyleSheet.NamedStyles<any>,
): () => T {
  return function useStyles(): T {
    const { colors } = useTheme();
    return useMemo(() => StyleSheet.create(factory(colors)), [colors]);
  };
}

// Font family constants — use platform serif to keep old-scroll feel without
// bundling a custom font file.
import { Platform } from "react-native";

export const fonts = {
  display: Platform.select({ ios: "Georgia", android: "serif", default: "serif" })!,
  displayBold: Platform.select({ ios: "Georgia-Bold", android: "serif", default: "serif" })!,
  body: Platform.select({ ios: "Georgia", android: "serif", default: "serif" })!,
};
