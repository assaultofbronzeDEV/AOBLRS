import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  TextInput,
  Animated,
  Easing,
} from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Icon from "@react-native-vector-icons/material-design-icons";

import { fonts, useTheme, ThemeColors } from "@/src/theme";
import {
  createEmptyCharacter,
  defaultHeroStats,
  genId,
  HP_MAX,
  StatKey,
} from "@/src/types";
import { upsertCharacter } from "@/src/storage/characters";
import { CLASSES, RACES, Race, CharClass, TraitRef, traitKey } from "@/src/data/lineages";

// ---------- Steps ----------
type Step = 0 | 1 | 2 | 3 | 4;
const STEP_LABELS = ["Race", "Class", "Roll", "Assign", "Finalize"];

// ---------- Slots for tap-to-assign ----------
type SlotRef = { statKey: StatKey; subIndex: number | null }; // null = main stat
const STATS_ORDER: StatKey[] = ["STR", "DEX", "INT", "CHA"];
const STAT_TITLES: Record<StatKey, string> = {
  STR: "STRENGTH",
  DEX: "DEXTERITY",
  INT: "INTELLIGENCE",
  CHA: "CHARISMA",
};
const SUB_NAMES: Record<StatKey, string[]> = {
  STR: ["Lifting", "Climbing", "Intimidation", "Vitality"],
  DEX: ["Melee Attack", "Ranged Attack", "Sleight of Hand", "Stealth"],
  INT: ["Perception", "Investigation", "History", "First Aid"],
  CHA: ["Persuasion", "Deception", "Haggling", "Creature Handling"],
};

const slotKey = (s: SlotRef) => `${s.statKey}.${s.subIndex ?? "M"}`;

// Roll 20d20 clamped [6,18].
const rollTwentyClamped = (): number[] => {
  const out: number[] = [];
  for (let i = 0; i < 20; i++) {
    const raw = 1 + Math.floor(Math.random() * 20);
    out.push(Math.max(6, Math.min(18, raw)));
  }
  return out;
};

