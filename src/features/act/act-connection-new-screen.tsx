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
import { useSaveConnectionLog } from "@/src/features/act/queries";
import { StepPills } from "@/src/features/act/step-pills";
import { CONNECTION_TECHNIQUES, type ConnectionTechnique } from "@/src/features/act/types";
import { useSession } from "@/src/providers/session-provider";
import { loggedAtForSelectedDate, useSelectedDate } from "@/src/stores/selected-date-store";
import { useToastStore } from "@/src/stores/toast-store";
import { cn } from "@/lib/utils";

type Step = "technique" | "exercise" | "notices" | "after";
const STEP_ORDER: Step[] = ["technique", "exercise", "notices", "after"];

export default function ActConnectionNewScreen() {
  const { t } = useTranslation(["act", "common"]);
  const { user } = useSession();
  const { selectedDate } = useSelectedDate();
  const saveMutation = useSaveConnectionLog(user?.id ?? null);
  const showToast = useToastStore((state) => state.showToast);

  const [step, setStep] = useState<Step>("technique");
  const [technique, setTechnique] = useState<ConnectionTechnique>("noticeFiveThings");
  const [activityContext, setActivityContext] = useState("");
  const [noticesFromSenses, setNoticesFromSenses] = useState("");
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
        technique,
        activityContext: activityContext.trim(),
        noticesFromSenses: noticesFromSenses.trim(),
        moodAfter,
        notes: notes.trim(),
        createdAt: loggedAtForSelectedDate(selectedDate),
      });
      showToast({ title: t("common:feedback.saved"), tone: "success" });
      router.back();
    } catch (error) {
      const message = error instanceof Error ? error.message : t("act:connection.saveProblem");
      setSubmitError(message);
    }
  }

  return (
    <MobileFormScreen
      footer={
        <View className="flex-row gap-3">
          {stepIndex > 0 ? (
            <View className="flex-1">
              <Button onPress={goBack} variant="ghost">
                <Text>{t("act:connection.back")}</Text>
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
                  ? t("act:connection.saving")
                  : isLastStep
                    ? t("act:connection.saveLog")
                    : t("act:connection.continue")}
              </Text>
            </Button>
          </View>
        </View>
      }
    >
      <View className="gap-6">
        <View className="gap-2">
          <ScreenHeader title={t("act:connection.newTitle")} />
          <Text variant="muted">{t("act:connection.newSubtitle")}</Text>
        </View>

        {/* Step pills */}
        <StepPills
          steps={STEP_ORDER}
          current={step}
          onSelect={setStep}
          getLabel={(s) => t(`act:connection.steps.${s}`)}
        />

        {submitError ? (
          <Card>
            <CardHeader>
              <CardTitle>{t("act:connection.saveProblem")}</CardTitle>
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
              <Label>{t("act:connection.techniqueLabel")}</Label>
              <Text variant="muted" className="text-xs">
                {t("act:connection.techniqueHint")}
              </Text>
            </View>
            <View className="gap-2">
              {CONNECTION_TECHNIQUES.map((tech) => {
                const selected = technique === tech;
                return (
                  <Pressable
                    key={tech}
                    accessibilityRole="button"
                    accessibilityState={{ selected }}
                    onPress={() => setTechnique(tech)}
                    className={cn(
                      "rounded-xl border p-4 active:bg-accent/40",
                      selected ? "border-act bg-act/5" : "border-border bg-card",
                    )}
                  >
                    <View className="gap-1">
                      <Text className={cn("font-semibold", selected && "text-act")}>
                        {t(`act:connection.techniques.${tech}`)}
                      </Text>
                      <Text variant="muted" className="text-xs leading-snug">
                        {t(`act:connection.techniqueDescriptions.${tech}`)}
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
          <View className="gap-4">
            {technique === "noticeFiveThings" ? (
              <Card className="border-act/30 bg-act/5">
                <CardHeader>
                  <CardTitle className="text-act">
                    {t("act:connection.noticeFiveGuide.title")}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <View className="gap-3">
                    <Text variant="muted" className="text-sm">
                      {t("act:connection.noticeFiveGuide.intro")}
                    </Text>
                    {(["see", "hear", "feel", "smell"] as const).map((sense) => (
                      <View key={sense} className="flex-row gap-2">
                        <Text className="w-2 text-act">·</Text>
                        <Text className="flex-1 text-sm font-medium">
                          {t(`act:connection.noticeFiveGuide.${sense}`)}
                        </Text>
                      </View>
                    ))}
                    <Text variant="muted" className="text-xs italic">
                      {t("act:connection.noticeFiveGuide.outro")}
                    </Text>
                  </View>
                </CardContent>
              </Card>
            ) : null}

            {technique === "mindfulActivity" ? (
              <View className="gap-3">
                <View className="gap-1">
                  <Label>{t("act:connection.activityLabel")}</Label>
                  <Text variant="muted" className="text-xs">
                    {t("act:connection.activityHint")}
                  </Text>
                </View>
                <Textarea
                  accessibilityLabel={t("act:connection.activityLabel")}
                  onChangeText={setActivityContext}
                  placeholder={t("act:connection.activityPlaceholder")}
                  value={activityContext}
                  autoFocus
                />
              </View>
            ) : null}

            {technique === "tenDeepBreaths" ? (
              <Card className="border-act/30 bg-act/5">
                <CardHeader>
                  <CardTitle className="text-act">
                    {t("act:observingSelf.tenBreathsGuide.title")}
                  </CardTitle>
                </CardHeader>
                <CardContent>
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
                </CardContent>
              </Card>
            ) : null}
          </View>
        ) : null}

        {/* Step 3: Notices */}
        {step === "notices" ? (
          <View className="gap-3">
            <View className="gap-1">
              <Label>{t("act:connection.noticesLabel")}</Label>
              <Text variant="muted" className="text-xs">
                {t("act:connection.noticesHint")}
              </Text>
            </View>
            <Textarea
              accessibilityLabel={t("act:connection.noticesLabel")}
              onChangeText={setNoticesFromSenses}
              placeholder={t("act:connection.noticesPlaceholder")}
              value={noticesFromSenses}
              autoFocus
            />
          </View>
        ) : null}

        {/* Step 4: After */}
        {step === "after" ? (
          <View className="gap-6">
            <View className="gap-3">
              <View className="gap-1">
                <Label>{t("act:connection.moodLabel")}</Label>
                <Text variant="muted" className="text-xs">
                  {t("act:connection.moodHint")}
                </Text>
              </View>
              <NumberRating min={1} max={10} step={1} value={moodAfter} onChange={setMoodAfter} />
            </View>
            <View className="gap-3">
              <Label>{t("act:connection.notesLabel")}</Label>
              <Textarea
                accessibilityLabel={t("act:connection.notesLabel")}
                onChangeText={setNotes}
                placeholder={t("act:connection.notesPlaceholder")}
                value={notes}
              />
            </View>
          </View>
        ) : null}
      </View>
    </MobileFormScreen>
  );
}
