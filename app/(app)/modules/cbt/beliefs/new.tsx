import { zodResolver } from "@hookform/resolvers/zod";
import { router, useLocalSearchParams } from "expo-router";
import { Controller, useForm } from "react-hook-form";
import { View } from "react-native";
import { useEffect, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { SafeAreaView } from "react-native-safe-area-context";

import { Button } from "@/src/components/react-native-reusables/button";
import { Card, CardHeader, CardTitle } from "@/src/components/react-native-reusables/card";
import { Input } from "@/src/components/react-native-reusables/input";
import { Label } from "@/src/components/react-native-reusables/label";
import { Text } from "@/src/components/react-native-reusables/text";
import { Textarea } from "@/src/components/react-native-reusables/textarea";
import { NumberRating } from "@/src/components/app/number-rating";
import { LoadingState } from "@/src/components/app/screen-state";
import { WizardScreen } from "@/src/components/app/wizard-screen";
import { useCoreBelief, useSaveCoreBelief } from "@/src/features/beliefs/queries";
import { coreBeliefFormSchema, type CoreBeliefFormSchema } from "@/src/features/beliefs/schemas";
import { useWizardDraft, selectWizardDraftValues } from "@/src/lib/use-wizard-draft";
import { useSession } from "@/src/providers/session-provider";
import { useBeliefDraftStore } from "@/src/stores/belief-draft-store";

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

  const storedDraftValues = useBeliefDraftStore(
    selectWizardDraftValues<CoreBeliefFormSchema>(draftMode, beliefId),
  );

  const { data: existing, isLoading } = useCoreBelief(user?.id ?? null, beliefId);
  const saveMutation = useSaveCoreBelief(user?.id ?? null);

  const form = useForm<CoreBeliefFormSchema>({
    defaultValues: storedDraftValues ?? defaultValues,
    resolver: zodResolver(coreBeliefFormSchema),
  });
  const {
    control,
    formState: { errors },
    reset,
    setValue,
    watch,
  } = form;

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

  const steps: { title: string; fields: readonly (keyof CoreBeliefFormSchema)[] }[] = [
    { title: t("beliefs.step1"), fields: ["beliefStatement", "triggeringSituations"] },
    { title: t("beliefs.step2"), fields: ["evidenceFor", "evidenceAgainst"] },
    {
      title: t("beliefs.step3"),
      fields: [
        "alternativeBelief",
        "originalBeliefStrength",
        "alternativeBeliefStrength",
        "reinforcementPlan",
      ],
    },
  ];

  const wizard = useWizardDraft({
    store: useBeliefDraftStore,
    draftMode,
    entityId: beliefId,
    stepFields: steps.map((s) => s.fields),
    form,
    onSave: (values) => {
      const sanitized = {
        ...values,
        triggeringSituations: values.triggeringSituations.filter((s) => s.trim().length > 0),
        evidenceFor: values.evidenceFor.filter((s) => s.trim().length > 0),
        evidenceAgainst: values.evidenceAgainst.filter((s) => s.trim().length > 0),
      };
      return saveMutation.mutateAsync({
        input: sanitized,
        beliefId: beliefId ?? undefined,
      });
    },
    onSaved: (saved) =>
      router.replace(`/modules/cbt/beliefs/${saved.id}` as Parameters<typeof router.replace>[0]),
    toastLabels: {
      saved: t("common:feedback.saved"),
      problem: t("common:feedback.problem"),
      fallbackError: t("beliefs.saveError"),
    },
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
    <WizardScreen
      title={beliefId ? t("beliefs.editTitle") : t("beliefs.newTitle")}
      description={beliefId ? t("beliefs.editDescription") : t("beliefs.newDescription")}
      steps={steps}
      stepIndex={wizard.stepIndex}
      onJumpToStep={wizard.goToStep}
      onBack={wizard.previousStep}
      onPrimary={() => void (wizard.isLastStep ? wizard.handleSave() : wizard.handleNext())}
      primaryLabel={wizard.isLastStep ? t("beliefs.save") : t("beliefs.continue")}
      pendingLabel={t("beliefs.saving")}
      backLabel={t("beliefs.back")}
      isPending={wizard.isPending}
    >
      {wizard.stepIndex === 0 ? (
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
                  <Text className="text-sm text-destructive">{errors.beliefStatement.message}</Text>
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

      {wizard.stepIndex === 1 ? (
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

      {wizard.stepIndex === 2 ? (
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
    </WizardScreen>
  );
}
