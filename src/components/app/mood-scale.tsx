import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Animated, Easing, Platform, Pressable, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";

import { Text } from "@/src/components/react-native-reusables/text";
import { cn } from "@/lib/utils";
import { hueHsl } from "@/src/features/mindfulness/exercise-hue";
import { useReduceMotionEnabled } from "@/src/lib/accessibility";
import { useRovingFocus } from "@/src/lib/roving-focus";
import { useColorSchemeName } from "@/src/lib/color-scheme";

interface MoodScaleProps {
  value: number | null;
  onChange: (value: number) => void;
  /** Compact mode: smaller emoji + padding. Fits tight spaces. */
  compact?: boolean;
}

interface ScaleStep {
  score: number;
  emoji: string;
}

const STEPS: ScaleStep[] = [
  {
    score: 1,
    emoji: "😭",
  },
  {
    score: 2,
    emoji: "🙁",
  },
  {
    score: 3,
    emoji: "😐",
  },
  {
    score: 4,
    emoji: "😊",
  },
  {
    score: 5,
    emoji: "😁",
  },
];

export const MOOD_EMOJI_BY_SCORE: Record<number, string> = STEPS.reduce(
  (acc, step) => {
    acc[step.score] = step.emoji;
    return acc;
  },
  {} as Record<number, string>,
);

/**
 * The design grows the selected glyph 38px -> 46px on the form and 34px -> 40px on the
 * overview picker. Expressed as a scale so one transform covers both text sizes.
 */
const SELECTED_SCALE = 46 / 38;
const SELECTED_SCALE_COMPACT = 40 / 34;
const SCALE_DURATION_MS = 150;

/**
 * The one animation that survives the redesign (#740, decided on #716).
 *
 * The rule it comes from: if a transition's reduce-motion fallback is as good as the
 * animated version, ship the fallback for everyone. This one is the exception only
 * because it is purely decorative - `mood-scale.tsx` already confirms selection three
 * non-moving ways (border weight, border hue, gradient fill) plus `aria-checked`, so
 * under reduced motion there is nothing for a substitute to replace and the glyph simply
 * arrives at its size.
 *
 * Two constraints, both load-bearing:
 *
 * - **The glyph scales, not the `Pressable`.** The steps are `flex-1` siblings, so
 *   scaling the pressable would reflow the whole row around the one the user just picked.
 * - **No overshoot.** `Easing.out(Easing.quad)` approaches the target from below and stops;
 *   a spring would exceed it and the pressable's `overflow-hidden` would clip the peak.
 */
function MoodGlyph({
  emoji,
  selected,
  compact,
}: {
  emoji: string;
  selected: boolean;
  compact: boolean;
}) {
  const reduceMotion = useReduceMotionEnabled();
  const target = selected ? (compact ? SELECTED_SCALE_COMPACT : SELECTED_SCALE) : 1;
  // Start AT the target rather than animating on mount: an edit form hydrating a saved
  // score would otherwise play a selection the user did not just make.
  const [scale] = useState(() => new Animated.Value(target));
  const settledRef = useRef(false);

  useEffect(() => {
    if (!settledRef.current) {
      settledRef.current = true;
      return;
    }
    if (reduceMotion) {
      scale.setValue(target);
      return;
    }
    Animated.timing(scale, {
      toValue: target,
      duration: SCALE_DURATION_MS,
      easing: Easing.out(Easing.quad),
      useNativeDriver: Platform.OS !== "web",
    }).start();
  }, [target, reduceMotion, scale]);

  return (
    <Animated.View testID="mood-glyph" style={{ transform: [{ scale }] }}>
      <Text className={cn("leading-none", compact ? "text-xl" : "text-3xl")}>{emoji}</Text>
    </Animated.View>
  );
}

export function MoodScale({ value, onChange, compact = false }: MoodScaleProps) {
  const { t } = useTranslation("mood");
  const isDark = useColorSchemeName() === "dark";
  const selectedIndex = STEPS.findIndex((step) => step.score === value);
  const roving = useRovingFocus({
    count: STEPS.length,
    // No selection yet: treat the first step as active so the group stays tab-reachable.
    activeIndex: selectedIndex < 0 ? 0 : selectedIndex,
    onActivate: (index) => onChange(STEPS[index].score),
  });

  return (
    <View
      accessibilityLabel={t("checkin.title")}
      accessibilityRole="radiogroup"
      className={cn("flex-row", compact ? "gap-1.5" : "gap-2.5")}
      role="radiogroup"
    >
      {STEPS.map((step, index) => {
        const selected = value === step.score;
        const label = t(`checkin.scaleLabels.${step.score}`);
        return (
          <Pressable
            key={step.score}
            accessibilityRole="radio"
            accessibilityLabel={label}
            aria-checked={selected}
            role="radio"
            onPress={() => onChange(step.score)}
            {...roving.getItemProps(index, () => onChange(step.score))}
            className={cn(
              "flex-1 items-center overflow-hidden rounded-2xl border",
              compact ? "px-1 py-2" : "px-1.5 py-3.5",
              selected ? "border-2 border-act" : "border-border bg-card",
            )}
          >
            {selected ? (
              <LinearGradient
                colors={[hueHsl("act", isDark, 0.1), hueHsl("act", isDark, 0.04)]}
                start={{ x: 0, y: 0 }}
                end={{ x: 0, y: 1 }}
                style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0 }}
              />
            ) : null}
            <MoodGlyph emoji={step.emoji} selected={selected} compact={compact} />
          </Pressable>
        );
      })}
    </View>
  );
}
