import { router } from "expo-router";
import { ActivityIndicator, Pressable, View } from "react-native";
import { useState } from "react";
import { useTranslation } from "react-i18next";

import { Button } from "@/src/components/react-native-reusables/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/src/components/react-native-reusables/card";
import { Label } from "@/src/components/react-native-reusables/label";
import { Text } from "@/src/components/react-native-reusables/text";
import { Textarea } from "@/src/components/react-native-reusables/textarea";
import { ScreenHeader } from "@/src/components/app/screen-header";
import { MobileFormScreen } from "@/src/components/app/mobile-form-screen";
import { NumberRating } from "@/src/components/app/number-rating";
import { useSaveObservingSelfSession } from "@/src/features/act/queries";
import { StepPills } from "@/src/features/act/step-pills";
import { OBSERVING_TECHNIQUES, type ObservingTechnique } from "@/src/features/act/types";
import { useSession } from "@/src/providers/session-provider";
import { loggedAtForSelectedDate, useSelectedDate } from "@/src/stores/selected-date-store";
import { useToastStore } from "@/src/stores/toast-store";
import { cn } from "@/lib/utils";

type Step = "technique" | "exercise" | "observed" | "after";
const STEP_ORDER: Step[] = ["technique", "exercise", "observed", "after"];

const GUIDE_KEY: Record<
  ObservingTechnique,
  "tenBreathsGuide" | "skyWeatherGuide" | "bodyAwarenessGuide"
> = {
  tenDeepBreaths: "tenBreathsGuide",
  skyAndWeather: "skyWeatherGuide",
  bodyAwareness: "bodyAwarenessGuide",
};

