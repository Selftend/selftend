import { ActivityIndicator, Platform, Pressable, ScrollView, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { PressShieldModal } from "@/src/components/app/press-shield-modal";
import { OnboardingIllustration } from "@/src/components/app/onboarding-illustration";
import { Button } from "@/src/components/react-native-reusables/button";
import { Card, CardContent, CardTitle } from "@/src/components/react-native-reusables/card";
import { TimeField } from "@/src/components/app/time-field";
import { formatHHmm, parseHHmm } from "@/src/utils/time";
import { Text } from "@/src/components/react-native-reusables/text";
import { cn } from "@/lib/utils";
import { suggestStageFromAssessment } from "@/src/features/meditation/stages";
import type { StageNumber } from "@/src/features/meditation/types";
import { useReduceMotionEnabled } from "@/src/lib/accessibility";
import { useRovingFocus } from "@/src/lib/roving-focus";

type Step = "welcome" | "attention" | "assessment" | "gardener" | "commit";

const STEP_ORDER: Step[] = ["welcome", "attention", "assessment", "gardener", "commit"];

const DURATIONS: number[] = [10, 15, 20, 30];

const STAGE_OPTIONS: StageNumber[] = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

const meditationOnboardingImage = require("../../../assets/images/onboarding/mind_illuminated_attention_training.png");

export interface MeditationOnboardingResult {
  assessedStage: StageNumber;
  preferredDurationMinutes: number;
  preferredTimeOfDay: string;
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
  // A manual stage pick is only valid for the assessment it was made under -
  // changing an answer re-derives the suggestion and drops the stale pick.
  const [stagePick, setStagePick] = useState<{
    assessed: StageNumber;
    stage: StageNumber;
  } | null>(null);

  const assessedStage = suggestStageFromAssessment({
    hasDailyHabit: answers.hasDailyHabit ?? false,
    breathFocusLength: answers.breathFocusLength ?? "seconds",
    fallsAsleep: answers.fallsAsleep ?? false,
    catchesDistractionEarly: answers.catchesDistractionEarly ?? false,
    extendedNoThoughts: answers.extendedNoThoughts ?? false,
  });

  const selectedStage = stagePick?.assessed === assessedStage ? stagePick.stage : assessedStage;
  const setSelectedStage = (stage: StageNumber) => setStagePick({ assessed: assessedStage, stage });

  const stepIndex = STEP_ORDER.indexOf(step);

  const durationIndex = DURATIONS.indexOf(duration);
  const durationRoving = useRovingFocus({
    count: DURATIONS.length,
    activeIndex: durationIndex < 0 ? 0 : durationIndex,
    onActivate: (index) => setDuration(DURATIONS[index]),
  });
  const stageIndex = STAGE_OPTIONS.indexOf(selectedStage);
  const stageRoving = useRovingFocus({
    count: STAGE_OPTIONS.length,
    activeIndex: stageIndex < 0 ? 0 : stageIndex,
    onActivate: (index) => setSelectedStage(STAGE_OPTIONS[index]),
  });

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
    });
  }

  // ⚠️ WEB: a closed wizard unmounts outright instead of lingering for its
  // 250ms fade-out, during which react-native-web's Modal is a non-inert
  // focus trap (#1034; swept in #1054 — the full story lives on
  // ConfirmDialog's gate). Native keeps its exit animation: it has none of
  // this. Wizard state (step, answers) survives a close on both platforms —
  // this return only drops the rendered tree.
  if (!visible && Platform.OS === "web") return null;

  return (
    <PressShieldModal
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
              <Card className="border-border bg-muted">
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
                    <TimeField
                      value={parseHHmm(timeOfDay) ?? { hour: 7, minute: 0 }}
                      onChange={(next) => setTimeOfDay(formatHHmm(next))}
                      accessibilityLabel={t("onboarding.commit.timeLabel")}
                    />
                  </View>

                  <View className="gap-2">
                    <Text className="text-sm font-semibold">
                      {t("onboarding.commit.durationLabel")}
                    </Text>
                    <View
                      accessibilityLabel={t("onboarding.commit.durationLabel")}
                      accessibilityRole="radiogroup"
                      className="flex-row flex-wrap gap-2"
                      role="radiogroup"
                    >
                      {DURATIONS.map((min, index) => (
                        <Pressable
                          key={min}
                          accessibilityRole="radio"
                          aria-checked={duration === min}
                          role="radio"
                          onPress={() => setDuration(min)}
                          {...durationRoving.getItemProps(index, () => setDuration(min))}
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
                    <View
                      accessibilityLabel={t("onboarding.commit.stageLabel")}
                      accessibilityRole="radiogroup"
                      className="flex-row flex-wrap gap-1.5"
                      role="radiogroup"
                    >
                      {STAGE_OPTIONS.map((n, index) => (
                        <Pressable
                          key={n}
                          accessibilityRole="radio"
                          accessibilityLabel={t("onboarding.commit.stageOption", { stage: n })}
                          aria-checked={selectedStage === n}
                          role="radio"
                          onPress={() => setSelectedStage(n)}
                          {...stageRoving.getItemProps(index, () => setSelectedStage(n))}
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

                  {/* The reminder switch is deliberately absent (#981). It was a fourth writer
                      of `meditationRemindersEnabled` that wrote no consent and armed no
                      channel, so it produced a reminder that could never be delivered - and
                      routing it through the permission prompt was rejected too: a permission
                      modal mid-wizard is the worst available place to ask. The contextual
                      prompt after the first session asks instead. */}
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
    </PressShieldModal>
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
  const roving = useRovingFocus({
    count: 2,
    // No answer yet: treat "yes" as active so the group stays tab-reachable.
    activeIndex: value === false ? 1 : 0,
    onActivate: (index) => onChange(index === 0),
  });
  return (
    <View className="gap-2">
      <Text className="text-sm font-semibold">{question}</Text>
      <View
        accessibilityLabel={question}
        accessibilityRole="radiogroup"
        className="flex-row gap-2"
        role="radiogroup"
      >
        <Choice
          selected={value === true}
          label={yesLabel}
          onPress={() => onChange(true)}
          rovingProps={roving.getItemProps(0, () => onChange(true))}
        />
        <Choice
          selected={value === false}
          label={noLabel}
          onPress={() => onChange(false)}
          rovingProps={roving.getItemProps(1, () => onChange(false))}
        />
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
  const selectedIndex = options.findIndex((opt) => opt.value === value);
  const roving = useRovingFocus({
    count: options.length,
    // No answer yet: treat the first option as active so the group stays tab-reachable.
    activeIndex: selectedIndex < 0 ? 0 : selectedIndex,
    onActivate: (index) => onChange(options[index].value),
  });
  return (
    <View className="gap-2">
      <Text className="text-sm font-semibold">{question}</Text>
      <View
        accessibilityLabel={question}
        accessibilityRole="radiogroup"
        className="flex-row flex-wrap gap-2"
        role="radiogroup"
      >
        {options.map((opt, index) => (
          <Choice
            key={opt.value}
            selected={value === opt.value}
            label={opt.label}
            onPress={() => onChange(opt.value)}
            rovingProps={roving.getItemProps(index, () => onChange(opt.value))}
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
  rovingProps,
}: {
  selected: boolean;
  label: string;
  onPress: () => void;
  rovingProps: ReturnType<ReturnType<typeof useRovingFocus>["getItemProps"]>;
}) {
  return (
    <Pressable
      accessibilityRole="radio"
      aria-checked={selected}
      role="radio"
      onPress={onPress}
      className={cn(
        "rounded-full border px-4 py-2",
        selected ? "border-primary bg-primary" : "border-border bg-card active:bg-muted",
      )}
      {...rovingProps}
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