// ---------- Main screen ----------
export default function CreateHeroScreen() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const styles = getStyles(colors);

  const [mode, setMode] = useState<"easy" | null>(null);
  const [step, setStep] = useState<Step>(0);
  const [race, setRace] = useState<Race | null>(null);
  const [charClass, setCharClass] = useState<CharClass | null>(null);
  const [pool, setPool] = useState<number[]>([]); // rolled numbers (0 if consumed)
  const [assigned, setAssigned] = useState<Record<string, number>>({});
  const [selectedRollIdx, setSelectedRollIdx] = useState<number | null>(null);
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);

  const highSet = useMemo(() => {
    const s = new Set<string>();
    race?.high.forEach((t) => s.add(traitKey(t)));
    charClass?.high.forEach((t) => s.add(traitKey(t)));
    return s;
  }, [race, charClass]);

  const lowSet = useMemo(() => {
    const s = new Set<string>();
    race?.low.forEach((t) => s.add(traitKey(t)));
    charClass?.low.forEach((t) => s.add(traitKey(t)));
    return s;
  }, [race, charClass]);

  const allAssigned = Object.keys(assigned).length === 20;

  const goNext = () => {
    if (step === 0 && !race) return;
    if (step === 1 && !charClass) return;
    if (step === 2 && pool.length === 0) return;
    if (step === 3 && !allAssigned) return;
    setStep((s) => Math.min(4, (s + 1) as Step));
  };
  const goBack = () => setStep((s) => Math.max(0, (s - 1) as Step));

  // When entering step 2, auto-roll once.
  useEffect(() => {
    if (step === 2 && pool.length === 0) {
      setPool(rollTwentyClamped());
    }
  }, [step, pool.length]);

  const reroll = () => {
    setPool(rollTwentyClamped());
    setAssigned({});
    setSelectedRollIdx(null);
  };

  const autoFill = () => {
    // Collect all 20 numbers (both those still in the pool and already-assigned
    // ones) so this button always produces a full board.
    const available = pool.filter((v) => v !== 0);
    const already = Object.values(assigned);
    const numbers = [...available, ...already];
    if (numbers.length !== 20) return; // safety

    // 20 slot refs in the same order the UI uses.
    const slots: SlotRef[] = [];
    for (const k of STATS_ORDER) {
      slots.push({ statKey: k, subIndex: null });
      for (let i = 0; i < 4; i++) slots.push({ statKey: k, subIndex: i });
    }

    // Partition slots: greens get lowest, reds get highest, rest random.
    const green: SlotRef[] = [];
    const red: SlotRef[] = [];
    const neutral: SlotRef[] = [];
    for (const s of slots) {
      if (s.subIndex == null) {
        // main stats fall into neutral (no border tint)
        neutral.push(s);
        continue;
      }
      const traitK = `${s.statKey}.${s.subIndex}`;
      if (highSet.has(traitK)) green.push(s);
      else if (lowSet.has(traitK)) red.push(s);
      else neutral.push(s);
    }

    const asc = [...numbers].sort((a, b) => a - b);
    const nextAssigned: Record<string, number> = {};

    // Green slots get the lowest N numbers (in random order among greens).
    const shuffle = <T,>(arr: T[]): T[] => {
      const out = [...arr];
      for (let i = out.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [out[i], out[j]] = [out[j], out[i]];
      }
      return out;
    };

    const lowest = asc.slice(0, green.length);
    const highest = asc.slice(asc.length - red.length);
    const middle = asc.slice(green.length, asc.length - red.length);

    const shuffledLowest = shuffle(lowest);
    const shuffledHighest = shuffle(highest);
    const shuffledMiddle = shuffle(middle);
    const shuffledNeutral = shuffle(neutral);

    green.forEach((s, i) => {
      nextAssigned[slotKey(s)] = shuffledLowest[i];
    });
    red.forEach((s, i) => {
      nextAssigned[slotKey(s)] = shuffledHighest[i];
    });
    shuffledNeutral.forEach((s, i) => {
      nextAssigned[slotKey(s)] = shuffledMiddle[i];
    });

    setAssigned(nextAssigned);
    setPool((prev) => prev.map(() => 0)); // fully consumed
    setSelectedRollIdx(null);
  };

  const onPickRoll = (idx: number) => {
    if (pool[idx] === 0) return;
    setSelectedRollIdx((cur) => (cur === idx ? null : idx));
  };

  const onPickSlot = (slot: SlotRef) => {
    const k = slotKey(slot);
    // If slot has a value and no roll is selected, return it to the pool.
    if (assigned[k] != null && selectedRollIdx == null) {
      const val = assigned[k];
      setAssigned((prev) => {
        const next = { ...prev };
        delete next[k];
        return next;
      });
      // find first zero in pool and refill
      setPool((prev) => {
        const next = [...prev];
        const zeroIdx = next.findIndex((v) => v === 0);
        if (zeroIdx >= 0) next[zeroIdx] = val;
        else next.push(val);
        return next;
      });
      return;
    }
    if (selectedRollIdx == null) return;
    const val = pool[selectedRollIdx];
    if (!val) return;
    // If slot occupied, return old value to pool first.
    setAssigned((prev) => {
      const next = { ...prev };
      const prevVal = next[k];
      next[k] = val;
      if (prevVal != null) {
        setPool((p) => {
          const nx = [...p];
          nx[selectedRollIdx] = prevVal;
          return nx;
        });
      } else {
        setPool((p) => {
          const nx = [...p];
          nx[selectedRollIdx] = 0;
          return nx;
        });
      }
      return next;
    });
    setSelectedRollIdx(null);
  };

  const finalize = async () => {
    if (!race || !charClass || !allAssigned) return;
    setSaving(true);
    const base = createEmptyCharacter();
    const stats = defaultHeroStats();
    for (const st of stats) {
      const mainKey = slotKey({ statKey: st.key, subIndex: null });
      if (assigned[mainKey] != null) st.value = assigned[mainKey];
      st.subs = st.subs.map((sub, i) => {
        const k = slotKey({ statKey: st.key, subIndex: i });
        return { ...sub, value: assigned[k] ?? sub.value };
      });
    }
    const trimmedName = name.trim() || `${race.name.split(" / ")[0]} ${charClass.name}`;
    const hero = {
      ...base,
      name: trimmedName,
      className: charClass.name,
      level: "1",
      hp: HP_MAX,
      maxHp: HP_MAX,
      armour: String(charClass.baseArmour),
      meleeDmg: charClass.weapons[0]?.damageRoll ?? "1d6",
      stats,
      weapons: charClass.weapons.map((w) => ({
        id: genId(),
        name: w.name,
        attackKind: w.attackKind,
        damageRoll: w.damageRoll,
      })),
      backstory: `${race.name} ${charClass.name}. ${charClass.tagline}`,
    };
    await upsertCharacter(hero);
    router.replace(`/character/${hero.id}`);
  };

  const startCustom = async () => {
    setSaving(true);
    const c = createEmptyCharacter();
    c.name = "New Hero";
    await upsertCharacter(c);
    router.replace(`/character/${c.id}`);
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Pressable
          testID="creator-close"
          onPress={() => router.back()}
          hitSlop={10}
          style={({ pressed }) => [
            styles.iconBtn,
            { backgroundColor: pressed ? colors.brandTertiary : "transparent" },
          ]}
        >
          <Icon name="close" size={22} color={colors.onSurface} />
        </Pressable>
        <Text style={styles.headerTitle} numberOfLines={1}>
          {mode == null ? "New Hero" : "Forge a Hero"}
        </Text>
        <View style={{ width: 36 }} />
      </View>

      {mode == null ? (
        <ModePicker
          onEasy={() => setMode("easy")}
          onCustom={startCustom}
          saving={saving}
        />
      ) : (
        <>
          <StepBar step={step} />

      <View style={{ flex: 1 }}>
        {step === 0 && (
          <RaceStep selected={race} onSelect={setRace} />
        )}
        {step === 1 && (
          <ClassStep selected={charClass} onSelect={setCharClass} />
        )}
        {step === 2 && (
          <RollStep pool={pool} onReroll={reroll} />
        )}
        {step === 3 && race && charClass && (
          <AssignStep
            pool={pool}
            assigned={assigned}
            selectedRollIdx={selectedRollIdx}
            highSet={highSet}
            lowSet={lowSet}
            onPickRoll={onPickRoll}
            onPickSlot={onPickSlot}
            onReroll={reroll}
            onAutoFill={autoFill}
          />
        )}
        {step === 4 && race && charClass && (
          <FinalizeStep
            race={race}
            charClass={charClass}
            name={name}
            setName={setName}
          />
        )}
      </View>

      <View style={[styles.footer, { paddingBottom: 12 + insets.bottom }]}>
        <Pressable
          testID="creator-back"
          onPress={goBack}
          disabled={step === 0}
          style={({ pressed }) => [
            styles.footerBtn,
            styles.footerBack,
            {
              borderColor: colors.borderStrong,
              backgroundColor: pressed ? colors.brandTertiary : colors.surfaceSecondary,
              opacity: step === 0 ? 0.4 : 1,
            },
          ]}
        >
          <Icon name="chevron-left" size={18} color={colors.onSurface} />
          <Text style={[styles.footerBtnText, { color: colors.onSurface }]}>Back</Text>
        </Pressable>

        {step < 4 ? (
          <Pressable
            testID="creator-next"
            onPress={goNext}
            disabled={
              (step === 0 && !race) ||
              (step === 1 && !charClass) ||
              (step === 3 && !allAssigned)
            }
            style={({ pressed }) => {
              const disabled =
                (step === 0 && !race) ||
                (step === 1 && !charClass) ||
                (step === 3 && !allAssigned);
              return [
                styles.footerBtn,
                {
                  borderColor: colors.borderStrong,
                  backgroundColor: pressed
                    ? colors.brandSecondary
                    : disabled
                      ? colors.surfaceTertiary
                      : colors.brandPrimary,
                  opacity: disabled ? 0.5 : 1,
                },
              ];
            }}
          >
            <Text
              style={[
                styles.footerBtnText,
                { color: colors.onBrandPrimary },
              ]}
            >
              {step === 3 ? "Review" : "Next"}
            </Text>
            <Icon name="chevron-right" size={18} color={colors.onBrandPrimary} />
          </Pressable>
        ) : (
          <Pressable
            testID="creator-finish"
            onPress={finalize}
            disabled={saving}
            style={({ pressed }) => [
              styles.footerBtn,
              {
                borderColor: colors.borderStrong,
                backgroundColor: pressed ? colors.brandSecondary : colors.brandPrimary,
                opacity: saving ? 0.6 : 1,
              },
            ]}
          >
            <Icon name="shield-sword" size={18} color={colors.onBrandPrimary} />
            <Text style={[styles.footerBtnText, { color: colors.onBrandPrimary }]}>
              {saving ? "Forging…" : "Forge Hero"}
            </Text>
          </Pressable>
        )}
      </View>
        </>
      )}
    </View>
  );
}

