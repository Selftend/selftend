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
import { BackButton } from "@/src/components/app/back-button";
import { MobileFormScreen } from "@/src/components/app/mobile-form-screen";
import { NumberRating } from "@/src/components/app/number-rating";
import { useSaveExpansionLog } from "@/src/features/act/queries";
import {
  EXPANSION_TECHNIQUES,
  type DiscomfortType,
  type ExpansionTechnique,
} from "@/src/features/act/types";
import { useSession } from "@/src/providers/session-provider";
import { loggedAtForSelectedDate, useSelectedDate } from "@/src/stores/selected-date-store";
import { useToastStore } from "@/src/stores/toast-store";
import { cn } from "@/lib/utils";

type Step = "emotion" | "body" | "struggle" | "technique" | "after";
const STEP_ORDER: Step[] = ["emotion", "body", "struggle", "technique", "after"];

export default function ActExpansionNewScreen() {
  const { t } = useTranslation(["act", "common"]);
  const { user } = useSession();
  const { selectedDate } = useSelectedDate();
  const saveMutation = useSaveExpansionLog(user?.id ?? null);
  const showToast = useToastStore((state) => state.showToast);

  const [step, setStep] = useState<Step>("emotion");
  const [emotion, setEmotion] = useState("");
  const [bodySensation, setBodySensation] = useState("");
  const [intensityBefore, setIntensityBefore] = useState<number | null>(null);
  const [struggleSwitchOn, setStruggleSwitchOn] = useState<boolean | null>(null);
  const [discomfortType, setDiscomfortType] = useState<DiscomfortType | null>(null);
  const [techniqueUsed, setTechniqueUsed] = useState<ExpansionTechnique>("fourStepExpansion");
  const [intensityAfter, setIntensityAfter] = useState<number | null>(null);
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
        emotion: emotion.trim(),
        bodySensation: bodySensation.trim(),
        intensityBefore,
        struggleSwitchOn,
        discomfortType,
        techniqueUsed,
        intensityAfter,
        notes: notes.trim(),
        createdAt: loggedAtForSelectedDate(selectedDate),
      });
      showToast({ title: t("common:feedback.saved"), tone: "success" });
      router.back();
    } catch (error) {
      const message = error instanceof Error ? error.message : t("act:expansion.saveProblem");
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
                <Text>{t("act:expansion.back")}</Text>
              </Button>
            </View>
          ) : null}
          <View className="flex-1">
            <Button
              disabled={
                saveMutation.isPending || (step === "emotion" && emotion.trim().length === 0)
              }
              onPress={() => void (isLastStep ? handleSave() : goNext())}
            >
              {saveMutation.isPending ? <ActivityIndicator color="#ffffff" /> : null}
              <Text>
                {saveMutation.isPending
                  ? t("act:expansion.saving")
                  : isLastStep
                    ? t("act:expansion.saveLog")
                    : t("act:expansion.continue")}
              </Text>
            </Button>
          </View>
        </View>
      }
    >
      <View className="gap-6">
        <View className="gap-2">
          <View className="flex-row items-center gap-2">
            <BackButton showLabel={false} className="-ml-2" />
            <Text variant="h1">{t("act:expansion.newTitle")}</Text>
          </View>
          <Text variant="muted">{t("act:expansion.newSubtitle")}</Text>
        </View>

        {/* Step pills */}
        <View className="flex-row flex-wrap gap-2">
          {STEP_ORDER.map((s, index) => {
            const isActive = step === s;
            const isPast = index < stepIndex;
            return (
              <Pressable
                key={s}
                accessibilityRole="button"
                accessibilityState={{ selected: isActive, disabled: index > stepIndex }}
                disabled={index > stepIndex}
                onPress={() => {
                  if (index <= stepIndex) setStep(s);
                }}
                className={cn(
                  "rounded-full border px-3 py-1",
                  isActive
                    ? "border-act bg-act"
                    : isPast
                      ? "border-act/40 bg-act/10"
                      : "border-border bg-card opacity-40",
                )}
              >
                <Text
                  className={cn(
                    "text-xs font-semibold",
                    isActive ? "text-white" : isPast ? "text-act" : "text-muted-foreground",
                  )}
                >
                  {index + 1}. {t(`act:expansion.steps.${s}`)}
                </Text>
              </Pressable>
            );
          })}
        </View>

        {submitError ? (
          <Card>
            <CardHeader>
              <CardTitle>{t("act:expansion.saveProblem")}</CardTitle>
            </CardHeader>
            <CardContent>
              <Text variant="muted">{submitError}</Text>
            </CardContent>
          </Card>
        ) : null}

        {/* Step 1: Emotion */}
        {step === "emotion" ? (
          <View className="gap-6">
            <View className="gap-3">
              <View className="gap-1">
                <Label>{t("act:expansion.emotionLabel")}</Label>
                <Text variant="muted" className="text-xs">
                  {t("act:expansion.emotionHint")}
                </Text>
              </View>
              <Textarea
                accessibilityLabel={t("act:expansion.emotionLabel")}
                onChangeText={setEmotion}
                placeholder={t("act:expansion.emotionPlaceholder")}
                value={emotion}
                autoFocus
              />
            </View>
            <View className="gap-3">
              <View className="gap-1">
                <Label>{t("act:expansion.intensityBeforeLabel")}</Label>
                <Text variant="muted" className="text-xs">
                  {t("act:expansion.intensityBeforeHint")}
                </Text>
              </View>
              <NumberRating
                min={0}
                max={100}
                step={10}
                value={intensityBefore}
                onChange={setIntensityBefore}
              />
            </View>
          </View>
        ) : null}

        {/* Step 2: Body sensation */}
        {step === "body" ? (
          <View className="gap-3">
            <View className="gap-1">
              <Label>{t("act:expansion.bodyLabel")}</Label>
              <Text variant="muted" className="text-xs">
                {t("act:expansion.bodyHint")}
              </Text>
            </View>
            <Textarea
              accessibilityLabel={t("act:expansion.bodyLabel")}
              onChangeText={setBodySensation}
              placeholder={t("act:expansion.bodyPlaceholder")}
              value={bodySensation}
              autoFocus
            />
          </View>
        ) : null}

        {/* Step 3: Struggle switch */}
        {step === "struggle" ? (
          <View className="gap-6">
            <View className="gap-3">
              <Label>{t("act:expansion.struggleSwitchQuestion")}</Label>
              <View className="gap-2">
                {(["yes", "no"] as const).map((choice) => {
                  const isOn = choice === "yes";
                  const selected = struggleSwitchOn === isOn;
                  return (
                    <Pressable
                      key={choice}
                      accessibilityRole="button"
                      accessibilityState={{ selected }}
                      onPress={() => setStruggleSwitchOn(isOn)}
                      className={cn(
                        "rounded-xl border p-4 active:bg-accent/40",
                        selected ? "border-act bg-act/5" : "border-border bg-card",
                      )}
                    >
                      <Text className={cn("font-semibold", selected && "text-act")}>
                        {t(
                          isOn
                            ? "act:expansion.struggleSwitchOn"
                            : "act:expansion.struggleSwitchOff",
                        )}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>

            {struggleSwitchOn !== null ? (
              <View className="gap-3">
                <View className="gap-1">
                  <Label>{t("act:expansion.discomfortTypeLabel")}</Label>
                  <Text variant="muted" className="text-xs">
                    {t("act:expansion.discomfortTypeHint")}
                  </Text>
                </View>
                <View className="gap-2">
                  {(["clean", "dirty"] as DiscomfortType[]).map((type) => {
                    const selected = discomfortType === type;
                    return (
                      <Pressable
                        key={type}
                        accessibilityRole="button"
                        accessibilityState={{ selected }}
                        onPress={() => setDiscomfortType(type)}
                        className={cn(
                          "rounded-xl border p-4 active:bg-accent/40",
                          selected ? "border-act bg-act/5" : "border-border bg-card",
                        )}
                      >
                        <Text className={cn("font-semibold", selected && "text-act")}>
                          {t(`act:expansion.${type}`)}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              </View>
            ) : null}
          </View>
        ) : null}

        {/* Step 4: Technique */}
        {step === "technique" ? (
          <View className="gap-3">
            <View className="gap-1">
              <Label>{t("act:expansion.techniqueLabel")}</Label>
              <Text variant="muted" className="text-xs">
                {t("act:expansion.techniqueHint")}
              </Text>
            </View>
            <View className="gap-2">
              {EXPANSION_TECHNIQUES.map((tech) => {
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
                        {t(`act:expansion.techniques.${tech}`)}
                      </Text>
                      <Text variant="muted" className="text-xs leading-snug">
                        {t(`act:expansion.techniqueDescriptions.${tech}`)}
                      </Text>
                    </View>
                  </Pressable>
                );
              })}
            </View>

            {/* Inline 4-step guide when that technique is selected */}
            {techniqueUsed === "fourStepExpansion" ? (
              <Card className="border-act/30 bg-act/5">
                <CardHeader>
                  <CardTitle className="text-act">
                    {t("act:expansion.fourStepGuide.title")}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <View className="gap-4">
                    {(["step1", "step2", "step3", "step4"] as const).map((s) => (
                      <View key={s} className="gap-1">
                        <Text className="font-semibold text-act">
                          {t(`act:expansion.fourStepGuide.${s}Title`)}
                        </Text>
                        <Text variant="muted" className="text-sm leading-snug">
                          {t(`act:expansion.fourStepGuide.${s}Body`)}
                        </Text>
                      </View>
                    ))}
                  </View>
                </CardContent>
              </Card>
            ) : null}
          </View>
        ) : null}

        {/* Step 5: After + notes */}
        {step === "after" ? (
          <View className="gap-6">
            <View className="gap-3">
              <View className="gap-1">
                <Label>{t("act:expansion.intensityAfterLabel")}</Label>
                <Text variant="muted" className="text-xs">
                  {t("act:expansion.intensityAfterHint")}
                </Text>
              </View>
              <NumberRating
                min={0}
                max={100}
                step={10}
                value={intensityAfter}
                onChange={setIntensityAfter}
              />
            </View>

            {intensityBefore !== null && intensityAfter !== null ? (
              <Card className="border-act/30 bg-act/5">
                <CardContent className="pt-4">
                  <Text className="text-center font-semibold text-act">
                    {intensityAfter < intensityBefore
                      ? t("act:expansion.intensityDrop", {
                          before: intensityBefore,
                          after: intensityAfter,
                        })
                      : t("act:expansion.noIntensityDrop", { after: intensityAfter })}
                  </Text>
                </CardContent>
              </Card>
            ) : null}

            <View className="gap-3">
              <Label>{t("act:expansion.notesLabel")}</Label>
              <Textarea
                accessibilityLabel={t("act:expansion.notesLabel")}
                onChangeText={setNotes}
                placeholder={t("act:expansion.notesPlaceholder")}
                value={notes}
              />
            </View>
          </View>
        ) : null}
      </View>
    </MobileFormScreen>
  );
}