export default function ActObservingSelfNewScreen() {
  const { t } = useTranslation(["act", "common"]);
  const { user } = useSession();
  const { selectedDate } = useSelectedDate();
  const saveMutation = useSaveObservingSelfSession(user?.id ?? null);
  const showToast = useToastStore((state) => state.showToast);

  const [step, setStep] = useState<Step>("technique");
  const [techniqueUsed, setTechniqueUsed] = useState<ObservingTechnique>("tenDeepBreaths");
  const [whatWasObserved, setWhatWasObserved] = useState("");
  const [moodAfter, setMoodAfter] = useState<number | null>(null);
  const [notes, setNotes] = useState("");
  const [submitError, setSubmitError] = useState("");

  const stepIndex = STEP_ORDER.indexOf(step);
  const isLastStep = stepIndex === STEP_ORDER.length - 1;

  function goNext() {
    if (stepIndex < STEP_ORDER.length - 1) setStep(STEP_ORDER[stepIndex + 1]);
  }
  function goBack() {
    if (stepIndex > 0) setStep(STEP_ORDER[stepIndex - 1]);
  }

  async function handleSave() {
    if (!user) return;
    setSubmitError("");
    try {
      await saveMutation.mutateAsync({
        techniqueUsed,
        whatWasObserved: whatWasObserved.trim(),
        moodAfter,
        notes: notes.trim(),
        createdAt: loggedAtForSelectedDate(selectedDate),
      });
      showToast({ title: t("common:feedback.saved"), tone: "success" });
      router.back();
    } catch (error) {
      const message = error instanceof Error ? error.message : t("act:observingSelf.saveProblem");
      setSubmitError(message);
    }
  }

  const guideKey = GUIDE_KEY[techniqueUsed];

  return (
    <MobileFormScreen
      footer={
        <View className="flex-row gap-3">
          {stepIndex > 0 ? (
            <View className="flex-1">
              <Button onPress={goBack} variant="ghost">
                <Text>{t("act:observingSelf.back")}</Text>
              </Button>
            </View>
          ) : null}
          <View className="flex-1">
            <Button
              disabled={saveMutation.isPending}
              onPress={() => void (isLastStep ? handleSave() : goNext())}
            >
              {saveMutation.isPending ? <ActivityIndicator color="#ffffff" /> : null}
              <Text>
                {saveMutation.isPending
                  ? t("act:observingSelf.saving")
                  : isLastStep
                    ? t("act:observingSelf.saveLog")
                    : t("act:observingSelf.continue")}
              </Text>
            </Button>
          </View>
        </View>
      }
    >
      <View className="gap-6">
        <View className="gap-2">
          <ScreenHeader title={t("act:observingSelf.newTitle")} />
          <Text variant="muted">{t("act:observingSelf.newSubtitle")}</Text>
        </View>

        {/* Step pills */}
        <StepPills
          steps={STEP_ORDER}
          current={step}
          onSelect={setStep}
          getLabel={(s) => t(`act:observingSelf.steps.${s}`)}
        />

        {submitError ? (
          <Card>
            <CardHeader>
              <CardTitle>{t("act:observingSelf.saveProblem")}</CardTitle>
            </CardHeader>
            <CardContent>
              <Text variant="muted">{submitError}</Text>
            </CardContent>
          </Card>
        ) : null}

        {/* Step 1: Technique */}
        {step === "technique" ? (
          <View className="gap-3">
            <View className="gap-1">
              <Label>{t("act:observingSelf.techniqueLabel")}</Label>
              <Text variant="muted" className="text-xs">
                {t("act:observingSelf.techniqueHint")}
              </Text>
            </View>
            <View className="gap-2">
              {OBSERVING_TECHNIQUES.map((tech) => {
                const selected = techniqueUsed === tech;
                return (
                  <Pressable
                    key={tech}
                    accessibilityRole="button"
                    accessibilityState={{ selected }}
                    onPress={() => setTechniqueUsed(tech)}
                    className={cn(
                      "rounded-xl border p-4 active:bg-accent/40",
                      selected ? "border-act bg-act/5" : "border-border bg-card",
                    )}
                  >
                    <View className="gap-1">
                      <Text className={cn("font-semibold", selected && "text-act")}>
                        {t(`act:observingSelf.techniques.${tech}`)}
                      </Text>
                      <Text variant="muted" className="text-xs leading-snug">
                        {t(`act:observingSelf.techniqueDescriptions.${tech}`)}
                      </Text>
                    </View>
                  </Pressable>
                );
              })}
            </View>
          </View>
        ) : null}

        {/* Step 2: Exercise guidance */}
        {step === "exercise" ? (
          <Card className="border-act/30 bg-act/5">
            <CardHeader>
              <CardTitle className="text-act">{t(`act:observingSelf.${guideKey}.title`)}</CardTitle>
            </CardHeader>
            <CardContent>
              {techniqueUsed === "tenDeepBreaths" ? (
                <View className="gap-3">
                  <Text className="text-sm font-medium">
                    {t("act:observingSelf.tenBreathsGuide.instruction")}
                  </Text>
                  <Text variant="muted" className="text-sm">
                    {t("act:observingSelf.tenBreathsGuide.inhale")}
                  </Text>
                  <Text variant="muted" className="text-sm">
                    {t("act:observingSelf.tenBreathsGuide.exhale")}
                  </Text>
                  <Text variant="muted" className="text-xs italic">
                    {t("act:observingSelf.tenBreathsGuide.repeat")}
                  </Text>
                </View>
              ) : (
                <Text className="text-sm leading-relaxed text-muted-foreground">
                  {t(`act:observingSelf.${guideKey}.body`)}
                </Text>
              )}
            </CardContent>
          </Card>
        ) : null}

        {/* Step 3: What was observed */}
        {step === "observed" ? (
          <View className="gap-3">
            <View className="gap-1">
              <Label>{t("act:observingSelf.observedLabel")}</Label>
              <Text variant="muted" className="text-xs">
                {t("act:observingSelf.observedHint")}
              </Text>
            </View>
            <Textarea
              accessibilityLabel={t("act:observingSelf.observedLabel")}
              onChangeText={setWhatWasObserved}
              placeholder={t("act:observingSelf.observedPlaceholder")}
              value={whatWasObserved}
              autoFocus
            />
          </View>
        ) : null}

        {/* Step 4: After */}
        {step === "after" ? (
          <View className="gap-6">
            <View className="gap-3">
              <View className="gap-1">
                <Label>{t("act:observingSelf.moodLabel")}</Label>
                <Text variant="muted" className="text-xs">
                  {t("act:observingSelf.moodHint")}
                </Text>
              </View>
              <NumberRating min={1} max={10} step={1} value={moodAfter} onChange={setMoodAfter} />
            </View>
            <View className="gap-3">
              <Label>{t("act:observingSelf.notesLabel")}</Label>
              <Textarea
                accessibilityLabel={t("act:observingSelf.notesLabel")}
                onChangeText={setNotes}
                placeholder={t("act:observingSelf.notesPlaceholder")}
                value={notes}
              />
            </View>
          </View>
        ) : null}
      </View>
    </MobileFormScreen>
  );
}
