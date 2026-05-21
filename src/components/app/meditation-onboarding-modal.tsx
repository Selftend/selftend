import { ActivityIndicator, Modal, Pressable, ScrollView, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { OnboardingIllustration } from "@/src/components/app/onboarding-illustration";
import { Button } from "@/src/components/react-native-reusables/button";
import { Card, CardContent, CardTitle } from "@/src/components/react-native-reusables/card";
import { Input } from "@/src/components/react-native-reusables/input";
import { Switch } from "@/src/components/react-native-reusables/switch";
import { Text } from "@/src/components/react-native-reusables/text";
import { cn } from "@/lib/utils";
import { suggestStageFromAssessment } from "@/src/features/meditation/stages";
import type { StageNumber } from "@/src/features/meditation/types";
import { useReduceMotionEnabled } from "@/src/lib/accessibility";

type Step = "welcome" | "attention" | "assessment" | "gardener" | "commit";

const STEP_ORDER: Step[] = ["welcome", "attention", "assessment", "gardener", "commit"];

const DURATIONS: number[] = [10, 15, 20, 30];

const STAGE_OPTIONS: StageNumber[] = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

const meditationOnboardingImage = require("../../../assets/images/onboarding/mind_illuminated_attention_training.png");

export interface MeditationOnboardingResult {
  assessedStage: StageNumber;
  preferredDurationMinutes: number;
  preferredTimeOfDay: string;
  remindersEnabled: boolean;
}

interface Props {
  visible: boolean;
  isPending?: boolean;
  errorMessage?: string;
  onComplete: (result: MeditationOnboardingResult) => void;
  onDismiss?: () => void;
}

interface AssessmentAnswers {
  hasDailyHabit: boolean | null;
  breathFocusLength: "seconds" | "aboutAMinute" | "severalMinutes" | "continuously" | null;
  fallsAsleep: boolean | null;
  catchesDistractionEarly: boolean | null;
  extendedNoThoughts: boolean | null;
}

const EMPTY_ANSWERS: AssessmentAnswers = {
  hasDailyHabit: null,
  breathFocusLength: null,
  fallsAsleep: null,
  catchesDistractionEarly: null,
  extendedNoThoughts: null,
};

export function MeditationOnboarding({
  visible,
  isPending = false,
  errorMessage,
  onComplete,
  onDismiss,
}: Props) {
  const { t } = useTranslation("meditation");
  const reduceMotionEnabled = useReduceMotionEnabled();

  const [step, setStep] = useState<Step>("welcome");
  const [answers, setAnswers] = useState<AssessmentAnswers>(EMPTY_ANSWERS);
  const [timeOfDay, setTimeOfDay] = useState("07:00");
  const [duration, setDuration] = useState<number>(15);
  const [remindersEnabled, setRemindersEnabled] = useState(false);
  const [selectedStage, setSelectedStage] = useState<StageNumber>(1);

  const assessedStage = suggestStageFromAssessment({
    hasDailyHabit: answers.hasDailyHabit ?? false,
    breathFocusLength: answers.breathFocusLength ?? "seconds",
    fallsAsleep: answers.fallsAsleep ?? false,
    catchesDistractionEarly: answers.catchesDistractionEarly ?? false,
    extendedNoThoughts: answers.extendedNoThoughts ?? false,
  });

  // Sync the picker default with the assessment whenever it changes.
  useEffect(() => {
    setSelectedStage(assessedStage);
  }, [assessedStage]);

  const stepIndex = STEP_ORDER.indexOf(step);

  function goNext() {
    if (stepIndex < STEP_ORDER.length - 1) setStep(STEP_ORDER[stepIndex + 1]);
  }
  function goBack() {
    if (stepIndex > 0) setStep(STEP_ORDER[stepIndex - 1]);
  }

  function handleFinish() {
    onComplete({
      assessedStage: selectedStage,
      preferredDurationMinutes: duration,
      preferredTimeOfDay: timeOfDay,
      remindersEnabled,
    });
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
                <OnboardingIllustration
                  accessibilityLabel={t("onboarding.welcome.title")}
                  source={meditationOnboardingImage}
                />
                <Text variant="h2" className="text-center">
                  {t("onboarding.welcome.title")}
                </Text>
                <Text variant="muted" className="text-center">
                  {t("onboarding.welcome.subtitle")}
                </Text>
              </View>
              <Card>
                <CardContent className="gap-3 pt-6">
                  <Text className="text-center">{t("onboarding.welcome.body")}</Text>
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

          {step === "attention" ? (
            <View className="gap-6">
              <View className="gap-3">
                <Text variant="h2" className="text-center">
                  {t("onboarding.attention.title")}
                </Text>
                <Text variant="muted" className="text-center">
                  {t("onboarding.attention.subtitle")}
                </Text>
              </View>
              <Card className="border-primary/30 bg-primary/5">
                <CardContent className="gap-2 pt-6">
                  <CardTitle>{t("onboarding.attention.attentionTitle")}</CardTitle>
                  <Text variant="muted">{t("onboarding.attention.attentionBody")}</Text>
                </CardContent>
              </Card>
              <Card className="border-be/30 bg-be/5">
                <CardContent className="gap-2 pt-6">
                  <CardTitle>{t("onboarding.attention.awarenessTitle")}</CardTitle>
                  <Text variant="muted">{t("onboarding.attention.awarenessBody")}</Text>
                </CardContent>
              </Card>
              <View className="gap-3">
                <Button onPress={goNext}>
                  <Text>{t("onboarding.attention.continue")}</Text>
                </Button>
                <Button onPress={goBack} variant="ghost">
                  <Text>{t("onboarding.back")}</Text>
                </Button>
              </View>
            </View>
          ) : null}

          {step === "assessment" ? (
            <View className="gap-6">
              <View className="gap-3">
                <Text variant="h2" className="text-center">
                  {t("onboarding.assessment.title")}
                </Text>
                <Text variant="muted" className="text-center">
                  {t("onboarding.assessment.subtitle")}
                </Text>
              </View>

              <YesNoQuestion
                question={t("onboarding.assessment.habitQuestion")}
                yesLabel={t("onboarding.assessment.habitYes")}
                noLabel={t("onboarding.assessment.habitNo")}
                value={answers.hasDailyHabit}
                onChange={(v) => setAnswers((prev) => ({ ...prev, hasDailyHabit: v }))}
              />

              <ChoiceQuestion
                question={t("onboarding.assessment.lengthQuestion")}
                options={[
                  { value: "seconds", label: t("onboarding.assessment.lengthSeconds") },
                  { value: "aboutAMinute", label: t("onboarding.assessment.lengthAboutAMinute") },
                  {
                    value: "severalMinutes",
                    label: t("onboarding.assessment.lengthSeveralMinutes"),
                  },
                  { value: "continuously", label: t("onboarding.assessment.lengthContinuously") },
                ]}
                value={answers.breathFocusLength}
                onChange={(v) =>
                  setAnswers((prev) => ({
                    ...prev,
                    breathFocusLength: v as AssessmentAnswers["breathFocusLength"],
                  }))
                }
              />

              <YesNoQuestion
                question={t("onboarding.assessment.sleepQuestion")}
                yesLabel={t("onboarding.assessment.sleepYes")}
                noLabel={t("onboarding.assessment.sleepNo")}
                value={answers.fallsAsleep}
                onChange={(v) => setAnswers((prev) => ({ ...prev, fallsAsleep: v }))}
              />

              <YesNoQuestion
                question={t("onboarding.assessment.catchQuestion")}
                yesLabel={t("onboarding.assessment.catchYes")}
                noLabel={t("onboarding.assessment.catchNo")}
                value={answers.catchesDistractionEarly}
                onChange={(v) => setAnswers((prev) => ({ ...prev, catchesDistractionEarly: v }))}
              />

              <YesNoQuestion
                question={t("onboarding.assessment.noThoughtsQuestion")}
                yesLabel={t("onboarding.assessment.noThoughtsYes")}
                noLabel={t("onboarding.assessment.noThoughtsNo")}
                value={answers.extendedNoThoughts}
                onChange={(v) => setAnswers((prev) => ({ ...prev, extendedNoThoughts: v }))}
              />

              <View className="gap-3">
                <Button onPress={goNext}>
                  <Text>{t("onboarding.assessment.continue")}</Text>
                </Button>
                <Button onPress={goBack} variant="ghost">
                  <Text>{t("onboarding.back")}</Text>
                </Button>
              </View>
            </View>
          ) : null}

          {step === "gardener" ? (
            <View className="gap-6">
              <View className="gap-3">
                <Text variant="h2" className="text-center">
                  {t("onboarding.gardener.title")}
                </Text>
                <Text variant="muted" className="text-center">
                  {t("onboarding.gardener.subtitle")}
                </Text>
              </View>
              <Card>
                <CardContent className="gap-3 pt-6">
                  <Text>• {t("onboarding.gardener.patience")}</Text>
                  <Text>• {t("onboarding.gardener.intention")}</Text>
                  <Text>• {t("onboarding.gardener.everySit")}</Text>
                </CardContent>
              </Card>
              <View className="gap-3">
                <Button onPress={goNext}>
                  <Text>{t("onboarding.gardener.continue")}</Text>
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
                      {t("onboarding.commit.timeLabel")}
                    </Text>
                    <Input
                      value={timeOfDay}
                      onChangeText={setTimeOfDay}
                      placeholder={t("onboarding.commit.timePlaceholder")}
                      accessibilityLabel={t("onboarding.commit.timeLabel")}
                    />
                  </View>

                  <View className="gap-2">
                    <Text className="text-sm font-semibold">
                      {t("onboarding.commit.durationLabel")}
                    </Text>
                    <View className="flex-row flex-wrap gap-2">
                      {DURATIONS.map((min) => (
                        <Pressable
                          key={min}
                          accessibilityRole="button"
                          accessibilityState={{ selected: duration === min }}
                          onPress={() => setDuration(min)}
                          className={cn(
                            "rounded-full border px-4 py-2",
                            duration === min
                              ? "border-primary bg-primary"
                              : "border-border bg-card active:bg-muted",
                          )}
                        >
                          <Text
                            className={cn(
                              "text-sm font-semibold",
                              duration === min ? "text-primary-foreground" : "text-foreground",
                            )}
                          >
                            {t("duration.minutes", { count: min })}
                          </Text>
                        </Pressable>
                      ))}
                    </View>
                  </View>

                  <View className="gap-2">
                    <Text className="text-sm font-semibold">
                      {t("onboarding.commit.stageLabel")}
                    </Text>
                    <Text variant="muted" className="text-xs">
                      {t("onboarding.commit.stageHint", { stage: assessedStage })}
                    </Text>
                    <View className="flex-row flex-wrap gap-1.5">
                      {STAGE_OPTIONS.map((n) => (
                        <Pressable
                          key={n}
                          accessibilityRole="button"
                          accessibilityLabel={t("onboarding.commit.stageOption", { stage: n })}
                          accessibilityState={{ selected: selectedStage === n }}
                          onPress={() => setSelectedStage(n)}
                          className={cn(
                            "size-10 items-center justify-center rounded-md border",
                            selectedStage === n
                              ? "border-primary bg-primary"
                              : "border-border bg-card active:bg-muted",
                          )}
                        >
                          <Text
                            className={cn(
                              "text-sm font-bold",
                              selectedStage === n ? "text-primary-foreground" : "text-foreground",
                            )}
                          >
                            {n}
                          </Text>
                        </Pressable>
                      ))}
                    </View>
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

                  <Text variant="muted" className="text-center">
                    {t("onboarding.commit.startingAt", { stage: selectedStage })}
                  </Text>
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

interface YesNoProps {
  question: string;
  yesLabel: string;
  noLabel: string;
  value: boolean | null;
  onChange: (v: boolean) => void;
}

function YesNoQuestion({ question, yesLabel, noLabel, value, onChange }: YesNoProps) {
  return (
    <View className="gap-2">
      <Text className="text-sm font-semibold">{question}</Text>
      <View className="flex-row gap-2">
        <Choice selected={value === true} label={yesLabel} onPress={() => onChange(true)} />
        <Choice selected={value === false} label={noLabel} onPress={() => onChange(false)} />
      </View>
    </View>
  );
}

interface ChoiceQuestionProps<T extends string> {
  question: string;
  options: { value: T; label: string }[];
  value: T | null;
  onChange: (v: T) => void;
}

function ChoiceQuestion<T extends string>({
  question,
  options,
  value,
  onChange,
}: ChoiceQuestionProps<T>) {
  return (
    <View className="gap-2">
      <Text className="text-sm font-semibold">{question}</Text>
      <View className="flex-row flex-wrap gap-2">
        {options.map((opt) => (
          <Choice
            key={opt.value}
            selected={value === opt.value}
            label={opt.label}
            onPress={() => onChange(opt.value)}
          />
        ))}
      </View>
    </View>
  );
}

function Choice({
  selected,
  label,
  onPress,
}: {
  selected: boolean;
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      onPress={onPress}
      className={cn(
        "rounded-full border px-4 py-2",
        selected ? "border-primary bg-primary" : "border-border bg-card active:bg-muted",
      )}
    >
      <Text
        className={cn(
          "text-sm font-semibold",
          selected ? "text-primary-foreground" : "text-foreground",
        )}
      >
        {label}
      </Text>
    </Pressable>
  );
}
