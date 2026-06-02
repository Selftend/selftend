import { useTranslation } from "react-i18next";
import { Pressable, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";

import { Text } from "@/src/components/react-native-reusables/text";
import { cn } from "@/lib/utils";

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

export const STEPS: ScaleStep[] = [
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

  return (
    <View className={cn("flex-row", compact ? "gap-1.5" : "gap-2.5")}>
      {STEPS.map((step) => {
        const selected = value === step.score;
        const label = t(`checkin.scaleLabels.${step.score}`);
        return (
          <Pressable
            key={step.score}
            accessibilityRole="button"
            accessibilityLabel={label}
            accessibilityState={{ selected }}
            onPress={() => onChange(step.score)}
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
