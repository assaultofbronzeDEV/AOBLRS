import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet, Pressable, Modal, ScrollView } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSequence,
  withSpring,
  Easing,
} from "react-native-reanimated";
import * as Haptics from "expo-haptics";
import { fonts, useTheme } from "@/src/theme";
import { rollDice, DiceRollResult } from "@/src/utils/dice";
import { RollHistoryEntry, RollMode, RollVerdict, genId } from "@/src/types";

export type RollRequest = {
  label: string;
  target?: number; // if omitted, only rolls effect (no d20 check)
  effect?: { notation: string; type: "damage" | "healing" };
  resultLabel?: string;
  mode?: RollMode; // advantage / disadvantage on the d20 check
  boost?: boolean; // add 1d6 to the d20 roll for this check
};

type Props = {
  request: RollRequest | null;
  onClose: () => void;
  onLog?: (entry: RollHistoryEntry) => void;
};

type Verdict = RollVerdict;

function verdictFor(rolled: number, target: number): Verdict {
  if (rolled === 20) return "crit-success";
  if (rolled === 1) return "crit-fail";
  return rolled >= target ? "success" : "fail";
}

export default function DiceRollModal({ request, onClose, onLog }: Props) {
  const { colors } = useTheme();
  const [rolled, setRolled] = useState<number | null>(null);
  const [tickValue, setTickValue] = useState<number>(0);
  const [verdict, setVerdict] = useState<Verdict | null>(null);
  const [effect, setEffect] = useState<DiceRollResult | null>(null);
  const [invalidNotation, setInvalidNotation] = useState<string | null>(null);
  const [d20Pair, setD20Pair] = useState<number[] | null>(null);
  const [boostRoll, setBoostRoll] = useState<number | null>(null);
  const scale = useSharedValue(0.4);
  const rotate = useSharedValue(0);

  useEffect(() => {
    if (!request) {
      setRolled(null);
      setVerdict(null);
      setEffect(null);
      setInvalidNotation(null);
      setD20Pair(null);
      setBoostRoll(null);
      return;
    }
    setRolled(null);
    setVerdict(null);
    setEffect(null);
    setInvalidNotation(null);
    setD20Pair(null);
    setBoostRoll(null);
    scale.value = 0.4;
    rotate.value = 0;
    scale.value = withSequence(
      withTiming(1.2, { duration: 300, easing: Easing.out(Easing.exp) }),
      withSpring(1, { damping: 8 }),
    );
    rotate.value = withTiming(720, { duration: 900, easing: Easing.out(Easing.cubic) });

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    // If no target, we're only rolling an effect
    if (request.target == null && request.effect) {
      const start = Date.now();
      const interval = setInterval(() => {
        setTickValue(1 + Math.floor(Math.random() * (request.effect?.notation ? 10 : 20)));
        if (Date.now() - start > 700) {
          clearInterval(interval);
          const r = rollDice(request.effect!.notation);
          if (r) {
            setEffect(r);
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            onLog?.({
              id: genId(),
              at: new Date().toISOString(),
              label: request.label,
              effect: {
                notation: r.notation,
                type: request.effect!.type,
                total: r.total,
                rolls: r.rolls,
                modifier: r.modifier,
              },
            });
          } else {
            setInvalidNotation(request.effect!.notation);
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
          }
        }
      }, 60);
      return () => clearInterval(interval);
    }

    // d20 vs target flow (with optional advantage / disadvantage / boost)
    const mode: RollMode = request.mode ?? "normal";
    const useBoost = !!request.boost;
    const start = Date.now();
    const interval = setInterval(() => {
      setTickValue(1 + Math.floor(Math.random() * 20));
      if (Date.now() - start > 750) {
        clearInterval(interval);
        const d1 = 1 + Math.floor(Math.random() * 20);
        const d2 = 1 + Math.floor(Math.random() * 20);
        let d20: number;
        let pair: number[] | null = null;
        if (mode === "advantage") {
          pair = [d1, d2];
          d20 = Math.max(d1, d2);
        } else if (mode === "disadvantage") {
          pair = [d1, d2];
          d20 = Math.min(d1, d2);
        } else {
          d20 = d1;
        }
        const bRoll = useBoost ? 1 + Math.floor(Math.random() * 6) : 0;
        const finalTotal = d20 + bRoll;
        setRolled(d20);
        setD20Pair(pair);
        setBoostRoll(useBoost ? bRoll : null);
        const target = request.target ?? 0;
        // Crit checks on the d20 alone; other verdicts use total.
        let v: Verdict;
        if (d20 === 20) v = "crit-success";
        else if (d20 === 1) v = "crit-fail";
        else v = finalTotal >= target ? "success" : "fail";
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
        // Roll effect on success/crit-success only
        let eff: DiceRollResult | null = null;
        if (request.effect && (v === "success" || v === "crit-success")) {
          eff = rollDice(request.effect.notation);
          setEffect(eff);
        }
        onLog?.({
          id: genId(),
          at: new Date().toISOString(),
          label: request.label + (useBoost ? " (Boosted)" : ""),
          target,
          rolled: finalTotal,
          d20All: pair ?? undefined,
          mode: mode !== "normal" ? mode : undefined,
          verdict: v,
          effect: eff && request.effect
            ? {
                notation: eff.notation,
                type: request.effect.type,
                total: eff.total,
                rolls: eff.rolls,
                modifier: eff.modifier,
              }
            : undefined,
        });
      }
    }, 60);

    return () => clearInterval(interval);
  }, [request]);

  const diceStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }, { rotate: `${rotate.value}deg` }],
  }));

  if (!request) return null;

  const onlyEffect = request.target == null;
  const finalTotal = rolled != null ? rolled + (boostRoll ?? 0) : null;
  const display = onlyEffect
    ? effect?.total ?? tickValue ?? "?"
    : finalTotal ?? tickValue ?? "?";

  const isDone = onlyEffect
    ? effect != null || invalidNotation != null || request.effect == null
    : rolled != null;

  const resultColor = (() => {
    if (invalidNotation) return colors.error;
    if (onlyEffect) {
      if (!effect) return colors.onSurface;
      return request.effect?.type === "healing" ? colors.success : colors.brandSecondary;
    }
    if (verdict === "crit-success") return colors.warning;
    if (verdict === "crit-fail") return colors.brandSecondary;
    if (verdict === "success") return colors.success;
    if (verdict === "fail") return colors.error;
    return colors.onSurface;
  })();

  const verdictText = (() => {
    if (invalidNotation) return "INVALID DICE NOTATION";
    if (onlyEffect) {
      if (!effect) return "Rolling…";
      return request.resultLabel ?? (request.effect?.type === "healing" ? "HEALING" : "DAMAGE");
    }
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
        onPress={isDone ? onClose : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.center}
          keyboardShouldPersistTaps="handled"
        >
          <Pressable
            style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.borderStrong }]}
            onPress={(e) => e.stopPropagation()}
          >
            <Text style={[styles.label, { color: colors.muted, fontFamily: fonts.display }]}>
              {request.label}
            </Text>
            {request.target != null && (
              <Text style={[styles.target, { color: colors.onSurface, fontFamily: fonts.display }]}>
                Target ≥ {request.target}
                {request.mode && request.mode !== "normal" && (
                  <Text style={{ color: colors.brandPrimary, fontFamily: fonts.displayBold }}>
                    {"  · " + (request.mode === "advantage" ? "ADV" : "DIS")}
                  </Text>
                )}
              </Text>
            )}

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

            {d20Pair && (
              <Text
                testID="dice-pair"
                style={{
                  color: colors.muted,
                  fontFamily: fonts.body,
                  fontSize: 13,
                  marginTop: -6,
                }}
              >
                Rolled [{d20Pair.join(", ")}] — kept {rolled}
              </Text>
            )}

            {boostRoll != null && rolled != null && (
              <Text
                testID="dice-boost"
                style={{
                  color: colors.brandPrimary,
                  fontFamily: fonts.displayBold,
                  fontSize: 14,
                  marginTop: -4,
                }}
              >
                d20 {rolled} + Boost d6 {boostRoll} = {rolled + boostRoll}
              </Text>
            )}

            <Text
              testID="dice-verdict-text"
              style={[styles.verdict, { color: resultColor, fontFamily: fonts.displayBold }]}
            >
              {verdictText}
            </Text>

            {invalidNotation && (
              <Text
                testID="invalid-notation-hint"
                style={{
                  color: colors.muted,
                  fontFamily: fonts.body,
                  textAlign: "center",
                  fontSize: 13,
                  fontStyle: "italic",
                  marginTop: -6,
                }}
              >
                Could not roll "{invalidNotation}". Try a format like "1d6" or "2d8+3".
              </Text>
            )}

            {/* Effect result on success */}
            {effect && !onlyEffect && (
              <View
                style={[
                  styles.effectBox,
                  {
                    borderColor: colors.borderStrong,
                    backgroundColor:
                      request.effect?.type === "healing"
                        ? "rgba(46,111,64,0.12)"
                        : "rgba(138,42,43,0.12)",
                  },
                ]}
              >
                <Text style={[styles.effectLabel, { color: colors.muted, fontFamily: fonts.displayBold }]}>
                  {request.effect?.type === "healing" ? "HEALING" : "DAMAGE"} ({effect.notation})
                </Text>
                <Text
                  testID="effect-total"
                  style={[
                    styles.effectTotal,
                    {
                      color:
                        request.effect?.type === "healing" ? colors.success : colors.brandSecondary,
                      fontFamily: fonts.displayBold,
                    },
                  ]}
                >
                  {effect.total}
                </Text>
                <Text style={[styles.effectRolls, { color: colors.muted, fontFamily: fonts.body }]}>
                  Rolls: [{effect.rolls.join(", ")}]
                  {effect.modifier
                    ? ` ${effect.modifier > 0 ? "+" : ""}${effect.modifier}`
                    : ""}
                </Text>
              </View>
            )}

            {/* Effect-only result */}
            {effect && onlyEffect && (
              <View style={styles.effectRolls2}>
                <Text style={[styles.effectRolls, { color: colors.muted, fontFamily: fonts.body }]}>
                  Rolls: [{effect.rolls.join(", ")}]
                  {effect.modifier
                    ? ` ${effect.modifier > 0 ? "+" : ""}${effect.modifier}`
                    : ""}
                </Text>
              </View>
            )}

            {isDone && (
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
          </Pressable>
        </ScrollView>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(20, 14, 8, 0.85)",
  },
  center: {
    flexGrow: 1,
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
    gap: 12,
  },
  label: {
    fontSize: 18,
    letterSpacing: 1,
    textTransform: "uppercase",
    textAlign: "center",
  },
  target: {
    fontSize: 20,
    fontWeight: "600",
  },
  diceBox: {
    width: 140,
    height: 140,
    borderWidth: 3,
    alignItems: "center",
    justifyContent: "center",
    transform: [{ rotate: "45deg" }],
    marginTop: 8,
  },
  diceNumber: {
    fontSize: 60,
    fontWeight: "700",
    transform: [{ rotate: "-45deg" }],
  },
  verdict: {
    fontSize: 20,
    fontWeight: "700",
    letterSpacing: 1.5,
    marginTop: 8,
    textAlign: "center",
  },
  effectBox: {
    width: "100%",
    borderWidth: 2,
    padding: 10,
    alignItems: "center",
    marginTop: 4,
    gap: 2,
  },
  effectLabel: { fontSize: 11, letterSpacing: 1.5 },
  effectTotal: { fontSize: 36, fontWeight: "700" },
  effectRolls: { fontSize: 12 },
  effectRolls2: { marginTop: 4 },
  closeBtn: {
    marginTop: 8,
    paddingHorizontal: 32,
    paddingVertical: 10,
    borderWidth: 2,
  },
  closeText: {
    fontSize: 15,
    fontWeight: "700",
    letterSpacing: 1,
  },
});
