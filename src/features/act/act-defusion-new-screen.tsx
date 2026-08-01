import { router } from "expo-router";
import { ActivityIndicator, Pressable, View } from "react-native";
import { useCallback, useMemo, useState } from "react";
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
import { ScreenHeader } from "@/src/components/app/screen-header";
import { ConfirmDialog } from "@/src/components/app/confirm-dialog";
import { CrisisSupportBar } from "@/src/components/app/crisis-support-bar";
import { MobileFormScreen } from "@/src/components/app/mobile-form-screen";
import { NumberRating } from "@/src/components/app/number-rating";
import { useSaveDefusionLog } from "@/src/features/act/queries";
import { StepPills } from "@/src/features/act/step-pills";
import {
  DEFUSION_TECHNIQUES,
  THOUGHT_CATEGORIES,
  type DefusionTechnique,
  type ThoughtCategory,
} from "@/src/features/act/types";
import { useRovingFocus } from "@/src/lib/roving-focus";
import { useSingleFlight } from "@/src/lib/use-single-flight";
import { useStateWizardDraft } from "@/src/lib/use-state-wizard-draft";
import { useSession } from "@/src/providers/session-provider";
import {
  type ActDefusionDraft,
  useActDefusionDraftStore,
} from "@/src/stores/act-defusion-draft-store";
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
  const [discardOpen, setDiscardOpen] = useState(false);

  const stepIndex = STEP_ORDER.indexOf(step);
  const isLastStep = stepIndex === STEP_ORDER.length - 1;
  const draftValues = useMemo<ActDefusionDraft>(
    () => ({
      fusedThought,
      thoughtCategory,
      fusionLevelBefore,
      techniqueUsed,
      defusedVersion,
      fusionLevelAfter,
      notes,
    }),
    [
      defusedVersion,
      fusedThought,
      fusionLevelAfter,
      fusionLevelBefore,
      notes,
      techniqueUsed,
      thoughtCategory,
    ],
  );
  const restoreDraft = useCallback((draft: ActDefusionDraft, restoredStepIndex: number) => {
    setFusedThought(draft.fusedThought);
    setThoughtCategory(draft.thoughtCategory);
    setFusionLevelBefore(draft.fusionLevelBefore);
    setTechniqueUsed(draft.techniqueUsed);
    setDefusedVersion(draft.defusedVersion);
    setFusionLevelAfter(draft.fusionLevelAfter);
    setNotes(draft.notes);
    setStep(STEP_ORDER[Math.min(Math.max(restoredStepIndex, 0), STEP_ORDER.length - 1)]);
  }, []);
  const { hydrated: draftHydrated, clearDraft } = useStateWizardDraft({
    useDraftStore: useActDefusionDraftStore,
    values: draftValues,
    stepIndex,
    restore: restoreDraft,
  });

  const categoryIndex = THOUGHT_CATEGORIES.indexOf(thoughtCategory);
  const categoryRoving = useRovingFocus({
    count: THOUGHT_CATEGORIES.length,
    activeIndex: categoryIndex < 0 ? 0 : categoryIndex,
    onActivate: (index) => setThoughtCategory(THOUGHT_CATEGORIES[index]),
  });
  const techniqueIndex = DEFUSION_TECHNIQUES.indexOf(techniqueUsed);
  const techniqueRoving = useRovingFocus({
    count: DEFUSION_TECHNIQUES.length,
    activeIndex: techniqueIndex < 0 ? 0 : techniqueIndex,
    onActivate: (index) => setTechniqueUsed(DEFUSION_TECHNIQUES[index]),
  });

  function goNext() {
    if (stepIndex < STEP_ORDER.length - 1) setStep(STEP_ORDER[stepIndex + 1]);
  }
  function goBack() {
    if (stepIndex > 0) setStep(STEP_ORDER[stepIndex - 1]);
  }

  const handleSave = useSingleFlight(async () => {
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
      clearDraft();
      showToast({ title: t("common:feedback.saved"), tone: "success" });
      router.back();
    } catch (error) {
      const message = error instanceof Error ? error.message : t("act:defusion.saveProblem");
      setSubmitError(message);
    }
  });

  if (!draftHydrated) {
    return (
      <View className="flex-1 items-center justify-center bg-background">
        <ActivityIndicator />
      </View>
    );
  }

  return (
    <MobileFormScreen
      footer={
        <View className="gap-2">
          <Button
            disabled={saveMutation.isPending}
            onPress={() => setDiscardOpen(true)}
            variant="ghost"
          >
            <Text className="text-destructive">{t("common:draft.discardAction")}</Text>
          </Button>
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
        </View>
      }
    >
      <View className="gap-6">
        <View className="gap-2">
          <ScreenHeader title={t("act:defusion.newTitle")} />
          <Text variant="muted">{t("act:defusion.newSubtitle")}</Text>
        </View>

        <CrisisSupportBar />

        {/* Step pills */}
        <StepPills
          steps={STEP_ORDER}
          current={step}
          onSelect={setStep}
          getLabel={(s) => t(`act:defusion.steps.${s}`)}
        />

        {submitError ? (
          <Card>
            <CardHeader>
              <CardTitle>{t("act:defusion.saveProblem")}</CardTitle>
              <CardDescription>{submitError}</CardDescription>
            </CardHeader>
          </Card>
        ) : null}

        <ConfirmDialog
          visible={discardOpen}
          isPending={false}
          title={t("common:draft.discardTitle")}
          message={t("common:draft.discardMessage")}
          confirmLabel={t("common:draft.discardConfirm")}
          cancelLabel={t("common:cancel")}
          onCancel={() => setDiscardOpen(false)}
          onConfirm={() => {
            clearDraft();
            setDiscardOpen(false);
            router.back();
          }}
        />

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
            <View
              accessibilityLabel={t("act:defusion.categoryLabel")}
              accessibilityRole="radiogroup"
              className="flex-row flex-wrap gap-2"
              role="radiogroup"
            >
              {THOUGHT_CATEGORIES.map((cat, index) => {
                const selected = thoughtCategory === cat;
                return (
                  <Pressable
                    key={cat}
                    accessibilityRole="radio"
                    aria-checked={selected}
                    role="radio"
                    onPress={() => setThoughtCategory(cat)}
                    className={cn(
                      "rounded-full border px-4 py-2",
                      selected
                        ? "border-border bg-primary"
                        : "border-border bg-card active:bg-muted",
                    )}
                    {...categoryRoving.getItemProps(index, () => setThoughtCategory(cat))}
                  >
                    <Text
                      className={cn(
                        "text-sm font-semibold",
                        selected ? "text-primary-foreground" : "text-foreground",
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
            <View
              accessibilityLabel={t("act:defusion.techniqueLabel")}
              accessibilityRole="radiogroup"
              className="gap-2"
              role="radiogroup"
            >
              {DEFUSION_TECHNIQUES.map((tech, index) => {
                const selected = techniqueUsed === tech;
                return (
                  <Pressable
                    key={tech}
                    accessibilityRole="radio"
                    aria-checked={selected}
                    role="radio"
                    onPress={() => setTechniqueUsed(tech)}
                    className={cn(
                      "rounded-xl border p-4 active:bg-accent/40",
                      selected ? "border-border bg-muted" : "border-border bg-card",
                    )}
                    {...techniqueRoving.getItemProps(index, () => setTechniqueUsed(tech))}
                  >
                    <View className="gap-1">
                      <Text className={cn("font-semibold", selected && "text-foreground")}>
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
              <Card className="border-border bg-muted">
                <CardContent className="pt-4">
                  <Text className="text-center font-semibold text-foreground">
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
