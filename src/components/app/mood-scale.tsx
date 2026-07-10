import { useTranslation } from "react-i18next";
import { Pressable, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";

import { Text } from "@/src/components/react-native-reusables/text";
import { cn } from "@/lib/utils";
import { useRovingFocus } from "@/src/lib/roving-focus";

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
              selected ? "border-2 border-[hsl(var(--act))]" : "border-border bg-card",
            )}
          >
            {selected ? (
              <LinearGradient
                colors={["hsla(160, 46%, 38%, 0.10)", "hsla(160, 46%, 38%, 0.04)"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 0, y: 1 }}
                style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0 }}
              />
            ) : null}
            <Text className={cn("leading-none", compact ? "text-xl" : "text-3xl")}>
              {step.emoji}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}
