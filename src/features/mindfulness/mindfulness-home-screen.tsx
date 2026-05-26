import { router } from "expo-router";
import { useState } from "react";
import { Pressable, ScrollView, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { useTranslation } from "react-i18next";

import { Icon } from "@/src/components/react-native-reusables/icon";
import { Text } from "@/src/components/react-native-reusables/text";
import { ModuleHomeHeader } from "@/src/components/app/module-home-header";
import { MindfulnessOnboarding } from "@/src/components/app/mindfulness-onboarding-modal";
import { mindfulnessExercises } from "@/src/constants/mindfulness";
import type { MindfulnessExercise } from "@/src/constants/mindfulness";
import { exerciseHue, hueGradient } from "@/src/features/mindfulness/exercise-hue";
import { useAppColorScheme } from "@/src/lib/color-scheme";
import { DEFAULT_INTERACTIVE_HIT_SLOP } from "@/src/lib/accessibility";
import { cn } from "@/lib/utils";

export default function MindfulnessHomeScreen() {
  const { t } = useTranslation("cbt");
  const isDark = useAppColorScheme() === "dark";
  const [forceOnboarding, setForceOnboarding] = useState(false);

  const open = (slug: string) => router.push(`/tools/mindfulness/${slug}`);

  return (
    <>
      <MindfulnessOnboarding
        visible={forceOnboarding}
        onComplete={() => setForceOnboarding(false)}
        onDismiss={() => setForceOnboarding(false)}
      />
      <SafeAreaView className="flex-1 bg-background">
        <ScrollView contentContainerClassName="grow p-6">
          <View className="gap-6">
            <ModuleHomeHeader
              title={t("mindfulness.takeAMoment")}
              hue="mist"
              icon="air"
              description={t("mindfulness.description")}
              actions={[
                { type: "notifications", targetKey: "mindfulness" },
                { type: "info", onPress: () => setForceOnboarding(true) },
              ]}
              meta={
                <View className="flex-row flex-wrap items-center gap-x-4 gap-y-1">
                  <Text variant="muted" className="text-xs">
                    <Text className="text-xs font-bold text-mist">
                      {t("mindfulness.hero.practices", { count: mindfulnessExercises.length })}
                    </Text>
                  </Text>
                </View>
              }
            />

            <View className="gap-3">
              <Text className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                {t("mindfulness.allExercises")}
              </Text>
              <View className="flex-row flex-wrap gap-3">
                {mindfulnessExercises.map((ex) => (
                  <ExerciseTile
                    key={ex.slug}
                    exercise={ex}
                    isDark={isDark}
                    onPress={() => open(ex.slug)}
                  />
                ))}
              </View>
            </View>
          </View>
        </ScrollView>
      </SafeAreaView>
    </>
  );
}

interface ExerciseTileProps {
  exercise: MindfulnessExercise;
  isDark: boolean;
  onPress: () => void;
}

function ExerciseTile({ exercise, isDark, onPress }: ExerciseTileProps) {
  const { t } = useTranslation("cbt");
  const hue = exerciseHue(exercise.hue);
  const title = t(`mindfulness.exercises.${exercise.slug}.title`);
  const short = t(`mindfulness.exercises.${exercise.slug}.shortDescription`);
  const firstSentence = `${short.split(".")[0]}.`;

  return (
    <Pressable
      accessibilityHint={short}
      accessibilityLabel={title}
      accessibilityRole="button"
      hitSlop={DEFAULT_INTERACTIVE_HIT_SLOP}
      onPress={onPress}
      role="button"
      className={cn(
        "min-w-[150px] flex-1 basis-[45%] overflow-hidden rounded-2xl border bg-card p-4 active:opacity-90",
        hue.classes.border,
      )}
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
          height: 120,
          pointerEvents: "none",
        }}
      />
      <View className={cn("size-9 items-center justify-center rounded-lg", hue.classes.chipBg)}>
        <Icon name={exercise.icon} className={cn("size-5", hue.classes.text)} size={20} />
      </View>
      <Text className="mt-3 text-sm font-semibold">{title}</Text>
      <Text variant="muted" className="mt-1 text-xs leading-snug">
        {firstSentence}
      </Text>
    </Pressable>
  );
}