// ---------- Mode picker ----------
function ModePicker({
  onEasy,
  onCustom,
  saving,
}: {
  onEasy: () => void;
  onCustom: () => void;
  saving: boolean;
}) {
  const { colors } = useTheme();
  const styles = getStyles(colors);
  return (
    <ScrollView contentContainerStyle={styles.modeBody}>
      <Text style={styles.stepHeading}>How shall we begin?</Text>
      <Text style={styles.stepSubHeading}>
        Choose your path. You can always tweak everything on the sheet afterwards.
      </Text>

      <Pressable
        testID="mode-easy"
        onPress={onEasy}
        disabled={saving}
        style={({ pressed }) => [
          styles.modeCard,
          {
            borderColor: colors.brandPrimary,
            backgroundColor: pressed ? colors.brandTertiary : colors.surfaceSecondary,
          },
        ]}
      >
        <View style={styles.modeIconWrap}>
          <Icon name="auto-fix" size={30} color={colors.brandPrimary} />
        </View>
        <Text style={styles.modeTitle}>Easy Creation</Text>
        <Text style={styles.modeSub}>
          A guided 5-step forge — pick a race and class, roll 20 dice, tap them into place. Great for a first hero or players new to the system.
        </Text>
        <View style={styles.modeMetaRow}>
          <View style={styles.modeMetaChip}>
            <Icon name="account-star" size={12} color={colors.brandPrimary} />
            <Text style={styles.modeMetaText}>9 Races</Text>
          </View>
          <View style={styles.modeMetaChip}>
            <Icon name="shield-sword" size={12} color={colors.brandPrimary} />
            <Text style={styles.modeMetaText}>8 Classes</Text>
          </View>
          <View style={styles.modeMetaChip}>
            <Icon name="dice-multiple" size={12} color={colors.brandPrimary} />
            <Text style={styles.modeMetaText}>Guided rolls</Text>
          </View>
        </View>
        <View style={[styles.modeCta, { backgroundColor: colors.brandPrimary }]}>
          <Text style={[styles.modeCtaText, { color: colors.onBrandPrimary }]}>
            Start guided forge
          </Text>
          <Icon name="chevron-right" size={16} color={colors.onBrandPrimary} />
        </View>
      </Pressable>

      <Pressable
        testID="mode-custom"
        onPress={onCustom}
        disabled={saving}
        style={({ pressed }) => [
          styles.modeCard,
          {
            borderColor: colors.borderStrong,
            backgroundColor: pressed ? colors.surfaceTertiary : colors.surface,
            opacity: saving ? 0.6 : 1,
          },
        ]}
      >
        <View style={styles.modeIconWrap}>
          <Icon name="pencil-outline" size={30} color={colors.onSurface} />
        </View>
        <Text style={styles.modeTitle}>Custom Creation</Text>
        <Text style={styles.modeSub}>
          Skip the wizard entirely and land on a blank sheet. Fill in name, class, stats, weapons and abilities by hand — perfect for veterans porting an existing hero.
        </Text>
        <View style={styles.modeMetaRow}>
          <View style={styles.modeMetaChip}>
            <Icon name="lightning-bolt-outline" size={12} color={colors.onSurface} />
            <Text style={styles.modeMetaText}>Fastest start</Text>
          </View>
          <View style={styles.modeMetaChip}>
            <Icon name="tune" size={12} color={colors.onSurface} />
            <Text style={styles.modeMetaText}>Total control</Text>
          </View>
        </View>
        <View style={[styles.modeCta, { backgroundColor: colors.surfaceSecondary, borderWidth: 2, borderColor: colors.borderStrong }]}>
          <Text style={[styles.modeCtaText, { color: colors.onSurface }]}>
            {saving ? "Preparing…" : "Straight to sheet"}
          </Text>
          <Icon name="chevron-right" size={16} color={colors.onSurface} />
        </View>
      </Pressable>
    </ScrollView>
  );
}

