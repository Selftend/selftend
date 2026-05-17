import { ActivityIndicator, Modal, Pressable, ScrollView, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/src/components/react-native-reusables/button";
import { Card, CardContent, CardTitle } from "@/src/components/react-native-reusables/card";
import { Switch } from "@/src/components/react-native-reusables/switch";
import { Input } from "@/src/components/react-native-reusables/input";
import { Text } from "@/src/components/react-native-reusables/text";
import { OnboardingIllustration } from "@/src/components/app/onboarding-illustration";
import { cn } from "@/lib/utils";
import {
  ACT_CONCERNS,
  ACT_LIFE_DOMAINS,
  RECOMMENDED_PRINCIPLE,
  type ACTConcern,
  type ACTLifeDomain,
  type ACTPrinciple,
} from "@/src/features/act/types";
import { useReduceMotionEnabled } from "@/src/lib/accessibility";

const actOnboardingImage = require("../../../assets/images/onboarding/brain-heart-badge.png");

// ─── Info modal (single page) ─────────────────────────────────────────────────

interface InfoProps {
  visible: boolean;
  isPending?: boolean;
  errorMessage?: string;
  onComplete: () => void;
  onDismiss?: () => void;
}

export function ActInfo({
  visible,
  isPending = false,
  errorMessage,
  onComplete,
  onDismiss,
}: InfoProps) {
  const { t } = useTranslation("act");
  const reduceMotionEnabled = useReduceMotionEnabled();

  return (
    <Modal
      animationType={reduceMotionEnabled ? "none" : "slide"}
      onRequestClose={onDismiss ?? (() => undefined)}
      visible={visible}
    >
      <SafeAreaView className="flex-1 bg-background">
        <ScrollView contentContainerClassName="gap-8 p-6 pb-12">
          <View className="gap-6">
            <View className="items-center gap-3">
              <OnboardingIllustration
                accessibilityLabel={t("onboarding.welcome.title")}
                source={actOnboardingImage}
              />
              <Text variant="h2" className="text-center">
                {t("onboarding.welcome.title")}
              </Text>
              <Text variant="muted" className="text-center">
                {t("onboarding.welcome.subtitle")}
              </Text>
            </View>

            <Card className="border-destructive/30 bg-destructive/5">
              <CardContent className="gap-3 pt-6">
                <CardTitle>{t("onboarding.welcome.controlParadox")}</CardTitle>
                <Text variant="muted">{t("onboarding.welcome.controlParadoxBody")}</Text>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="gap-2 pt-6">
                <CardTitle className="mb-1">{t("onboarding.welcome.mythsTitle")}</CardTitle>
                {(["myth1", "myth2", "myth3", "myth4"] as const).map((key, i) => (
                  <Text key={key} variant="muted">
                    {`${i + 1}. ${t(`onboarding.welcome.${key}`)}`}
                  </Text>
                ))}
              </CardContent>
            </Card>

            <Text variant="muted" className="text-center">
              {t("onboarding.welcome.body")}
            </Text>

            <Card className="border-act/30 bg-act/5">
              <CardContent className="gap-2 pt-6">
                <CardTitle>{t("onboarding.model.title")}</CardTitle>
                <Text variant="muted">{t("onboarding.model.subtitle")}</Text>
                <Text className="mt-1 font-semibold">{t("onboarding.model.accept")}</Text>
                <Text className="font-semibold">{t("onboarding.model.connect")}</Text>
                <Text className="font-semibold">{t("onboarding.model.take")}</Text>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="gap-1 pt-6">
                <Text className="text-center text-base font-semibold">
                  {t("onboarding.model.formula")}
                </Text>
                <Text variant="muted" className="text-center text-sm">
                  {t("onboarding.model.formulaBody")}
                </Text>
              </CardContent>
            </Card>

            <Button disabled={isPending} onPress={onComplete}>
              {isPending ? <ActivityIndicator color="#ffffff" /> : null}
              <Text>{isPending ? t("onboarding.commit.saving") : t("onboarding.info.gotIt")}</Text>
            </Button>
            {errorMessage ? <Text className="text-sm text-destructive">{errorMessage}</Text> : null}
            <Text className="text-center text-xs text-muted-foreground">
              {t("onboarding.info.attribution")}
            </Text>
            {onDismiss ? (
              <Button onPress={onDismiss} variant="ghost">
                <Text>{t("onboarding.skip")}</Text>
              </Button>
            ) : null}
          </View>
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}

// ─── Wizard (personalisation, 3 steps) ────────────────────────────────────────

type WizardStep = "concerns" | "bullsEye" | "commit";
const WIZARD_STEPS: WizardStep[] = ["concerns", "bullsEye", "commit"];

export interface ActWizardResult {
  primaryConcerns: ACTConcern[];
  startingPrinciple: ACTPrinciple;
  bullsEyeRatings: Record<ACTLifeDomain, number>;
  remindersEnabled: boolean;
  preferredCheckInTime: string;
}

/** @deprecated Use ActWizardResult */
export type ActOnboardingResult = ActWizardResult;

interface WizardProps {
  visible: boolean;
  isPending?: boolean;
  errorMessage?: string;
  onComplete: (result: ActWizardResult) => void;
  onDismiss?: () => void;
}

function derivePrinciple(concerns: ACTConcern[]): ACTPrinciple {
  if (concerns.length === 0) return "defusion";
  return RECOMMENDED_PRINCIPLE[concerns[0]];
}

export function ActWizard({
  visible,
  isPending = false,
  errorMessage,
  onComplete,
  onDismiss,
}: WizardProps) {
  const { t } = useTranslation("act");
  const reduceMotionEnabled = useReduceMotionEnabled();

  const [step, setStep] = useState<WizardStep>("concerns");
  const [selectedConcerns, setSelectedConcerns] = useState<ACTConcern[]>([]);
  const [bullsEyeRatings, setBullsEyeRatings] = useState<Record<ACTLifeDomain, number>>({
    work: 5,
    leisure: 5,
    relationships: 5,
    personalGrowth: 5,
  });
  const [startingPrinciple, setStartingPrinciple] = useState<ACTPrinciple>("defusion");
  const [remindersEnabled, setRemindersEnabled] = useState(false);
  const [checkInTime, setCheckInTime] = useState("19:00");

  const stepIndex = WIZARD_STEPS.indexOf(step);

  function goNext() {
    if (step === "concerns") setStartingPrinciple(derivePrinciple(selectedConcerns));
    if (stepIndex < WIZARD_STEPS.length - 1) setStep(WIZARD_STEPS[stepIndex + 1]);
  }

  function goBack() {
    if (stepIndex > 0) setStep(WIZARD_STEPS[stepIndex - 1]);
  }

  function toggleConcern(concern: ACTConcern) {
    setSelectedConcerns((prev) =>
      prev.includes(concern) ? prev.filter((c) => c !== concern) : [...prev, concern],
    );
  }

  function setBullsEye(domain: ACTLifeDomain, rating: number) {
    setBullsEyeRatings((prev) => ({ ...prev, [domain]: rating }));
  }

  function handleFinish() {
    onComplete({
      primaryConcerns: selectedConcerns,
      startingPrinciple,
      bullsEyeRatings,
      remindersEnabled,
      preferredCheckInTime: checkInTime,
    });
  }

  const PRINCIPLES: ACTPrinciple[] = [
    "defusion",
    "expansion",
    "connection",
    "observingSelf",
    "values",
    "committedAction",
  ];

  return (
    <Modal
      animationType={reduceMotionEnabled ? "none" : "slide"}
      onRequestClose={onDismiss ?? (() => undefined)}
      visible={visible}
    >
      <SafeAreaView className="flex-1 bg-background">
        <ScrollView contentContainerClassName="gap-8 p-6 pb-12">
          {step === "concerns" ? (
            <View className="gap-6">
              <View className="gap-3">
                <Text variant="h2" className="text-center">
                  {t("onboarding.concerns.title")}
                </Text>
                <Text variant="muted" className="text-center">
                  {t("onboarding.concerns.subtitle")}
                </Text>
              </View>

              <View className="flex-row flex-wrap gap-2">
                {ACT_CONCERNS.map((concern) => {
                  const selected = selectedConcerns.includes(concern);
                  return (
                    <Pressable
                      key={concern}
                      accessibilityRole="checkbox"
                      accessibilityState={{ checked: selected }}
                      onPress={() => toggleConcern(concern)}
                      className={cn(
                        "rounded-full border px-4 py-2",
                        selected ? "border-act bg-act" : "border-border bg-card active:bg-muted",
                      )}
                    >
                      <Text
                        className={cn(
                          "text-sm font-semibold",
                          selected ? "text-white" : "text-foreground",
                        )}
                      >
                        {t(`onboarding.concerns.${concern}`)}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>

              <View className="gap-3">
                <Button onPress={goNext}>
                  <Text>{t("onboarding.concerns.continue")}</Text>
                </Button>
                {onDismiss ? (
                  <Button onPress={onDismiss} variant="ghost">
                    <Text>{t("onboarding.skip")}</Text>
                  </Button>
                ) : null}
              </View>
            </View>
          ) : null}

          {step === "bullsEye" ? (
            <View className="gap-6">
              <View className="gap-3">
                <Text variant="h2" className="text-center">
                  {t("onboarding.bullsEye.title")}
                </Text>
                <Text variant="muted" className="text-center">
                  {t("onboarding.bullsEye.subtitle")}
                </Text>
              </View>

              {ACT_LIFE_DOMAINS.map((domain) => (
                <View key={domain} className="gap-2">
                  <Text className="text-sm font-semibold">
                    {t(`onboarding.bullsEye.${domain}`)} — {bullsEyeRatings[domain]}/10
                  </Text>
                  <View className="flex-row flex-wrap gap-1.5">
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => {
                      const selected = bullsEyeRatings[domain] === n;
                      return (
                        <Pressable
                          key={n}
                          accessibilityRole="button"
                          accessibilityLabel={`${n}`}
                          accessibilityState={{ selected }}
                          onPress={() => setBullsEye(domain, n)}
                          className={cn(
                            "size-9 items-center justify-center rounded-md border",
                            selected
                              ? "border-act bg-act"
                              : "border-border bg-card active:bg-muted",
                          )}
                        >
                          <Text
                            className={cn(
                              "text-sm font-bold",
                              selected ? "text-white" : "text-foreground",
                            )}
                          >
                            {n}
                          </Text>
                        </Pressable>
                      );
                    })}
                  </View>
                </View>
              ))}

              <View className="gap-3">
                <Button onPress={goNext}>
                  <Text>{t("onboarding.bullsEye.continue")}</Text>
                </Button>
                <Button onPress={goBack} variant="ghost">
                  <Text>{t("onboarding.back")}</Text>
                </Button>
              </View>
            </View>
          ) : null}

          {step === "commit" ? (
            <View className="gap-6">
              <View className="gap-3">
                <Text variant="h2" className="text-center">
                  {t("onboarding.commit.title")}
                </Text>
                <Text variant="muted" className="text-center">
                  {t("onboarding.commit.subtitle")}
                </Text>
              </View>

              <Card>
                <CardContent className="gap-4 pt-6">
                  <View className="gap-2">
                    <Text className="text-sm font-semibold">
                      {t("onboarding.commit.startingWith", {
                        principle: t(`principles.${startingPrinciple}.name`),
                      })}
                    </Text>
                    <Text variant="muted" className="text-xs">
                      {t("onboarding.commit.switchHint")}
                    </Text>
                    <View className="flex-row flex-wrap gap-1.5">
                      {PRINCIPLES.map((p) => {
                        const selected = startingPrinciple === p;
                        return (
                          <Pressable
                            key={p}
                            accessibilityRole="button"
                            accessibilityLabel={t(`principles.${p}.name`)}
                            accessibilityState={{ selected }}
                            onPress={() => setStartingPrinciple(p)}
                            className={cn(
                              "rounded-full border px-3 py-1.5",
                              selected
                                ? "border-act bg-act"
                                : "border-border bg-card active:bg-muted",
                            )}
                          >
                            <Text
                              className={cn(
                                "text-xs font-semibold",
                                selected ? "text-white" : "text-foreground",
                              )}
                            >
                              {t(`principles.${p}.name`)}
                            </Text>
                          </Pressable>
                        );
                      })}
                    </View>
                  </View>

                  <View className="gap-2">
                    <Text className="text-sm font-semibold">
                      {t("onboarding.commit.timeLabel")}
                    </Text>
                    <Input
                      value={checkInTime}
                      onChangeText={setCheckInTime}
                      placeholder={t("onboarding.commit.timePlaceholder")}
                      accessibilityLabel={t("onboarding.commit.timeLabel")}
                    />
                  </View>

                  <View className="flex-row items-center justify-between gap-3">
                    <View className="flex-1 gap-1">
                      <Text className="text-sm font-semibold">
                        {t("onboarding.commit.reminderLabel")}
                      </Text>
                      <Text variant="muted" className="text-xs">
                        {t("onboarding.commit.reminderHint")}
                      </Text>
                    </View>
                    <Switch
                      checked={remindersEnabled}
                      onCheckedChange={setRemindersEnabled}
                      accessibilityLabel={t("onboarding.commit.reminderLabel")}
                    />
                  </View>
                </CardContent>
              </Card>

              <View className="gap-3">
                <Button disabled={isPending} onPress={handleFinish}>
                  {isPending ? <ActivityIndicator color="#ffffff" /> : null}
                  <Text>
                    {isPending ? t("onboarding.commit.saving") : t("onboarding.commit.finish")}
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

/** @deprecated Use ActInfo for the auto-show onboarding and ActWizard for personalisation */
export const ActOnboarding = ActInfo;
