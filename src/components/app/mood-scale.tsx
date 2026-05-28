import { useTranslation } from "react-i18next";
import { Pressable, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";

import { Text } from "@/src/components/react-native-reusables/text";
import { cn } from "@/lib/utils";

export const MOOD_SCALE_MIN = 1;
export const MOOD_SCALE_MAX = 5;

interface MoodScaleProps {
  value: number | null;
  onChange: (value: number) => void;
  /** Compact mode: smaller emoji + padding, no YOU pill. Fits tight spaces. */
  compact?: boolean;
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
            <Text
              className={cn(
                "mt-2 text-[12px] font-semibold",
                selected ? "text-[hsl(var(--act))]" : "text-muted-foreground",
              )}
            >
              {label}
            </Text>
            {selected && !compact ? (
              <View
                accessibilityElementsHidden
                importantForAccessibility="no"
                className="absolute -right-2 -top-2.5 rounded-full bg-[hsl(var(--act))] px-2 py-[3px]"
              >
                <Text className="text-[10px] font-bold uppercase tracking-wider text-white">
                  {t("checkin.youPill")}
                </Text>
              </View>
            ) : null}
          </Pressable>
        );
      })}
    </View>
  );
}