// ---------- Step bar ----------
function StepBar({ step }: { step: Step }) {
  const { colors } = useTheme();
  const styles = getStyles(colors);
  return (
    <View style={styles.stepBar}>
      {STEP_LABELS.map((label, i) => {
        const active = i === step;
        const done = i < step;
        return (
          <View key={label} style={styles.stepPill}>
            <View
              style={[
                styles.stepDot,
                {
                  backgroundColor: done
                    ? colors.brandPrimary
                    : active
                      ? colors.brandSecondary
                      : colors.surfaceTertiary,
                  borderColor: colors.borderStrong,
                },
              ]}
            >
              <Text
                style={[
                  styles.stepDotText,
                  { color: done || active ? colors.onBrandPrimary : colors.muted },
                ]}
              >
                {i + 1}
              </Text>
            </View>
            <Text
              numberOfLines={1}
              style={[
                styles.stepLabel,
                {
                  color: active ? colors.onSurface : colors.muted,
                  fontFamily: active ? fonts.displayBold : fonts.display,
                },
              ]}
            >
              {label}
            </Text>
          </View>
        );
      })}
    </View>
  );
}

// ---------- Race step ----------
function RaceStep({
  selected,
  onSelect,
}: {
  selected: Race | null;
  onSelect: (r: Race) => void;
}) {
  const { colors } = useTheme();
  const styles = getStyles(colors);
  return (
    <ScrollView contentContainerStyle={styles.stepBody}>
      <Text style={styles.stepHeading}>Choose your bloodline</Text>
      <Text style={styles.stepSubHeading}>
        Green traits are natural strengths — place a LOW roll there. Red traits are weak spots — place a HIGH roll there.
      </Text>
      {RACES.map((r) => (
        <PickerCard
          key={r.id}
          testID={`race-${r.id}`}
          selected={selected?.id === r.id}
          title={r.name}
          tagline={r.tagline}
          lore={r.lore}
          high={r.high}
          low={r.low}
          onPress={() => onSelect(r)}
        />
      ))}
    </ScrollView>
  );
}

// ---------- Class step ----------
function ClassStep({
  selected,
  onSelect,
}: {
  selected: CharClass | null;
  onSelect: (c: CharClass) => void;
}) {
  const { colors } = useTheme();
  const styles = getStyles(colors);
  return (
    <ScrollView contentContainerStyle={styles.stepBody}>
      <Text style={styles.stepHeading}>Choose your calling</Text>
      <Text style={styles.stepSubHeading}>
        Sets your starting Armour and weapon(s). Traits stack with your race&apos;s hints.
      </Text>
      {CLASSES.map((c) => (
        <PickerCard
          key={c.id}
          testID={`class-${c.id}`}
          selected={selected?.id === c.id}
          title={c.name}
          tagline={c.tagline}
          lore={c.lore}
          high={c.high}
          low={c.low}
          onPress={() => onSelect(c)}
          extra={
            <View style={styles.classExtras}>
              <View style={styles.classExtraChip}>
                <Icon name="shield" size={12} color={colors.brandPrimary} />
                <Text style={styles.classExtraText}>Armour {c.baseArmour}</Text>
              </View>
              {c.weapons.map((w, i) => (
                <View key={i} style={styles.classExtraChip}>
                  <Icon
                    name={w.attackKind === "ranged" ? "bow-arrow" : "sword"}
                    size={12}
                    color={colors.brandPrimary}
                  />
                  <Text style={styles.classExtraText}>
                    {w.name} ({w.damageRoll})
                  </Text>
                </View>
              ))}
            </View>
          }
        />
      ))}
    </ScrollView>
  );
}

