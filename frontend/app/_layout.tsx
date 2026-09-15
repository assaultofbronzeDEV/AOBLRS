import React, { useEffect, useRef, useState } from "react";
import { Animated, Easing, Image, StyleSheet, Text, View } from "react-native";
import * as SplashScreen from "expo-splash-screen";
import { QueryClientProvider } from "@tanstack/react-query";
import { Stack } from "expo-router";
import { LogBox } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { ErrorBoundary } from "@/src/components/error-boundary";
import { queryClient } from "@/src/query-client";

SplashScreen.preventAutoHideAsync().catch(() => undefined);

// Disable logbox errors etc so that users can see the app
// and agent works as expected.
LogBox.ignoreAllLogs(true);

export default function RootLayout() {
  const [showIntro, setShowIntro] = useState(true);
  const introOpacity = useRef(new Animated.Value(1)).current;
  const mapDrift = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    SplashScreen.hideAsync().catch(() => undefined);
    const driftAnimation = Animated.loop(
      Animated.sequence([
        Animated.timing(mapDrift, {
          toValue: 1,
          duration: 18000,
          easing: Easing.inOut(Easing.linear),
          useNativeDriver: true,
        }),
        Animated.timing(mapDrift, {
          toValue: 0,
          duration: 18000,
          easing: Easing.inOut(Easing.linear),
          useNativeDriver: true,
        }),
      ]),
    );
    driftAnimation.start();

    const introTimer = setTimeout(() => {
      Animated.timing(introOpacity, {
        toValue: 0,
        duration: 500,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }).start(({ finished }) => {
        if (finished) setShowIntro(false);
      });
    }, 6200);

    return () => {
      clearTimeout(introTimer);
      driftAnimation.stop();
    };
  }, [introOpacity, mapDrift]);

  // One app level ErrorBoundary; a render crash shows a reload screen
  // instead of a blank app.
  return (
    <ErrorBoundary>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <SafeAreaProvider>
          <QueryClientProvider client={queryClient}>
            <Stack screenOptions={{ headerShown: false }} />
          </QueryClientProvider>
        </SafeAreaProvider>
      </GestureHandlerRootView>
      {showIntro && (
        <Animated.View style={[styles.intro, { opacity: introOpacity }]} pointerEvents="none">
          <Animated.Image
            source={require("../assets/images/Aryndos map.png")}
            resizeMode="cover"
            blurRadius={3}
            style={[
              styles.introMap,
              {
                transform: [
                  {
                    translateX: mapDrift.interpolate({ inputRange: [0, 1], outputRange: [0, 120] }),
                  },
                ],
              },
            ]}
          />
          <View style={styles.introShade} />
          <View style={styles.introContent} pointerEvents="none">
            <Image source={require("../assets/images/aob-logo.png")} resizeMode="contain" style={styles.introLogo} />
            <Text style={styles.introCredit}>AOBLRS created by Jordan Cowley</Text>
            <Text style={styles.introCredit}>In Development</Text>
            <Text style={styles.introCredit}>Version 1.0</Text>
          </View>
        </Animated.View>
      )}
    </ErrorBoundary>
  );
}

const styles = StyleSheet.create({
  intro: {
    ...StyleSheet.absoluteFill,
    backgroundColor: "#07090d",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
    zIndex: 20,
  },
  introMap: {
    position: "absolute",
    top: "0%",
    left: "-8%",
    right: "-8%",
    bottom: "0%",
    width: undefined,
    height: undefined,
    opacity: 0.72,
    borderRadius: 28,
    zIndex: 1,
    elevation: 1,
  },
  introShade: {
    ...StyleSheet.absoluteFill,
    backgroundColor: "rgba(7, 9, 13, 0.48)",
    zIndex: 2,
    elevation: 2,
  },
  introContent: {
    position: "absolute",
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 20,
    zIndex: 5,
    elevation: 5,
  },
  introLogo: {
    width: "78%",
    maxWidth: 420,
    height: 180,
    marginBottom: 12,
    opacity: 1,
    shadowColor: "#ffffff",
    shadowOpacity: 0.28,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 0 },
  },
  introCredit: {
    color: "#ffffff",
    fontSize: 15,
    lineHeight: 24,
    textAlign: "center",
    letterSpacing: 0.5,
  },
});
