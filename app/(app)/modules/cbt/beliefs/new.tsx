import { zodResolver } from "@hookform/resolvers/zod";
import { router, useLocalSearchParams } from "expo-router";
import { Controller, useForm } from "react-hook-form";
import { ActivityIndicator, View } from "react-native";
import { useEffect, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { SafeAreaView } from "react-native-safe-area-context";

import { Button } from "@/src/components/react-native-reusables/button";
import { Card, CardHeader, CardTitle } from "@/src/components/react-native-reusables/card";
import { Input } from "@/src/components/react-native-reusables/input";
import { Label } from "@/src/components/react-native-reusables/label";
import { Text } from "@/src/components/react-native-reusables/text";
import { Textarea } from "@/src/components/react-native-reusables/textarea";
import { MobileFormScreen } from "@/src/components/app/mobile-form-screen";
import { NumberRating } from "@/src/components/app/number-rating";
import { LoadingState } from "@/src/components/app/screen-state";
import { useCoreBelief, useSaveCoreBelief } from "@/src/features/beliefs/queries";
import { coreBeliefFormSchema, type CoreBeliefFormSchema } from "@/src/features/beliefs/schemas";
import { useSession } from "@/src/providers/session-provider";
import { useBeliefDraftStore } from "@/src/stores/belief-draft-store";
import { useToastStore } from "@/src/stores/toast-store";
import { BackButton } from "@/src/components/app/back-button";

const defaultValues: CoreBeliefFormSchema = {
  beliefStatement: "",
  triggeringSituations: [""],
  evidenceFor: [""],
  evidenceAgainst: [""],
  alternativeBelief: "",
  originalBeliefStrength: 70,
  alternativeBeliefStrength: 30,
  reinforcementPlan: "",
  nextReviewDate: null,
};

export default function NewBeliefScreen() {
  const { t } = useTranslation("cbt");
  const { beliefId: rawBeliefId } = useLocalSearchParams<{ beliefId?: string }>();
  const beliefId = useMemo(
    () => (typeof rawBeliefId === "string" && rawBeliefId.length > 0 ? rawBeliefId : null),
    [rawBeliefId],
  );
  const draftMode = beliefId ? "edit" : "create";
  const { user } = useSession();
  const showToast = useToastStore((state) => state.showToast);

  const stepIndex = useBeliefDraftStore((state) => state.stepIndex);
  const storedDraftValues = useBeliefDraftStore((state) =>
    state.mode === draftMode && state.beliefId === beliefId ? state.values : null,
  );
  const hydrateDraft = useBeliefDraftStore((state) => state.hydrate);
  const nextStep = useBeliefDraftStore((state) => state.nextStep);
  const previousStep = useBeliefDraftStore((state) => state.previousStep);
  const resetDraft = useBeliefDraftStore((state) => state.reset);
  const setDraftValues = useBeliefDraftStore((state) => state.setValues);

  const { data: existing, isLoading } = useCoreBelief(user?.id ?? null, beliefId);
  const saveMutation = useSaveCoreBelief(user?.id ?? null);

  const {
    control,
    formState: { errors, isSubmitting },
    handleSubmit,
    reset,
    setValue,
    trigger,
    watch,
  } = useForm<CoreBeliefFormSchema>({
    defaultValues: storedDraftValues ?? defaultValues,
    resolver: zodResolver(coreBeliefFormSchema),
  });

  const triggeringSituations = watch("triggeringSituations");
  const evidenceFor = watch("evidenceFor");
  const evidenceAgainst = watch("evidenceAgainst");
  const originalStrength = watch("originalBeliefStrength");
  const alternativeStrength = watch("alternativeBeliefStrength");

  const updateListItem = (
    fieldName: "triggeringSituations" | "evidenceFor" | "evidenceAgainst",
    index: number,
    value: string,
  ) => {
    const current = watch(fieldName);
    const next = [...current];
    next[index] = value;
    setValue(fieldName, next);
  };

  const appendListItem = (
    fieldName: "triggeringSituations" | "evidenceFor" | "evidenceAgainst",
  ) => {
    const current = watch(fieldName);
    setValue(fieldName, [...current, ""]);
  };

  const removeListItem = (
    fieldName: "triggeringSituations" | "evidenceFor" | "evidenceAgainst",
    index: number,
  ) => {
    const current = watch(fieldName);
    setValue(
      fieldName,
      current.filter((_, i) => i !== index),
    );
  };

  useEffect(() => {
    hydrateDraft(draftMode, beliefId);
  }, [draftMode, hydrateDraft, beliefId]);

  useEffect(() => {
    if (!existing || storedDraftValues) return;
    reset({
      beliefStatement: existing.beliefStatement,
      triggeringSituations:
        existing.triggeringSituations.length > 0 ? existing.triggeringSituations : [""],
      evidenceFor: existing.evidenceFor.length > 0 ? existing.evidenceFor : [""],
      evidenceAgainst: existing.evidenceAgainst.length > 0 ? existing.evidenceAgainst : [""],
      alternativeBelief: existing.alternativeBelief,
      originalBeliefStrength: existing.originalBeliefStrength,
      alternativeBeliefStrength: existing.alternativeBeliefStrength,
      reinforcementPlan: existing.reinforcementPlan,
      nextReviewDate: existing.nextReviewDate,
    });
  }, [existing, reset, storedDraftValues]);

  const steps = [
    { title: t("beliefs.step1"), fields: ["beliefStatement", "triggeringSituations"] as const },
    { title: t("beliefs.step2"), fields: ["evidenceFor", "evidenceAgainst"] as const },
    {
      title: t("beliefs.step3"),
      fields: [
        "alternativeBelief",
        "originalBeliefStrength",
        "alternativeBeliefStrength",
        "reinforcementPlan",
      ] as const,
    },
  ];

  const currentStep = steps[stepIndex];
  const isLastStep = stepIndex === steps.length - 1;

  const handleNext = async () => {
    const isValid = await trigger(currentStep.fields as unknown as (keyof CoreBeliefFormSchema)[]);
    if (isValid) nextStep(steps.length - 1);
  };

  const handleSave = handleSubmit(async (values) => {
    setDraftValues(values);
    try {
      // Drop empty strings from list inputs
      const sanitized = {
        ...values,
        triggeringSituations: values.triggeringSituations.filter((s) => s.trim().length > 0),
        evidenceFor: values.evidenceFor.filter((s) => s.trim().length > 0),
        evidenceAgainst: values.evidenceAgainst.filter((s) => s.trim().length > 0),
      };
      const saved = await saveMutation.mutateAsync({
        input: sanitized,
        beliefId: beliefId ?? undefined,
      });
      resetDraft();
      showToast({ title: t("common:feedback.saved"), tone: "success" });
      router.replace(`/cbt/beliefs/${saved.id}`);
    } catch (e) {
      const message = e instanceof Error ? e.message : t("beliefs.saveError");
      showToast({ title: t("common:feedback.problem"), description: message, tone: "error" });
    }
  });

  if (beliefId && isLoading) {
    return (
      <SafeAreaView className="flex-1 bg-background">
        <View className="flex-1 justify-center">
          <LoadingState title={t("beliefs.loading")} />
        </View>
      </SafeAreaView>
    );
  }

  const renderList = (
    label: string,
    hint: string,
    items: string[],
    fieldName: "triggeringSituations" | "evidenceFor" | "evidenceAgainst",
  ) => (
    <View className="gap-3">
      <Label>{label}</Label>
      <Text variant="muted">{hint}</Text>
      {items.map((value, index) => (
        <View key={`${fieldName}-${index}`} className="flex-row gap-2 items-start">
          <View className="flex-1">
            <Input
              accessibilityLabel={`${label} ${index + 1}`}
              onChangeText={(text) => updateListItem(fieldName, index, text)}
              placeholder={t("beliefs.listItemPlaceholder")}
              value={value}
            />
          </View>
          {items.length > 1 ? (
            <Button onPress={() => removeListItem(fieldName, index)} size="sm" variant="ghost">
              <Text>{t("beliefs.removeItem")}</Text>
            </Button>
          ) : null}
        </View>
      ))}
      <Button onPress={() => appendListItem(fieldName)} size="sm" variant="outline">
        <Text>{t("beliefs.addItem")}</Text>
      </Button>
    </View>
  );

  return (
    <MobileFormScreen
      footer={
        <View className="flex-row gap-3">
          {stepIndex > 0 ? (
            <View className="flex-1">
              <Button onPress={previousStep} variant="ghost">
                <Text>{t("beliefs.back")}</Text>
              </Button>
            </View>
          ) : null}
          <View className="flex-1">
            <Button
              disabled={isSubmitting || saveMutation.isPending}
              onPress={() => void (isLastStep ? handleSave() : handleNext())}
            >
              {isSubmitting || saveMutation.isPending ? (
                <ActivityIndicator color="#ffffff" />
              ) : null}
              <Text>
                {isSubmitting || saveMutation.isPending
                  ? t("beliefs.saving")
                  : isLastStep
                    ? t("beliefs.save")
                    : t("beliefs.continue")}
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
            <Text variant="h1">{beliefId ? t("beliefs.editTitle") : t("beliefs.newTitle")}</Text>
          </View>
          <Text variant="muted">
            {beliefId ? t("beliefs.editDescription") : t("beliefs.newDescription")}
          </Text>
        </View>

        <View className="flex-row flex-wrap gap-2">
          {steps.map((step, index) => {
            const isActive = stepIndex === index;
            return (
              <Button
                key={step.title}
                accessibilityState={{ disabled: index > stepIndex, selected: isActive }}
                disabled={index > stepIndex}
                onPress={() => {
                  if (index <= stepIndex) useBeliefDraftStore.getState().setStepIndex(index);
                }}
                size="sm"
                variant={isActive ? "secondary" : "ghost"}
              >
                <Text>{step.title}</Text>
              </Button>
            );
          })}
        </View>

        {stepIndex === 0 ? (
          <View className="gap-6">
            <Controller
              control={control}
              name="beliefStatement"
              render={({ field: { onBlur, onChange, value } }) => (
                <View className="gap-2">
                  <Label>{t("beliefs.beliefStatement")}</Label>
                  <Text variant="muted">{t("beliefs.beliefStatementHint")}</Text>
                  <Textarea
                    accessibilityLabel={t("beliefs.beliefStatement")}
                    onBlur={onBlur}
                    onChangeText={onChange}
                    placeholder={t("beliefs.beliefStatementPlaceholder")}
                    value={value}
                  />
                  {errors.beliefStatement?.message ? (
                    <Text className="text-sm text-destructive">
                      {errors.beliefStatement.message}
                    </Text>
                  ) : null}
                </View>
              )}
            />

            {renderList(
              t("beliefs.triggeringSituations"),
              t("beliefs.triggeringSituationsHint"),
              triggeringSituations,
              "triggeringSituations",
            )}
          </View>
        ) : null}

        {stepIndex === 1 ? (
          <View className="gap-6">
            {renderList(
              t("beliefs.evidenceFor"),
              t("beliefs.evidenceForHint"),
              evidenceFor,
              "evidenceFor",
            )}
            {renderList(
              t("beliefs.evidenceAgainst"),
              t("beliefs.evidenceAgainstHint"),
              evidenceAgainst,
              "evidenceAgainst",
            )}
          </View>
        ) : null}

        {stepIndex === 2 ? (
          <View className="gap-6">
            <Controller
              control={control}
              name="alternativeBelief"
              render={({ field: { onBlur, onChange, value } }) => (
                <View className="gap-2">
                  <Label>{t("beliefs.alternativeBelief")}</Label>
                  <Text variant="muted">{t("beliefs.alternativeBeliefHint")}</Text>
                  <Textarea
                    accessibilityLabel={t("beliefs.alternativeBelief")}
                    onBlur={onBlur}
                    onChangeText={onChange}
                    placeholder={t("beliefs.alternativeBeliefPlaceholder")}
                    value={value}
                  />
                  {errors.alternativeBelief?.message ? (
                    <Text className="text-sm text-destructive">
                      {errors.alternativeBelief.message}
                    </Text>
                  ) : null}
                </View>
              )}
            />

            <View className="gap-2">
              <Label>{t("beliefs.originalStrength")}</Label>
              <Text variant="muted">{t("beliefs.originalStrengthHint")}</Text>
              <NumberRating
                max={100}
                min={0}
                step={10}
                value={originalStrength}
                onChange={(n) => setValue("originalBeliefStrength", n)}
              />
            </View>

            <View className="gap-2">
              <Label>{t("beliefs.alternativeStrength")}</Label>
              <Text variant="muted">{t("beliefs.alternativeStrengthHint")}</Text>
              <NumberRating
                max={100}
                min={0}
                step={10}
                value={alternativeStrength}
                onChange={(n) => setValue("alternativeBeliefStrength", n)}
              />
            </View>

            <Controller
              control={control}
              name="reinforcementPlan"
              render={({ field: { onBlur, onChange, value } }) => (
                <View className="gap-2">
                  <Label>{t("beliefs.reinforcementPlan")}</Label>
                  <Text variant="muted">{t("beliefs.reinforcementPlanHint")}</Text>
                  <Textarea
                    accessibilityLabel={t("beliefs.reinforcementPlan")}
                    onBlur={onBlur}
                    onChangeText={onChange}
                    placeholder={t("beliefs.reinforcementPlanPlaceholder")}
                    value={value}
                  />
                </View>
              )}
            />

            <Controller
              control={control}
              name="nextReviewDate"
              render={({ field: { onChange, value } }) => (
                <View className="gap-2">
                  <Label>{t("beliefs.nextReviewDate")}</Label>
                  <Text variant="muted">{t("beliefs.nextReviewDateHint")}</Text>
                  <Input
                    accessibilityLabel={t("beliefs.nextReviewDate")}
                    onChangeText={(text) => onChange(text.length > 0 ? text : null)}
                    placeholder="YYYY-MM-DD"
                    value={value ?? ""}
                  />
                </View>
              )}
            />

            <Card>
              <CardHeader>
                <CardTitle>{t("beliefs.summaryTitle")}</CardTitle>
              </CardHeader>
              <View className="px-6 pb-6 gap-2">
                <Text>{t("beliefs.summaryOriginal", { value: originalStrength })}</Text>
                <Text>{t("beliefs.summaryAlternative", { value: alternativeStrength })}</Text>
              </View>
            </Card>
          </View>
        ) : null}
      </View>
    </MobileFormScreen>
  );
}