// ---------- Picker card ----------
function PickerCard({
  selected,
  title,
  tagline,
  lore,
  high,
  low,
  onPress,
  extra,
  testID,
}: {
  selected: boolean;
  title: string;
  tagline: string;
  lore: string;
  high: TraitRef[];
  low: TraitRef[];
  onPress: () => void;
  extra?: React.ReactNode;
  testID?: string;
}) {
  const { colors } = useTheme();
  const styles = getStyles(colors);
  return (
    <Pressable
      testID={testID}
      onPress={onPress}
      style={({ pressed }) => [
        styles.pickerCard,
        {
          borderColor: selected ? colors.brandPrimary : colors.borderStrong,
          backgroundColor: selected
            ? colors.brandTertiary
            : pressed
              ? colors.surfaceTertiary
              : colors.surfaceSecondary,
        },
      ]}
    >
      <View style={styles.pickerHead}>
        <Text style={styles.pickerTitle}>{title}</Text>
        {selected && (
          <Icon name="check-circle" size={20} color={colors.brandPrimary} />
        )}
      </View>
      <Text style={styles.pickerTagline}>{tagline}</Text>
      <Text style={styles.pickerLore}>{lore}</Text>
      <View style={styles.traitRow}>
        {high.map((t, i) => (
          <View
            key={`h${i}`}
            style={[styles.traitChip, { borderColor: colors.success, backgroundColor: colors.surface }]}
          >
            <Icon name="arrow-up-bold" size={11} color={colors.success} />
            <Text style={[styles.traitText, { color: colors.success }]}>
              {SUB_NAMES[t.statKey][t.subIndex]}
            </Text>
          </View>
        ))}
        {low.map((t, i) => (
          <View
            key={`l${i}`}
            style={[styles.traitChip, { borderColor: colors.error, backgroundColor: colors.surface }]}
          >
            <Icon name="arrow-down-bold" size={11} color={colors.error} />
            <Text style={[styles.traitText, { color: colors.error }]}>
              {SUB_NAMES[t.statKey][t.subIndex]}
            </Text>
          </View>
        ))}
      </View>
      {extra}
    </Pressable>
  );
}

// ---------- Roll step ----------
function RollStep({ pool, onReroll }: { pool: number[]; onReroll: () => void }) {
  const { colors } = useTheme();
  const styles = getStyles(colors);
  // Simple stagger animation on mount / reroll.
  const anims = useRef(pool.map(() => new Animated.Value(0))).current;
  // Reset animations when pool changes (reroll).
  useEffect(() => {
    // Rebuild anim refs if length changed.
    while (anims.length < pool.length) anims.push(new Animated.Value(0));
    anims.forEach((a) => a.setValue(0));
    Animated.stagger(
      35,
      anims.slice(0, pool.length).map((a) =>
        Animated.timing(a, {
          toValue: 1,
          duration: 260,
          easing: Easing.out(Easing.back(1.4)),
          useNativeDriver: true,
        }),
      ),
    ).start();
  }, [pool]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <ScrollView contentContainerStyle={styles.stepBody}>
      <Text style={styles.stepHeading}>The bones are cast</Text>
      <Text style={styles.stepSubHeading}>
        20 dice rolled (each d20, clamped to 6–18). Remember: LOWER is better in Assault of Bronze.
      </Text>
      <View style={styles.rollGrid}>
        {pool.map((n, i) => (
          <Animated.View
            key={i}
            style={[
              styles.rollDie,
              {
                borderColor: colors.borderStrong,
                backgroundColor: colors.surfaceSecondary,
                opacity: anims[i] ?? 1,
                transform: [
                  {
                    scale: (anims[i] ?? new Animated.Value(1)).interpolate({
                      inputRange: [0, 1],
                      outputRange: [0.3, 1],
                    }),
                  },
                ],
              },
            ]}
          >
            <Text style={styles.rollDieText}>{n}</Text>
          </Animated.View>
        ))}
      </View>
      <Pressable
        testID="reroll-btn"
        onPress={onReroll}
        style={({ pressed }) => [
          styles.rerollBtn,
          {
            borderColor: colors.borderStrong,
            backgroundColor: pressed ? colors.brandSecondary : colors.surfaceSecondary,
          },
        ]}
      >
        <Icon name="dice-multiple" size={16} color={colors.onSurface} />
        <Text style={styles.rerollText}>Reroll all</Text>
      </Pressable>
    </ScrollView>
  );
}

