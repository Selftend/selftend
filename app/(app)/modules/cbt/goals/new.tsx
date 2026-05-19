import { zodResolver } from "@hookform/resolvers/zod";
import { router, useLocalSearchParams } from "expo-router";
import { Controller, useFieldArray, useForm } from "react-hook-form";
import { View } from "react-native";
import { useEffect, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { SafeAreaView } from "react-native-safe-area-context";

import { Button } from "@/src/components/react-native-reusables/button";
import { Card, CardHeader, CardTitle } from "@/src/components/react-native-reusables/card";
import { Label } from "@/src/components/react-native-reusables/label";
import { Text } from "@/src/components/react-native-reusables/text";
import { Textarea } from "@/src/components/react-native-reusables/textarea";
import { Input } from "@/src/components/react-native-reusables/input";
import { LoadingState } from "@/src/components/app/screen-state";
import { WizardScreen } from "@/src/components/app/wizard-screen";
import { goalTypes } from "@/src/constants/goal-types";
import { lifeDomains } from "@/src/constants/life-domains";
import { useGoal, useMilestones, useSaveGoal } from "@/src/features/goals/queries";
import { goalFormSchema, type GoalFormSchema } from "@/src/features/goals/schemas";
import { useWizardDraft, selectWizardDraftValues } from "@/src/lib/use-wizard-draft";
import { useSession } from "@/src/providers/session-provider";
import { useGoalDraftStore } from "@/src/stores/goal-draft-store";

const defaultValues: GoalFormSchema = {
  lifeDomain: "",
  goalType: "",
  title: "",
  description: "",
  targetDate: null,
  milestones: [{ description: "", targetDate: null }],
};

export default function NewGoalScreen() {
  const { t } = useTranslation("cbt");
  const { goalId: rawGoalId } = useLocalSearchParams<{ goalId?: string }>();
  const goalId = useMemo(
    () => (typeof rawGoalId === "string" && rawGoalId.length > 0 ? rawGoalId : null),
    [rawGoalId],
  );
  const draftMode = goalId ? "edit" : "create";
  const { user } = useSession();

  const storedDraftValues = useGoalDraftStore(
    selectWizardDraftValues<GoalFormSchema>(draftMode, goalId),
  );

  const { data: existingGoal, isLoading: goalLoading } = useGoal(user?.id ?? null, goalId);
  const { data: existingMilestones, isLoading: milestonesLoading } = useMilestones(
    user?.id ?? null,
    goalId,
  );
  const saveMutation = useSaveGoal(user?.id ?? null);

  const form = useForm<GoalFormSchema>({
    defaultValues: storedDraftValues ?? defaultValues,
    resolver: zodResolver(goalFormSchema),
  });
  const {
    control,
    formState: { errors },
    reset,
    setValue,
    watch,
  } = form;

  const { fields, append, remove } = useFieldArray({ control, name: "milestones" });
  const selectedDomain = watch("lifeDomain");
  const selectedType = watch("goalType");

  useEffect(() => {
    if (!existingGoal || !existingMilestones || storedDraftValues) return;
    reset({
      lifeDomain: existingGoal.lifeDomain,
      goalType: existingGoal.goalType,
      title: existingGoal.title,
      description: existingGoal.description,
      targetDate: existingGoal.targetDate,
      milestones:
        existingMilestones.length > 0
          ? existingMilestones.map((m) => ({
              description: m.description,
              targetDate: m.targetDate,
            }))
          : [{ description: "", targetDate: null }],
    });
  }, [existingGoal, existingMilestones, reset, storedDraftValues]);

  const steps: { title: string; fields: readonly (keyof GoalFormSchema)[] }[] = [
    { title: t("goals.step1"), fields: ["lifeDomain", "goalType"] },
    { title: t("goals.step2"), fields: ["title", "description", "targetDate"] },
    { title: t("goals.step3"), fields: ["milestones"] },
  ];

  const wizard = useWizardDraft({
    store: useGoalDraftStore,
    draftMode,
    entityId: goalId,
    stepFields: steps.map((s) => s.fields),
    form,
    onSave: (values) =>
      saveMutation.mutateAsync({
        input: {
          title: values.title,
          description: values.description,
          lifeDomain: values.lifeDomain,
          goalType: values.goalType,
          targetDate: values.targetDate,
        },
        goalId: goalId ?? undefined,
        milestones: values.milestones,
      }),
    onSaved: (saved) =>
      router.replace(`/modules/cbt/goals/${saved.id}` as Parameters<typeof router.replace>[0]),
    toastLabels: {
      saved: t("common:feedback.saved"),
      problem: t("common:feedback.problem"),
      fallbackError: t("goals.saveError"),
    },
  });

  if (goalId && (goalLoading || milestonesLoading)) {
    return (
      <SafeAreaView className="flex-1 bg-background">
        <View className="flex-1 justify-center">
          <LoadingState title={t("goals.loading")} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <WizardScreen
      title={goalId ? t("goals.editTitle") : t("goals.newTitle")}
      description={goalId ? t("goals.editDescription") : t("goals.newDescription")}
      steps={steps}
      stepIndex={wizard.stepIndex}
      onJumpToStep={wizard.goToStep}
      onBack={wizard.previousStep}
      onPrimary={() => void (wizard.isLastStep ? wizard.handleSave() : wizard.handleNext())}
      primaryLabel={wizard.isLastStep ? t("goals.save") : t("goals.continue")}
      pendingLabel={t("goals.saving")}
      backLabel={t("goals.back")}
      isPending={wizard.isPending}
    >
      {wizard.stepIndex === 0 ? (
        <View className="gap-6">
          <View className="gap-3">
            <Label>{t("goals.lifeDomain")}</Label>
            <Text variant="muted">{t("goals.lifeDomainHint")}</Text>
            <View className="flex-row flex-wrap gap-2">
              {lifeDomains.map((domain) => (
                <Button
                  key={domain}
                  onPress={() => setValue("lifeDomain", domain)}
                  size="sm"
                  variant={selectedDomain === domain ? "default" : "outline"}
                >
                  <Text>{t(`goals.domain.${domain}`)}</Text>
                </Button>
              ))}
            </View>
            {errors.lifeDomain?.message ? (
              <Text className="text-sm text-destructive">{errors.lifeDomain.message}</Text>
            ) : null}
          </View>

          <View className="gap-3">
            <Label>{t("goals.goalType")}</Label>
            <Text variant="muted">{t("goals.goalTypeHint")}</Text>
            <View className="flex-row flex-wrap gap-2">
              {goalTypes.map((type) => (
                <Button
                  key={type}
                  onPress={() => setValue("goalType", type)}
                  size="sm"
                  variant={selectedType === type ? "default" : "outline"}
                >
                  <Text>{t(`goals.type.${type}`)}</Text>
                </Button>
              ))}
            </View>
            {errors.goalType?.message ? (
              <Text className="text-sm text-destructive">{errors.goalType.message}</Text>
            ) : null}
          </View>
        </View>
      ) : null}

      {wizard.stepIndex === 1 ? (
        <View className="gap-6">
          <Controller
            control={control}
            name="title"
            render={({ field: { onBlur, onChange, value } }) => (
              <View className="gap-2">
                <Label>{t("goals.titleLabel")}</Label>
                <Input
                  accessibilityLabel={t("goals.titleLabel")}
                  onBlur={onBlur}
                  onChangeText={onChange}
                  placeholder={t("goals.titlePlaceholder")}
                  value={value}
                />
                {errors.title?.message ? (
                  <Text className="text-sm text-destructive">{errors.title.message}</Text>
                ) : null}
              </View>
            )}
          />

          <Controller
            control={control}
            name="description"
            render={({ field: { onBlur, onChange, value } }) => (
              <View className="gap-2">
                <Label>{t("goals.descriptionLabel")}</Label>
                <Textarea
                  accessibilityLabel={t("goals.descriptionLabel")}
                  onBlur={onBlur}
                  onChangeText={onChange}
                  placeholder={t("goals.descriptionPlaceholder")}
                  value={value}
                />
              </View>
            )}
          />

          <Controller
            control={control}
            name="targetDate"
            render={({ field: { onChange, value } }) => (
              <View className="gap-2">
                <Label>{t("goals.targetDate")}</Label>
                <Text variant="muted">{t("goals.targetDateHint")}</Text>
                <Input
                  accessibilityLabel={t("goals.targetDate")}
                  onChangeText={(text) => onChange(text.length > 0 ? text : null)}
                  placeholder="YYYY-MM-DD"
                  value={value ?? ""}
                />
              </View>
            )}
          />
        </View>
      ) : null}

      {wizard.stepIndex === 2 ? (
        <View className="gap-4">
          <View className="gap-2">
            <Label>{t("goals.milestonesLabel")}</Label>
            <Text variant="muted">{t("goals.milestonesHint")}</Text>
          </View>

          {fields.map((field, index) => (
            <Card key={field.id}>
              <CardHeader>
                <CardTitle>{t("goals.milestone", { n: index + 1 })}</CardTitle>
              </CardHeader>
              <View className="gap-3 px-6 pb-6">
                <Controller
                  control={control}
                  name={`milestones.${index}.description`}
                  render={({ field: { onBlur, onChange, value } }) => (
                    <View className="gap-2">
                      <Label>{t("goals.milestoneDescription")}</Label>
                      <Input
                        accessibilityLabel={t("goals.milestoneDescription")}
                        onBlur={onBlur}
                        onChangeText={onChange}
                        placeholder={t("goals.milestonePlaceholder")}
                        value={value}
                      />
                      {errors.milestones?.[index]?.description?.message ? (
                        <Text className="text-sm text-destructive">
                          {errors.milestones[index]!.description!.message}
                        </Text>
                      ) : null}
                    </View>
                  )}
                />

                {fields.length > 1 ? (
                  <Button onPress={() => remove(index)} size="sm" variant="ghost">
                    <Text>{t("goals.removeMilestone")}</Text>
                  </Button>
                ) : null}
              </View>
            </Card>
          ))}

          <Button onPress={() => append({ description: "", targetDate: null })} variant="outline">
            <Text>{t("goals.addMilestone")}</Text>
          </Button>

          {errors.milestones?.message ? (
            <Text className="text-sm text-destructive">{errors.milestones.message}</Text>
          ) : null}
        </View>
      ) : null}
    </WizardScreen>
  );
}
