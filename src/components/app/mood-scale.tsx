import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Animated, Easing, Platform, Pressable, View } from "react-native";

import { Text } from "@/src/components/react-native-reusables/text";
import { cn } from "@/lib/utils";
import { useReduceMotionEnabled } from "@/src/lib/accessibility";
import { useRovingFocus } from "@/src/lib/roving-focus";

interface MoodScaleProps {
  value: number | null;
  onChange: (value: number) => void;
  /** Compact mode: the overview picker's 34px glyphs; the form uses 38px. */
  compact?: boolean;
}

interface ScaleStep {
  score: number;
  emoji: string;
}

// The design's set (`2a`/`2b`), softer at the floor than the 😭 it replaces: an
// input scale whose worst option is loudly crying pre-judges the user's day.
const STEPS: ScaleStep[] = [
  {
    score: 1,
    emoji: "😞",
  },
  {
    score: 2,
    emoji: "😕",
  },
  {
    score: 3,
    emoji: "😐",
  },
  {
    score: 4,
    emoji: "🙂",
  },
  {
    score: 5,
    emoji: "😄",
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
 * because it is purely decorative - selection is already confirmed three non-moving
 * ways (full opacity against 0.32 siblings, the larger resting size, `aria-checked`),
 * so under reduced motion there is nothing for a substitute to replace and the glyph
 * simply arrives at its size.
 *
 * Two constraints, both load-bearing:
 *
 * - **The glyph scales, not the `Pressable`.** Scaling the pressable would reflow
 *   the whole row around the one the user just picked.
 * - **No overshoot.** `Easing.out(Easing.quad)` approaches the target from below and
 *   stops; a spring would exceed it and neighbouring glyphs would jostle at the peak.
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
      <Text className={cn("leading-none", compact ? "text-[34px]" : "text-[38px]")}>{emoji}</Text>
    </Animated.View>
  );
}

/**
 * The bare emoji scale (design `2a`/`2b`): no boxes, no card fill - the glyphs
 * ARE the control. State rides opacity: 0.72 resting when nothing is picked,
 * then 1 for the selection and 0.32 for its siblings, plus the size step above.
 * The radio semantics and roving focus are unchanged from the boxed version -
 * each glyph still carries its scale label as an accessible name.
 */
export function MoodScale({ value, onChange, compact = false }: MoodScaleProps) {
  const { t } = useTranslation("mood");
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
      className={cn("flex-row items-center justify-center", compact ? "gap-3.5" : "gap-4")}
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
              "items-center justify-center rounded-full p-1.5",
              value === null ? "opacity-70" : selected ? "opacity-100" : "opacity-30",
            )}
          >
            <MoodGlyph emoji={step.emoji} selected={selected} compact={compact} />
          </Pressable>
        );
      })}
    </View>
  );
}