// ---------- Assign step ----------
function AssignStep({
  pool,
  assigned,
  selectedRollIdx,
  highSet,
  lowSet,
  onPickRoll,
  onPickSlot,
  onReroll,
  onAutoFill,
}: {
  pool: number[];
  assigned: Record<string, number>;
  selectedRollIdx: number | null;
  highSet: Set<string>;
  lowSet: Set<string>;
  onPickRoll: (i: number) => void;
  onPickSlot: (s: SlotRef) => void;
  onReroll: () => void;
  onAutoFill: () => void;
}) {
  const { colors } = useTheme();
  const styles = getStyles(colors);
  const remaining = pool.filter((v) => v !== 0).length;

  return (
    <ScrollView
      contentContainerStyle={styles.stepBody}
      keyboardShouldPersistTaps="handled"
    >
      <Text style={styles.stepHeading}>Assign your fate</Text>
      <Text style={styles.stepSubHeading}>
        Tap a die, then tap a slot. Green slots want LOW numbers, red slots want HIGH numbers. Tap a filled slot to return it to the pool.
      </Text>

      <View style={styles.assignPoolCard}>
        <View style={styles.assignPoolHead}>
          <Text style={styles.assignPoolLabel}>DICE POOL</Text>
          <Text style={styles.assignPoolCount}>
            {remaining} / 20 left
          </Text>
        </View>
        <View style={styles.assignPoolGrid}>
          {pool.map((n, i) => {
            const isSel = i === selectedRollIdx;
            const consumed = n === 0;
            return (
              <Pressable
                key={i}
                testID={`roll-${i}`}
                onPress={() => onPickRoll(i)}
                disabled={consumed}
                style={({ pressed }) => [
                  styles.poolDie,
                  {
                    borderColor: isSel ? colors.brandPrimary : colors.borderStrong,
                    borderWidth: isSel ? 3 : 2,
                    backgroundColor: consumed
                      ? colors.surfaceTertiary
                      : isSel
                        ? colors.brandPrimary
                        : pressed
                          ? colors.brandTertiary
                          : colors.surface,
                    opacity: consumed ? 0.35 : 1,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.poolDieText,
                    {
                      color: isSel
                        ? colors.onBrandPrimary
                        : consumed
                          ? colors.muted
                          : colors.onSurface,
                    },
                  ]}
                >
                  {consumed ? "—" : n}
                </Text>
              </Pressable>
            );
          })}
        </View>
        <View style={styles.assignActionRow}>
          <Pressable
            testID="assign-autofill"
            onPress={onAutoFill}
            style={({ pressed }) => [
              styles.autoFillBtn,
              {
                borderColor: colors.brandPrimary,
                backgroundColor: pressed ? colors.brandSecondary : colors.brandPrimary,
              },
            ]}
          >
            <Icon name="auto-fix" size={13} color={colors.onBrandPrimary} />
            <Text style={[styles.autoFillText, { color: colors.onBrandPrimary }]}>
              Auto-fill
            </Text>
          </Pressable>
          <Pressable
            testID="assign-reroll"
            onPress={onReroll}
            style={({ pressed }) => [
              styles.rerollSmall,
              {
                borderColor: colors.borderStrong,
                backgroundColor: pressed ? colors.brandTertiary : colors.surfaceSecondary,
              },
            ]}
          >
            <Icon name="restart" size={13} color={colors.onSurface} />
            <Text style={styles.rerollSmallText}>Reroll &amp; reset</Text>
          </Pressable>
        </View>
      </View>

      {STATS_ORDER.map((sk) => (
        <View key={sk} style={styles.statSection}>
          <Text style={styles.statSectionTitle}>{STAT_TITLES[sk]}</Text>
          <View style={styles.statGrid}>
            <SlotChip
              testID={`slot-${sk}-main`}
              label="MAIN"
              value={assigned[slotKey({ statKey: sk, subIndex: null })]}
              tint="none"
              onPress={() => onPickSlot({ statKey: sk, subIndex: null })}
              armed={selectedRollIdx != null}
            />
            {SUB_NAMES[sk].map((sub, i) => {
              const key = slotKey({ statKey: sk, subIndex: i });
              const traitK = `${sk}.${i}`;
              const tint = highSet.has(traitK)
                ? ("high" as const)
                : lowSet.has(traitK)
                  ? ("low" as const)
                  : ("none" as const);
              return (
                <SlotChip
                  key={i}
                  testID={`slot-${sk}-${i}`}
                  label={sub}
                  value={assigned[key]}
                  tint={tint}
                  onPress={() => onPickSlot({ statKey: sk, subIndex: i })}
                  armed={selectedRollIdx != null}
                />
              );
            })}
          </View>
        </View>
      ))}
    </ScrollView>
  );
}

function SlotChip({
  label,
  value,
  tint,
  onPress,
  armed,
  testID,
}: {
  label: string;
  value?: number;
  tint: "high" | "low" | "none";
  onPress: () => void;
  armed: boolean;
  testID?: string;
}) {
  const { colors } = useTheme();
  const border =
    tint === "high"
      ? colors.success
      : tint === "low"
        ? colors.error
        : colors.borderStrong;
  const bg = value != null ? colors.brandTertiary : colors.surface;
  const styles = getStyles(colors);
  return (
    <Pressable
      testID={testID}
      onPress={onPress}
      style={({ pressed }) => [
        styles.slot,
        {
          borderColor: border,
          borderWidth: tint === "none" ? 2 : 3,
          backgroundColor: pressed ? colors.brandTertiary : bg,
          shadowColor: armed && value == null ? colors.brandPrimary : "transparent",
        },
      ]}
    >
      <Text
        numberOfLines={1}
        style={[
          styles.slotLabel,
          {
            color:
              tint === "high"
                ? colors.success
                : tint === "low"
                  ? colors.error
                  : colors.muted,
          },
        ]}
      >
        {label}
      </Text>
      <Text style={styles.slotValue}>{value ?? "—"}</Text>
    </Pressable>
  );
}

// ---------- Finalize step ----------
function FinalizeStep({
  race,
  charClass,
  name,
  setName,
}: {
  race: Race;
  charClass: CharClass;
  name: string;
  setName: (v: string) => void;
}) {
  const { colors } = useTheme();
  const styles = getStyles(colors);
  const placeholder = `${race.name.split(" / ")[0]} ${charClass.name}`;
  return (
    <ScrollView contentContainerStyle={styles.stepBody} keyboardShouldPersistTaps="handled">
      <Text style={styles.stepHeading}>Name your hero</Text>
      <Text style={styles.stepSubHeading}>
        Nearly done — one last mark on the ledger.
      </Text>
      <View style={styles.finalCard}>
        <Text style={styles.finalLabel}>NAME</Text>
        <TextInput
          testID="hero-name-input"
          value={name}
          onChangeText={setName}
          placeholder={placeholder}
          placeholderTextColor={colors.muted}
          style={styles.nameInput}
        />
        <View style={styles.finalSummary}>
          <SummaryRow icon="account-star" label="Race" value={race.name} />
          <SummaryRow icon="shield-sword" label="Class" value={charClass.name} />
          <SummaryRow icon="heart" label="HP" value={`${HP_MAX} / ${HP_MAX}`} />
          <SummaryRow icon="shield" label="Armour" value={String(charClass.baseArmour)} />
          <SummaryRow
            icon="sword"
            label="Starting Weapons"
            value={charClass.weapons.map((w) => `${w.name} (${w.damageRoll})`).join(", ")}
          />
        </View>
      </View>
    </ScrollView>
  );
}

function SummaryRow({
  icon,
  label,
  value,
}: {
  icon: string;
  label: string;
  value: string;
}) {
  const { colors } = useTheme();
  const styles = getStyles(colors);
  return (
    <View style={styles.summaryRow}>
      <Icon name={icon as any} size={16} color={colors.brandPrimary} />
      <Text style={styles.summaryLabel}>{label}</Text>
      <Text style={styles.summaryValue} numberOfLines={2}>
        {value}
      </Text>
    </View>
  );
}

// ---------- Styles ----------
const getStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.surface },
    header: {
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: 12,
      paddingVertical: 10,
      borderBottomWidth: 3,
      borderBottomColor: colors.borderStrong,
      backgroundColor: colors.surfaceSecondary,
    },
    iconBtn: {
      width: 36,
      height: 36,
      borderWidth: 2,
      borderColor: colors.borderStrong,
      alignItems: "center",
      justifyContent: "center",
    },
    headerTitle: {
      flex: 1,
      textAlign: "center",
      fontSize: 20,
      color: colors.onSurface,
      fontFamily: fonts.displayBold,
      letterSpacing: 2,
    },
    stepBar: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: 12,
      paddingVertical: 10,
      borderBottomWidth: 2,
      borderBottomColor: colors.divider,
      backgroundColor: colors.surface,
      gap: 4,
    },
    stepPill: { alignItems: "center", flex: 1, gap: 4 },
    stepDot: {
      width: 26,
      height: 26,
      borderWidth: 2,
      alignItems: "center",
      justifyContent: "center",
    },
    stepDotText: { fontSize: 12, fontFamily: fonts.displayBold },
    stepLabel: { fontSize: 11, letterSpacing: 1 },
    stepBody: { padding: 16, paddingBottom: 32, gap: 14 },
    modeBody: { padding: 16, paddingBottom: 48, gap: 14 },
    modeCard: {
      borderWidth: 2.5,
      padding: 18,
      gap: 8,
    },
    modeIconWrap: {
      width: 52,
      height: 52,
      borderWidth: 2,
      borderColor: colors.borderStrong,
      backgroundColor: colors.surface,
      alignItems: "center",
      justifyContent: "center",
    },
    modeTitle: {
      fontSize: 22,
      color: colors.onSurface,
      fontFamily: fonts.displayBold,
      letterSpacing: 1.5,
      marginTop: 4,
    },
    modeSub: {
      fontSize: 13,
      color: colors.onSurface,
      fontFamily: fonts.display,
      lineHeight: 18,
    },
    modeMetaRow: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 4 },
    modeMetaChip: {
      flexDirection: "row",
      alignItems: "center",
      gap: 3,
      borderWidth: 1.5,
      borderColor: colors.borderStrong,
      backgroundColor: colors.surface,
      paddingHorizontal: 6,
      paddingVertical: 3,
    },
    modeMetaText: {
      fontSize: 11,
      color: colors.onSurface,
      fontFamily: fonts.displayBold,
      letterSpacing: 0.5,
    },
    modeCta: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 6,
      paddingVertical: 12,
      marginTop: 8,
    },
    modeCtaText: {
      fontSize: 14,
      fontFamily: fonts.displayBold,
      letterSpacing: 1,
    },
    stepHeading: {
      fontSize: 22,
      color: colors.onSurface,
      fontFamily: fonts.displayBold,
      letterSpacing: 1.5,
    },
    stepSubHeading: {
      fontSize: 13,
      color: colors.muted,
      fontFamily: fonts.display,
      lineHeight: 18,
    },

    // Picker card
    pickerCard: {
      borderWidth: 2.5,
      padding: 14,
      gap: 6,
    },
    pickerHead: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
    },
    pickerTitle: {
      fontSize: 18,
      color: colors.onSurface,
      fontFamily: fonts.displayBold,
      letterSpacing: 1,
    },
    pickerTagline: {
      fontSize: 13,
      color: colors.brandPrimary,
      fontFamily: fonts.displayBold,
      fontStyle: "italic",
    },
    pickerLore: {
      fontSize: 13,
      color: colors.onSurface,
      fontFamily: fonts.display,
      lineHeight: 18,
    },
    traitRow: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 4 },
    traitChip: {
      flexDirection: "row",
      alignItems: "center",
      gap: 3,
      borderWidth: 1.5,
      paddingHorizontal: 6,
      paddingVertical: 3,
    },
    traitText: { fontSize: 11, fontFamily: fonts.displayBold, letterSpacing: 0.5 },
    classExtras: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 6 },
    classExtraChip: {
      flexDirection: "row",
      alignItems: "center",
      gap: 3,
      borderWidth: 1.5,
      borderColor: colors.borderStrong,
      backgroundColor: colors.surface,
      paddingHorizontal: 6,
      paddingVertical: 3,
    },
    classExtraText: {
      fontSize: 11,
      color: colors.onSurface,
      fontFamily: fonts.displayBold,
      letterSpacing: 0.5,
    },

    // Roll step
    rollGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginTop: 8 },
    rollDie: {
      width: 60,
      height: 60,
      borderWidth: 2.5,
      alignItems: "center",
      justifyContent: "center",
    },
    rollDieText: {
      fontSize: 22,
      color: colors.onSurface,
      fontFamily: fonts.displayBold,
    },
    rerollBtn: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 6,
      borderWidth: 2,
      paddingVertical: 12,
      marginTop: 12,
    },
    rerollText: {
      fontSize: 14,
      color: colors.onSurface,
      fontFamily: fonts.displayBold,
      letterSpacing: 1,
    },

    // Assign step
    assignPoolCard: {
      borderWidth: 2,
      borderColor: colors.borderStrong,
      backgroundColor: colors.surfaceSecondary,
      padding: 10,
      gap: 8,
    },
    assignPoolHead: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
    },
    assignPoolLabel: {
      fontSize: 12,
      color: colors.onSurface,
      fontFamily: fonts.displayBold,
      letterSpacing: 1.5,
    },
    assignPoolCount: {
      fontSize: 12,
      color: colors.muted,
      fontFamily: fonts.displayBold,
    },
    assignPoolGrid: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 6,
      justifyContent: "center",
    },
    poolDie: {
      width: 44,
      height: 44,
      alignItems: "center",
      justifyContent: "center",
    },
    poolDieText: {
      fontSize: 17,
      fontFamily: fonts.displayBold,
    },
    rerollSmall: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 4,
      borderWidth: 1.5,
      paddingVertical: 6,
      paddingHorizontal: 10,
    },
    rerollSmallText: {
      fontSize: 11,
      color: colors.onSurface,
      fontFamily: fonts.displayBold,
      letterSpacing: 0.8,
    },
    assignActionRow: {
      flexDirection: "row",
      gap: 6,
      justifyContent: "center",
      marginTop: 2,
    },
    autoFillBtn: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 4,
      borderWidth: 1.5,
      paddingVertical: 6,
      paddingHorizontal: 10,
    },
    autoFillText: {
      fontSize: 11,
      fontFamily: fonts.displayBold,
      letterSpacing: 0.8,
    },

    statSection: { gap: 8 },
    statSectionTitle: {
      fontSize: 14,
      color: colors.onSurface,
      fontFamily: fonts.displayBold,
      letterSpacing: 2,
      borderBottomWidth: 2,
      borderBottomColor: colors.divider,
      paddingBottom: 4,
    },
    statGrid: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
    slot: {
      minWidth: 96,
      flexBasis: "31%",
      flexGrow: 1,
      paddingVertical: 8,
      paddingHorizontal: 6,
      alignItems: "center",
      justifyContent: "center",
      minHeight: 60,
    },
    slotLabel: {
      fontSize: 10,
      fontFamily: fonts.displayBold,
      letterSpacing: 0.8,
      marginBottom: 2,
      textAlign: "center",
    },
    slotValue: {
      fontSize: 22,
      color: colors.onSurface,
      fontFamily: fonts.displayBold,
    },

    // Finalize
    finalCard: {
      borderWidth: 2.5,
      borderColor: colors.borderStrong,
      backgroundColor: colors.surfaceSecondary,
      padding: 14,
      gap: 12,
    },
    finalLabel: {
      fontSize: 12,
      color: colors.muted,
      fontFamily: fonts.displayBold,
      letterSpacing: 1.5,
    },
    nameInput: {
      borderWidth: 2,
      borderColor: colors.borderStrong,
      backgroundColor: colors.surface,
      padding: 12,
      fontSize: 18,
      color: colors.onSurface,
      fontFamily: fonts.displayBold,
    },
    finalSummary: { gap: 8, marginTop: 4 },
    summaryRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
    },
    summaryLabel: {
      fontSize: 12,
      color: colors.muted,
      fontFamily: fonts.displayBold,
      letterSpacing: 1,
      width: 70,
    },
    summaryValue: {
      flex: 1,
      fontSize: 14,
      color: colors.onSurface,
      fontFamily: fonts.display,
    },

    // Footer
    footer: {
      flexDirection: "row",
      gap: 10,
      paddingHorizontal: 16,
      paddingTop: 10,
      borderTopWidth: 3,
      borderTopColor: colors.borderStrong,
      backgroundColor: colors.surfaceSecondary,
    },
    footerBtn: {
      flex: 1,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 6,
      borderWidth: 2.5,
      paddingVertical: 12,
    },
    footerBack: { flex: 0.7 },
    footerBtnText: {
      fontSize: 14,
      fontFamily: fonts.displayBold,
      letterSpacing: 1,
    },
  });
