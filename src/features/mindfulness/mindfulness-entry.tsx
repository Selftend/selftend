import { Pressable, ScrollView, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { useTranslation } from "react-i18next";

import { Icon } from "@/src/components/react-native-reusables/icon";
import { Text } from "@/src/components/react-native-reusables/text";
import type { MindfulnessExercise } from "@/src/constants/mindfulness";
import { exerciseHue, hueGradient } from "@/src/features/mindfulness/exercise-hue";
import { useAppColorScheme } from "@/src/lib/color-scheme";
import { DEFAULT_INTERACTIVE_HIT_SLOP } from "@/src/lib/accessibility";
import { cn } from "@/lib/utils";

interface MindfulnessEntryProps {
  exercise: MindfulnessExercise;
  duration: number;
  onChangeDuration: (minutes: number) => void;
  onStart: () => void;
  onBack: () => void;
}

export function MindfulnessEntry({
  exercise,
  duration,
  onChangeDuration,
  onStart,
  onBack,
}: MindfulnessEntryProps) {
  const { t } = useTranslation("cbt");
  const isDark = useAppColorScheme() === "dark";
  const hue = exerciseHue(exercise.hue);
  const title = t(`mindfulness.exercises.${exercise.slug}.title`);
  const short = t(`mindfulness.exercises.${exercise.slug}.shortDescription`);
  const rawSteps = t(`mindfulness.exercises.${exercise.slug}.instructions`, {
    returnObjects: true,
  });
  const steps = Array.isArray(rawSteps) ? (rawSteps as string[]) : [];

  return (
    <SafeAreaView className="flex-1 bg-background">
      <View className="px-4 pt-2">
        <Pressable
          accessibilityRole="button"
          hitSlop={8}
          onPress={onBack}
          className="size-10 items-center justify-center -ml-2"
        >
          <Icon name="arrow-back" className="size-6 text-foreground" />
        </Pressable>
      </View>
      <ScrollView contentContainerClassName="grow px-6 pb-8">
        <View className="gap-6">
          <View
            className={cn("overflow-hidden rounded-2xl border bg-card p-6", hue.classes.border)}
          >
            <LinearGradient
              colors={hueGradient(exercise.hue, isDark)}
              start={{ x: 0, y: 0 }}
              end={{ x: 0, y: 1 }}
              locations={[0, 0.7]}
              style={{
                position: "absolute",
                left: 0,
                right: 0,
                top: 0,
                height: 180,
                pointerEvents: "none",
              }}
            />
            <View
              className={cn("size-11 items-center justify-center rounded-xl", hue.classes.chipBg)}
            >
              <Icon name={exercise.icon} className={cn("size-6", hue.classes.text)} />
            </View>
            <Text variant="h1" className="mt-4">
              {title}
            </Text>
            <Text variant="muted" className="mt-2 max-w-[34ch]">
              {short}
            </Text>
          </View>

          <View className="gap-3">
            <Text variant="h3">{t("mindfulness.howTo")}</Text>
            {steps.map((step, i) => (
              <View key={i} className="flex-row gap-4">
                <View
                  className={cn(
                    "size-7 items-center justify-center rounded-full",
                    hue.classes.chipBg,
                  )}
                >
                  <Text className={cn("text-xs font-bold", hue.classes.text)}>
                    {String(i + 1).padStart(2, "0")}
                  </Text>
                </View>
                <Text className="flex-1 leading-relaxed">{step}</Text>
              </View>
            ))}
          </View>

          <View className="gap-3">
            <Text variant="muted" className="text-[11px] font-semibold uppercase tracking-[0.14em]">
              {t("mindfulness.chooseDuration")}
            </Text>
            <View className="flex-row gap-3">
              {exercise.durations.map((d) => {
                const on = d === duration;
                return (
                  <Pressable
                    key={d}
                    accessibilityRole="button"
                    accessibilityState={{ selected: on }}
                    hitSlop={DEFAULT_INTERACTIVE_HIT_SLOP}
                    onPress={() => onChangeDuration(d)}
                    role="button"
                    className={cn(
                      "rounded-full border px-5 py-3",
                      on ? cn(hue.classes.fill, "border-transparent") : "border-border bg-card",
                    )}
                  >
                    <Text className={cn("text-sm font-semibold", on ? "text-white" : "")}>
                      {t("mindfulness.minutes", { value: d })}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>

          <Pressable
            accessibilityRole="button"
            hitSlop={DEFAULT_INTERACTIVE_HIT_SLOP}
            onPress={onStart}
            role="button"
            className={cn(
              "h-14 flex-row items-center justify-center gap-2 rounded-2xl active:opacity-90",
              hue.classes.fill,
            )}
          >
            <Icon name="play-arrow" className="text-white" size={20} />
            <Text className="text-base font-semibold text-white">
              {t("mindfulness.begin", { value: duration })}
            </Text>
          </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
