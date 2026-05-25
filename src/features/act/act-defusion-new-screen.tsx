import { router } from "expo-router";
import { ActivityIndicator, Pressable, View } from "react-native";
import { useState } from "react";
import { useTranslation } from "react-i18next";

import { Button } from "@/src/components/react-native-reusables/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/src/components/react-native-reusables/card";
import { Label } from "@/src/components/react-native-reusables/label";
import { Text } from "@/src/components/react-native-reusables/text";
import { Textarea } from "@/src/components/react-native-reusables/textarea";
import { BackButton } from "@/src/components/app/back-button";
import { MobileFormScreen } from "@/src/components/app/mobile-form-screen";
import { NumberRating } from "@/src/components/app/number-rating";
import { useSaveDefusionLog } from "@/src/features/act/queries";
import {
  DEFUSION_TECHNIQUES,
  THOUGHT_CATEGORIES,
  type DefusionTechnique,
  type ThoughtCategory,
} from "@/src/features/act/types";
import { useSession } from "@/src/providers/session-provider";
import { loggedAtForSelectedDate, useSelectedDate } from "@/src/stores/selected-date-store";
import { useToastStore } from "@/src/stores/toast-store";
import { cn } from "@/lib/utils";

type Step = "thought" | "category" | "before" | "technique" | "after";
const STEP_ORDER: Step[] = ["thought", "category", "before", "technique", "after"];

