import { Pressable, View } from "react-native";
import { useTranslation } from "react-i18next";

import { Text } from "@/src/components/react-native-reusables/text";
import { cn } from "@/lib/utils";
import { DEFAULT_INTERACTIVE_HIT_SLOP } from "@/src/lib/accessibility";

export const MOOD_SCALE_MIN = 1;
export const MOOD_SCALE_MAX = 5;

interface MoodScaleProps {
  value: number | null;
  onChange: (value: number) => void;
}

export interface ScaleStep {
  score: number;
  emoji: string;
  selectedClass: string;
  unselectedClass: string;
  a11yKey: string;
}

export const STEPS: ScaleStep[] = [
  {
    score: 1,
    emoji: "😭",
    selectedClass: "bg-red-500 border-red-600",
    unselectedClass: "border-red-300 dark:border-red-700",
    a11yKey: "mood:scale.steps.1",
  },
  {
    score: 2,
    emoji: "🙁",
    selectedClass: "bg-orange-500 border-orange-600",
    unselectedClass: "border-orange-300 dark:border-orange-700",
    a11yKey: "mood:scale.steps.2",
  },
  {
    score: 3,
    emoji: "😐",
    selectedClass: "bg-yellow-400 border-yellow-500",
    unselectedClass: "border-yellow-300 dark:border-yellow-700",
    a11yKey: "mood:scale.steps.3",
  },
  {
    score: 4,
    emoji: "😊",
    selectedClass: "bg-lime-500 border-lime-600",
    unselectedClass: "border-lime-300 dark:border-lime-700",
    a11yKey: "mood:scale.steps.4",
  },
  {
    score: 5,
    emoji: "😁",
    selectedClass: "bg-green-500 border-green-600",
    unselectedClass: "border-green-300 dark:border-green-700",
    a11yKey: "mood:scale.steps.5",
  },
];

export const MOOD_EMOJI_BY_SCORE: Record<number, string> = STEPS.reduce(
  (acc, step) => {
    acc[step.score] = step.emoji;
    return acc;
  },
  {} as Record<number, string>,
);

export function MoodScale({ value, onChange }: MoodScaleProps) {
  const { t } = useTranslation();

  return (
    <View className="flex-row flex-wrap gap-2">
      {STEPS.map((step) => {
        const selected = value === step.score;
        const label = t(step.a11yKey);
        return (
          <Pressable
            key={step.score}
            accessibilityLabel={label}
            accessibilityRole="button"
            accessibilityState={{ selected }}
            hitSlop={DEFAULT_INTERACTIVE_HIT_SLOP}
            onPress={() => onChange(step.score)}
            className={cn(
              "min-w-14 flex-1 basis-14 items-center justify-center gap-1 rounded-2xl border-2 px-2 py-3",
              selected ? step.selectedClass : `bg-card ${step.unselectedClass}`,
            )}
            role="button"
          >
            <Text className="text-2xl">{step.emoji}</Text>
            <Text
              className={cn(
                "text-xs font-semibold",
                selected ? "text-white" : "text-muted-foreground",
              )}
            >
              {step.score}
            </Text>
            <Text
              className={cn(
                "text-[10.5px] leading-tight",
                selected ? "text-white/90" : "text-muted-foreground",
              )}
              numberOfLines={1}
            >
              {t(`mood:scale.shortLabels.${step.score}`)}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}
