import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet, Pressable, Modal } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSequence,
  withSpring,
  Easing,
  runOnJS,
} from "react-native-reanimated";
import * as Haptics from "expo-haptics";
import { fonts, useTheme } from "@/src/theme";

export type RollPayload = {
  label: string;
  target: number;
};

type Props = {
  roll: RollPayload | null;
  onClose: () => void;
};

type Verdict = "crit-success" | "crit-fail" | "success" | "fail";

function verdictFor(rolled: number, target: number): Verdict {
  if (rolled === 20) return "crit-success";
  if (rolled === 1) return "crit-fail";
  return rolled >= target ? "success" : "fail";
}

export default function DiceRollModal({ roll, onClose }: Props) {
  const { colors } = useTheme();
  const [rolled, setRolled] = useState<number | null>(null);
  const [tickValue, setTickValue] = useState<number>(0);
  const [verdict, setVerdict] = useState<Verdict | null>(null);
  const scale = useSharedValue(0.4);
  const rotate = useSharedValue(0);

  useEffect(() => {
    if (!roll) {
      setRolled(null);
      setVerdict(null);
      return;
    }
    // Rolling animation: ticker + spin
    setRolled(null);
    setVerdict(null);
    scale.value = 0.4;
    rotate.value = 0;
    scale.value = withSequence(
      withTiming(1.2, { duration: 300, easing: Easing.out(Easing.exp) }),
      withSpring(1, { damping: 8 }),
    );
    rotate.value = withTiming(720, { duration: 900, easing: Easing.out(Easing.cubic) });

    const start = Date.now();
    const interval = setInterval(() => {
      setTickValue(1 + Math.floor(Math.random() * 20));
      if (Date.now() - start > 750) {
        clearInterval(interval);
        const final = 1 + Math.floor(Math.random() * 20);
        setRolled(final);
        const v = verdictFor(final, roll.target);
        setVerdict(v);
        if (v === "crit-success" || v === "crit-fail") {
          Haptics.notificationAsync(
            v === "crit-success"
              ? Haptics.NotificationFeedbackType.Success
              : Haptics.NotificationFeedbackType.Error,
          );
        } else {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        }
      }
    }, 60);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    return () => clearInterval(interval);
  }, [roll]);

  const diceStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }, { rotate: `${rotate.value}deg` }],
  }));

  if (!roll) return null;

  const display = rolled ?? tickValue ?? "?";

  const resultColor = (() => {
    if (verdict === "crit-success") return colors.warning; // gold
    if (verdict === "crit-fail") return colors.brandSecondary; // dark red
    if (verdict === "success") return colors.success;
    if (verdict === "fail") return colors.error;
    return colors.onSurface;
  })();

  const resultText = (() => {
    if (!verdict) return "Rolling…";
    if (verdict === "crit-success") return "CRITICAL SUCCESS!";
    if (verdict === "crit-fail") return "CRITICAL FAILURE!";
    if (verdict === "success") return "SUCCESS";
    return "FAILURE";
  })();

  return (
    <Modal transparent visible animationType="fade" onRequestClose={onClose}>
      <Pressable
        testID="dice-roll-backdrop"
        style={styles.backdrop}
        onPress={rolled != null ? onClose : undefined}
      >
        <View
          style={[
            styles.card,
            { backgroundColor: colors.surface, borderColor: colors.borderStrong },
          ]}
        >
          <Text style={[styles.label, { color: colors.muted, fontFamily: fonts.display }]}>
            {roll.label}
          </Text>
          <Text style={[styles.target, { color: colors.onSurface, fontFamily: fonts.display }]}>
            Target ≥ {roll.target}
          </Text>

          <Animated.View
            style={[
              styles.diceBox,
              diceStyle,
              { borderColor: colors.borderStrong, backgroundColor: colors.surfaceSecondary },
            ]}
          >
            <Text
              testID="dice-result-number"
              style={[styles.diceNumber, { color: resultColor, fontFamily: fonts.displayBold }]}
            >
              {display}
            </Text>
          </Animated.View>

          <Text
            testID="dice-verdict-text"
            style={[styles.verdict, { color: resultColor, fontFamily: fonts.displayBold }]}
          >
            {resultText}
          </Text>

          {rolled != null && (
            <Pressable
              testID="dice-roll-close"
              onPress={onClose}
              style={({ pressed }) => [
                styles.closeBtn,
                {
                  backgroundColor: pressed ? colors.brandTertiary : colors.brandPrimary,
                  borderColor: colors.borderStrong,
                },
              ]}
            >
              <Text style={[styles.closeText, { color: colors.onBrandPrimary, fontFamily: fonts.displayBold }]}>
                Close
              </Text>
            </Pressable>
          )}
        </View>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(20, 14, 8, 0.85)",
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  card: {
    width: "100%",
    maxWidth: 380,
    borderWidth: 3,
    padding: 24,
    alignItems: "center",
    gap: 16,
  },
  label: {
    fontSize: 18,
    letterSpacing: 1,
    textTransform: "uppercase",
  },
  target: {
    fontSize: 22,
    fontWeight: "600",
  },
  diceBox: {
    width: 160,
    height: 160,
    borderWidth: 3,
    alignItems: "center",
    justifyContent: "center",
    transform: [{ rotate: "45deg" }],
  },
  diceNumber: {
    fontSize: 72,
    fontWeight: "700",
    transform: [{ rotate: "-45deg" }],
  },
  verdict: {
    fontSize: 22,
    fontWeight: "700",
    letterSpacing: 1.5,
    marginTop: 8,
  },
  closeBtn: {
    marginTop: 8,
    paddingHorizontal: 32,
    paddingVertical: 12,
    borderWidth: 2,
  },
  closeText: {
    fontSize: 16,
    fontWeight: "700",
    letterSpacing: 1,
  },
});