export default function ActDefusionNewScreen() {
  const { t } = useTranslation(["act", "common"]);
  const { user } = useSession();
  const { selectedDate } = useSelectedDate();
  const saveMutation = useSaveDefusionLog(user?.id ?? null);
  const showToast = useToastStore((state) => state.showToast);

  const [step, setStep] = useState<Step>("thought");
  const [fusedThought, setFusedThought] = useState("");
  const [thoughtCategory, setThoughtCategory] = useState<ThoughtCategory>("other");
  const [fusionLevelBefore, setFusionLevelBefore] = useState<number | null>(null);
  const [techniqueUsed, setTechniqueUsed] = useState<DefusionTechnique>("havingTheThoughtThat");
  const [defusedVersion, setDefusedVersion] = useState("");
  const [fusionLevelAfter, setFusionLevelAfter] = useState<number | null>(null);
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
        fusedThought: fusedThought.trim(),
        thoughtCategory,
        fusionLevelBefore,
        techniqueUsed,
        defusedVersion: defusedVersion.trim(),
        fusionLevelAfter,
        notes: notes.trim(),
        createdAt: loggedAtForSelectedDate(selectedDate),
      });
      showToast({ title: t("common:feedback.saved"), tone: "success" });
      router.back();
    } catch (error) {
      const message = error instanceof Error ? error.message : t("act:defusion.saveProblem");
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
                <Text>{t("act:defusion.back")}</Text>
              </Button>
            </View>
          ) : null}
          <View className="flex-1">
            <Button
              disabled={
                saveMutation.isPending || (step === "thought" && fusedThought.trim().length === 0)
              }
              onPress={() => void (isLastStep ? handleSave() : goNext())}
            >
              {saveMutation.isPending ? <ActivityIndicator color="#ffffff" /> : null}
              <Text>
                {saveMutation.isPending
                  ? t("act:defusion.saving")
                  : isLastStep
                    ? t("act:defusion.saveLog")
                    : t("act:defusion.continue")}
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
            <Text variant="h1">{t("act:defusion.newTitle")}</Text>
          </View>
          <Text variant="muted">{t("act:defusion.newSubtitle")}</Text>
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
                  {index + 1}. {t(`act:defusion.steps.${s}`)}
                </Text>
              </Pressable>
            );
          })}
        </View>

        {submitError ? (
          <Card>
            <CardHeader>
              <CardTitle>{t("act:defusion.saveProblem")}</CardTitle>
              <CardDescription>{submitError}</CardDescription>
            </CardHeader>
          </Card>
        ) : null}

        {/* Step 1: Thought */}
        {step === "thought" ? (
          <View className="gap-3">
            <View className="gap-1">
              <Label>{t("act:defusion.thoughtLabel")}</Label>
              <Text variant="muted" className="text-xs">
                {t("act:defusion.thoughtHint")}
              </Text>
            </View>
            <Textarea
              accessibilityLabel={t("act:defusion.thoughtLabel")}
              onChangeText={setFusedThought}
              placeholder={t("act:defusion.thoughtPlaceholder")}
              value={fusedThought}
              autoFocus
            />
          </View>
        ) : null}

        {/* Step 2: Category */}
        {step === "category" ? (
          <View className="gap-3">
            <Label>{t("act:defusion.categoryLabel")}</Label>
            <View className="flex-row flex-wrap gap-2">
              {THOUGHT_CATEGORIES.map((cat) => {
                const selected = thoughtCategory === cat;
                return (
                  <Pressable
                    key={cat}
                    accessibilityRole="button"
                    accessibilityState={{ selected }}
                    onPress={() => setThoughtCategory(cat)}
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
                      {t(`act:defusion.categories.${cat}`)}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>
        ) : null}

        {/* Step 3: Fusion level before */}
        {step === "before" ? (
          <View className="gap-3">
            <View className="gap-1">
              <Label>{t("act:defusion.fusionBeforeLabel")}</Label>
              <Text variant="muted" className="text-xs">
                {t("act:defusion.fusionBeforeHint")}
              </Text>
            </View>
            <NumberRating
              min={0}
              max={100}
              step={10}
              value={fusionLevelBefore}
              onChange={setFusionLevelBefore}
            />
          </View>
        ) : null}

        {/* Step 4: Technique */}
        {step === "technique" ? (
          <View className="gap-3">
            <View className="gap-1">
              <Label>{t("act:defusion.techniqueLabel")}</Label>
              <Text variant="muted" className="text-xs">
                {t("act:defusion.techniqueHint")}
              </Text>
            </View>
            <View className="gap-2">
              {DEFUSION_TECHNIQUES.map((tech) => {
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
                        {t(`act:defusion.techniques.${tech}`)}
                      </Text>
                      <Text variant="muted" className="text-xs leading-snug">
                        {t(`act:defusion.techniqueDescriptions.${tech}`)}
                      </Text>
                    </View>
                  </Pressable>
                );
              })}
            </View>
          </View>
        ) : null}

        {/* Step 5: After + notes */}
        {step === "after" ? (
          <View className="gap-6">
            <View className="gap-3">
              <View className="gap-1">
                <Label>{t("act:defusion.defusedVersionLabel")}</Label>
              </View>
              <Textarea
                accessibilityLabel={t("act:defusion.defusedVersionLabel")}
                onChangeText={setDefusedVersion}
                placeholder={t("act:defusion.defusedVersionPlaceholder")}
                value={defusedVersion}
              />
            </View>

            <View className="gap-3">
              <View className="gap-1">
                <Label>{t("act:defusion.fusionAfterLabel")}</Label>
                <Text variant="muted" className="text-xs">
                  {t("act:defusion.fusionAfterHint")}
                </Text>
              </View>
              <NumberRating
                min={0}
                max={100}
                step={10}
                value={fusionLevelAfter}
                onChange={setFusionLevelAfter}
              />
            </View>

            {fusionLevelBefore !== null && fusionLevelAfter !== null ? (
              <Card className="border-act/30 bg-act/5">
                <CardContent className="pt-4">
                  <Text className="text-center font-semibold text-act">
                    {fusionLevelAfter < fusionLevelBefore
                      ? t("act:defusion.fusionDrop", {
                          before: fusionLevelBefore,
                          after: fusionLevelAfter,
                        })
                      : t("act:defusion.noFusionDrop", { after: fusionLevelAfter })}
                  </Text>
                </CardContent>
              </Card>
            ) : null}

            <View className="gap-3">
              <View className="gap-1">
                <Label>{t("act:defusion.notesLabel")}</Label>
              </View>
              <Textarea
                accessibilityLabel={t("act:defusion.notesLabel")}
                onChangeText={setNotes}
                placeholder={t("act:defusion.notesPlaceholder")}
                value={notes}
              />
            </View>
          </View>
        ) : null}
      </View>
    </MobileFormScreen>
  );
}
