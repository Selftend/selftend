import { Modal, Pressable, ScrollView, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useState } from "react";
import { useTranslation } from "react-i18next";

import { Button } from "@/src/components/react-native-reusables/button";
import { Card, CardContent, CardTitle } from "@/src/components/react-native-reusables/card";
import { Text } from "@/src/components/react-native-reusables/text";
import { cn } from "@/lib/utils";
import type { GratitudeLevel } from "@/src/features/modules/types";
import { useReduceMotionEnabled } from "@/src/lib/accessibility";

type Step = "welcome" | "levels" | "frequency" | "pick";

const STEP_ORDER: Step[] = ["welcome", "levels", "frequency", "pick"];

const LEVELS: GratitudeLevel[] = [1, 2, 3];

export interface GratitudeOnboardingResult {
  defaultLevel: GratitudeLevel;
}

interface Props {
  visible: boolean;
  isPending?: boolean;
  errorMessage?: string;
  onComplete: (result: GratitudeOnboardingResult) => void;
  onDismiss?: () => void;
}

export function GratitudeOnboarding({
  visible,
  isPending = false,
  errorMessage,
  onComplete,
  onDismiss,
}: Props) {
  const { t } = useTranslation("gratitude");
  const reduceMotionEnabled = useReduceMotionEnabled();

  const [step, setStep] = useState<Step>("welcome");
  const [selectedLevel, setSelectedLevel] = useState<GratitudeLevel>(1);

  const stepIndex = STEP_ORDER.indexOf(step);

  function goNext() {
    if (stepIndex < STEP_ORDER.length - 1) setStep(STEP_ORDER[stepIndex + 1]);
  }
  function goBack() {
    if (stepIndex > 0) setStep(STEP_ORDER[stepIndex - 1]);
  }
  function handleFinish() {
    onComplete({ defaultLevel: selectedLevel });
  }

  return (
    <Modal
      animationType={reduceMotionEnabled ? "none" : "slide"}
      onRequestClose={onDismiss ?? (() => undefined)}
      visible={visible}
    >
      <SafeAreaView className="flex-1 bg-background">
        <ScrollView contentContainerClassName="gap-8 p-6 pb-12">
          {step === "welcome" ? (
            <View className="gap-6">
              <View className="items-center gap-3">
                <Text variant="h2" className="text-center">
                  {t("onboarding.welcome.title")}
                </Text>
                <Text variant="muted" className="text-center">
                  {t("onboarding.welcome.subtitle")}
                </Text>
              </View>
              <Card className="border-primary/30 bg-primary/5">
                <CardContent className="gap-3 pt-6">
                  <Text className="font-semibold">{t("onboarding.welcome.scienceTitle")}</Text>
                  <Text variant="muted">{t("onboarding.welcome.scienceBody")}</Text>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="gap-3 pt-6">
                  <Text className="font-semibold">{t("onboarding.welcome.antidoteTitle")}</Text>
                  <Text variant="muted">{t("onboarding.welcome.antidoteBody")}</Text>
                </CardContent>
              </Card>
              <Button onPress={goNext}>
                <Text>{t("onboarding.welcome.continue")}</Text>
              </Button>
              {onDismiss ? (
                <Button onPress={onDismiss} variant="ghost">
                  <Text>{t("onboarding.skip")}</Text>
                </Button>
              ) : null}
            </View>
          ) : null}

          {step === "levels" ? (
            <View className="gap-6">
              <View className="gap-3">
                <Text variant="h2" className="text-center">
                  {t("onboarding.levels.title")}
                </Text>
                <Text variant="muted" className="text-center">
                  {t("onboarding.levels.subtitle")}
                </Text>
              </View>
              <Card className="border-border">
                <CardContent className="gap-2 pt-6">
                  <CardTitle>{t("onboarding.levels.level1Title")}</CardTitle>
                  <Text variant="muted">{t("onboarding.levels.level1Body")}</Text>
                </CardContent>
              </Card>
              <Card className="border-border">
                <CardContent className="gap-2 pt-6">
                  <CardTitle>{t("onboarding.levels.level2Title")}</CardTitle>
                  <Text variant="muted">{t("onboarding.levels.level2Body")}</Text>
                </CardContent>
              </Card>
              <Card className="border-border">
                <CardContent className="gap-2 pt-6">
                  <CardTitle>{t("onboarding.levels.level3Title")}</CardTitle>
                  <Text variant="muted">{t("onboarding.levels.level3Body")}</Text>
                </CardContent>
              </Card>
              <View className="gap-3">
                <Button onPress={goNext}>
                  <Text>{t("onboarding.levels.continue")}</Text>
                </Button>
                <Button onPress={goBack} variant="ghost">
                  <Text>{t("onboarding.back")}</Text>
                </Button>
              </View>
            </View>
          ) : null}

          {step === "frequency" ? (
            <View className="gap-6">
              <View className="gap-3">
                <Text variant="h2" className="text-center">
                  {t("onboarding.frequency.title")}
                </Text>
                <Text variant="muted" className="text-center">
                  {t("onboarding.frequency.subtitle")}
                </Text>
              </View>
              <Card className="border-primary/30 bg-primary/5">
                <CardContent className="gap-3 pt-6">
                  <Text>{t("onboarding.frequency.body")}</Text>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="gap-2 pt-6">
                  <Text variant="muted">{t("onboarding.frequency.note")}</Text>
                </CardContent>
              </Card>
              <View className="gap-3">
                <Button onPress={goNext}>
                  <Text>{t("onboarding.frequency.continue")}</Text>
                </Button>
                <Button onPress={goBack} variant="ghost">
                  <Text>{t("onboarding.back")}</Text>
                </Button>
              </View>
            </View>
          ) : null}

          {step === "pick" ? (
            <View className="gap-6">
              <View className="gap-3">
                <Text variant="h2" className="text-center">
                  {t("onboarding.pick.title")}
                </Text>
                <Text variant="muted" className="text-center">
                  {t("onboarding.pick.subtitle")}
                </Text>
              </View>

              <View className="gap-3">
                {LEVELS.map((level) => (
                  <Pressable
                    key={level}
                    accessibilityRole="button"
                    accessibilityState={{ selected: selectedLevel === level }}
                    onPress={() => setSelectedLevel(level)}
                    className={cn(
                      "rounded-2xl border p-4 gap-2",
                      selectedLevel === level
                        ? "border-primary bg-primary/5"
                        : "border-border bg-card active:bg-accent/40",
                    )}
                  >
                    <Text className="font-semibold">{t(`onboarding.pick.level${level}Title`)}</Text>
                    <Text variant="muted" className="text-sm">
                      {t(`onboarding.pick.level${level}Body`)}
                    </Text>
                  </Pressable>
                ))}
              </View>

              <View className="gap-3">
                <Button disabled={isPending} onPress={handleFinish}>
                  <Text>
                    {isPending ? t("onboarding.pick.saving") : t("onboarding.pick.finish")}
                  </Text>
                </Button>
                {errorMessage ? (
                  <Text className="text-sm text-destructive">{errorMessage}</Text>
                ) : null}
                <Button onPress={goBack} variant="ghost">
                  <Text>{t("onboarding.back")}</Text>
                </Button>
              </View>
            </View>
          ) : null}
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}
