import { useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";

import { Icon } from "@/src/components/react-native-reusables/icon";
import { Text } from "@/src/components/react-native-reusables/text";
import { Textarea } from "@/src/components/react-native-reusables/textarea";
import type { MindfulnessExercise } from "@/src/constants/mindfulness";
import { exerciseHue } from "@/src/features/mindfulness/exercise-hue";
import { DEFAULT_INTERACTIVE_HIT_SLOP } from "@/src/lib/accessibility";
import { cn } from "@/lib/utils";

export const FEELINGS = ["calmer", "softer", "clearer", "present", "tender"] as const;

export interface CompletePayload {
  feeling: string | null;
  reflection: string;
}

interface MindfulnessCompleteProps {
  exercise: MindfulnessExercise;
  durationMinutes: number;
  isSaving: boolean;
  onSave: (payload: CompletePayload) => void;
  onSkip: () => void;
}

export function MindfulnessComplete({
  exercise,
  durationMinutes,
  isSaving,
  onSave,
  onSkip,
}: MindfulnessCompleteProps) {
  const { t } = useTranslation("cbt");
  const hue = exerciseHue(exercise.hue);
  const [feeling, setFeeling] = useState<string | null>(null);
  const [reflection, setReflection] = useState("");

  const title = t(`mindfulness.exercises.${exercise.slug}.title`);

  return (
    <SafeAreaView className="flex-1 bg-background">
      <ScrollView contentContainerClassName="grow p-6">
        <View className="gap-5">
          <View className="gap-2">
            <Text
              className={cn("text-[12px] font-bold uppercase tracking-[0.14em]", hue.classes.text)}
            >
              {title} · {t("mindfulness.minutes", { value: durationMinutes })}
            </Text>
            <Text variant="h1">{t("mindfulness.wellDone")}</Text>
            <Text variant="muted" className="max-w-[38ch]">
              {t("mindfulness.completeIntro")}
            </Text>
          </View>

          <View className="flex-row items-center justify-between rounded-xl border border-border bg-card px-4 py-3">
            <Text variant="muted" className="text-sm">
              {t("mindfulness.loggedJustNow")}
            </Text>
            <Text className="text-sm font-semibold">{durationMinutes}:00</Text>
          </View>

          <View className="gap-2">
            <Text className="text-sm font-medium">{t("mindfulness.feelingPrompt")}</Text>
            <View className="flex-row flex-wrap gap-2">
              {FEELINGS.map((f) => {
                const on = feeling === f;
                return (
                  <Pressable
                    key={f}
                    accessibilityRole="button"
                    accessibilityState={{ selected: on }}
                    hitSlop={DEFAULT_INTERACTIVE_HIT_SLOP}
                    onPress={() => setFeeling(on ? null : f)}
                    role="button"
                    className={cn(
                      "rounded-full border px-4 py-2",
                      on ? cn(hue.classes.chipBg, hue.classes.border) : "border-border bg-card",
                    )}
                  >
                    <Text className={cn("text-sm font-medium", on ? hue.classes.text : "")}>
                      {t(`mindfulness.feelings.${f}`)}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>

          <View className="gap-2">
            <Text className="text-sm font-medium">{t("mindfulness.rememberPrompt")}</Text>
            <Textarea
              accessibilityLabel={t("mindfulness.reflection")}
              onChangeText={setReflection}
              placeholder={t("mindfulness.reflectionPlaceholder")}
              value={reflection}
            />
          </View>

          <Pressable
            accessibilityRole="button"
            disabled={isSaving}
            hitSlop={DEFAULT_INTERACTIVE_HIT_SLOP}
            onPress={() => onSave({ feeling, reflection })}
            role="button"
            className={cn(
              "h-14 flex-row items-center justify-center gap-2 rounded-2xl active:opacity-90",
              hue.classes.fill,
            )}
          >
            {isSaving ? (
              <ActivityIndicator color="#ffffff" />
            ) : (
              <Icon name="check" className="text-white" size={20} />
            )}
            <Text className="text-base font-semibold text-white">{t("mindfulness.save")}</Text>
          </Pressable>

          <Pressable
            accessibilityRole="button"
            hitSlop={DEFAULT_INTERACTIVE_HIT_SLOP}
            onPress={onSkip}
            role="button"
            className="h-11 items-center justify-center"
          >
            <Text variant="muted" className="text-sm font-medium">
              {t("mindfulness.skipClose")}
            </Text>
          </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
