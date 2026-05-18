import { zodResolver } from "@hookform/resolvers/zod";
import { router, useLocalSearchParams } from "expo-router";
import { Controller, useFieldArray, useForm } from "react-hook-form";
import { ActivityIndicator, View } from "react-native";
import { useEffect, useMemo } from "react";
import { useTranslation } from "react-i18next";

import { Button } from "@/src/components/react-native-reusables/button";
import { Card, CardHeader, CardTitle } from "@/src/components/react-native-reusables/card";
import { Label } from "@/src/components/react-native-reusables/label";
import { Text } from "@/src/components/react-native-reusables/text";
import { Textarea } from "@/src/components/react-native-reusables/textarea";
import { Input } from "@/src/components/react-native-reusables/input";
import { MobileFormScreen } from "@/src/components/app/mobile-form-screen";
import { LoadingState } from "@/src/components/app/screen-state";
import { goalTypes } from "@/src/constants/goal-types";
import { lifeDomains } from "@/src/constants/life-domains";
import { useGoal, useMilestones, useSaveGoal } from "@/src/features/goals/queries";
import { goalFormSchema, type GoalFormSchema } from "@/src/features/goals/schemas";
import { useSession } from "@/src/providers/session-provider";
import { useGoalDraftStore } from "@/src/stores/goal-draft-store";
import { useToastStore } from "@/src/stores/toast-store";
import { SafeAreaView } from "react-native-safe-area-context";
import { BackButton } from "@/src/components/app/back-button";

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
  const showToast = useToastStore((state) => state.showToast);

  const stepIndex = useGoalDraftStore((state) => state.stepIndex);
  const storedDraftValues = useGoalDraftStore((state) =>
    state.mode === draftMode && state.entityId === goalId ? state.values : null,
  );
  const hydrateDraft = useGoalDraftStore((state) => state.hydrate);
  const nextStep = useGoalDraftStore((state) => state.nextStep);
  const previousStep = useGoalDraftStore((state) => state.previousStep);
  const resetDraft = useGoalDraftStore((state) => state.reset);
  const setDraftValues = useGoalDraftStore((state) => state.setValues);

  const { data: existingGoal, isLoading: goalLoading } = useGoal(user?.id ?? null, goalId);
  const { data: existingMilestones, isLoading: milestonesLoading } = useMilestones(
    user?.id ?? null,
    goalId,
  );
  const saveMutation = useSaveGoal(user?.id ?? null);

  const {
    control,
    formState: { errors, isSubmitting },
    handleSubmit,
    reset,
    setValue,
    trigger,
    watch,
  } = useForm<GoalFormSchema>({
    defaultValues: storedDraftValues ?? defaultValues,
    resolver: zodResolver(goalFormSchema),
  });

  const { fields, append, remove } = useFieldArray({ control, name: "milestones" });
  const selectedDomain = watch("lifeDomain");
  const selectedType = watch("goalType");

  useEffect(() => {
    hydrateDraft(draftMode, goalId);
  }, [draftMode, hydrateDraft, goalId]);

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

  const steps = [
    { title: t("goals.step1"), fields: ["lifeDomain", "goalType"] as const },
    { title: t("goals.step2"), fields: ["title", "description", "targetDate"] as const },
    { title: t("goals.step3"), fields: ["milestones"] as const },
  ];

  const currentStep = steps[stepIndex];
  const isLastStep = stepIndex === steps.length - 1;

  const handleNext = async () => {
    const isValid = await trigger(currentStep.fields as unknown as (keyof GoalFormSchema)[]);
    if (isValid) nextStep(steps.length - 1);
  };

  const handleSave = handleSubmit(async (values) => {
    setDraftValues(values);
    try {
      const saved = await saveMutation.mutateAsync({
        input: {
          title: values.title,
          description: values.description,
          lifeDomain: values.lifeDomain,
          goalType: values.goalType,
          targetDate: values.targetDate,
        },
        goalId: goalId ?? undefined,
        milestones: values.milestones,
      });
      resetDraft();
      showToast({ title: t("common:feedback.saved"), tone: "success" });
      router.replace(`/modules/cbt/goals/${saved.id}` as Parameters<typeof router.replace>[0]);
    } catch (e) {
      const message = e instanceof Error ? e.message : t("goals.saveError");
      showToast({ title: t("common:feedback.problem"), description: message, tone: "error" });
    }
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
    <MobileFormScreen
      footer={
        <View className="flex-row gap-3">
          {stepIndex > 0 ? (
            <View className="flex-1">
              <Button onPress={previousStep} variant="ghost">
                <Text>{t("goals.back")}</Text>
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
                  ? t("goals.saving")
                  : isLastStep
                    ? t("goals.save")
                    : t("goals.continue")}
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
            <Text variant="h1">{goalId ? t("goals.editTitle") : t("goals.newTitle")}</Text>
          </View>
          <Text variant="muted">
            {goalId ? t("goals.editDescription") : t("goals.newDescription")}
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
                  if (index <= stepIndex) useGoalDraftStore.getState().setStepIndex(index);
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

        {stepIndex === 1 ? (
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

        {stepIndex === 2 ? (
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
      </View>
    </MobileFormScreen>
  );
}
