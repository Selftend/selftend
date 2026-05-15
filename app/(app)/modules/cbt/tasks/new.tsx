import { zodResolver } from "@hookform/resolvers/zod";
import { router } from "expo-router";
import { Controller, useFieldArray, useForm } from "react-hook-form";
import { ActivityIndicator, View } from "react-native";
import { useTranslation } from "react-i18next";

import { Button } from "@/src/components/react-native-reusables/button";
import { Card, CardHeader, CardTitle } from "@/src/components/react-native-reusables/card";
import { Input } from "@/src/components/react-native-reusables/input";
import { Label } from "@/src/components/react-native-reusables/label";
import { Text } from "@/src/components/react-native-reusables/text";
import { Textarea } from "@/src/components/react-native-reusables/textarea";
import { MobileFormScreen } from "@/src/components/app/mobile-form-screen";
import { useSaveTask } from "@/src/features/procrastination/queries";
import {
  procrastinationTaskFormSchema,
  type ProcrastinationTaskFormSchema,
} from "@/src/features/procrastination/schemas";
import { useSession } from "@/src/providers/session-provider";
import { useProcrastinationDraftStore } from "@/src/stores/procrastination-draft-store";
import { useToastStore } from "@/src/stores/toast-store";
import { BackButton } from "@/src/components/app/back-button";

const defaultValues: ProcrastinationTaskFormSchema = {
  taskDescription: "",
  avoidanceReason: "",
  fearThought: "",
  challengedThought: "",
  deadline: null,
  reward: "",
  steps: [{ description: "", estimatedMinutes: null }],
};

export default function NewTaskScreen() {
  const { t } = useTranslation("cbt");
  const { user } = useSession();
  const showToast = useToastStore((state) => state.showToast);

  const stepIndex = useProcrastinationDraftStore((state) => state.stepIndex);
  const storedDraftValues = useProcrastinationDraftStore((state) => state.values);
  const nextStep = useProcrastinationDraftStore((state) => state.nextStep);
  const previousStep = useProcrastinationDraftStore((state) => state.previousStep);
  const resetDraft = useProcrastinationDraftStore((state) => state.reset);
  const setDraftValues = useProcrastinationDraftStore((state) => state.setValues);

  const saveMutation = useSaveTask(user?.id ?? null);

  const {
    control,
    formState: { errors, isSubmitting },
    handleSubmit,
    trigger,
  } = useForm<ProcrastinationTaskFormSchema>({
    defaultValues: storedDraftValues ?? defaultValues,
    resolver: zodResolver(procrastinationTaskFormSchema),
  });

  const stepArray = useFieldArray({ control, name: "steps" });

  const wizardSteps = [
    { title: t("tasks.step1"), fields: ["taskDescription"] as const },
    { title: t("tasks.step2"), fields: ["fearThought"] as const },
    { title: t("tasks.step3"), fields: ["challengedThought"] as const },
    { title: t("tasks.step4"), fields: ["steps"] as const },
    { title: t("tasks.step5"), fields: ["reward", "deadline"] as const },
  ];

  const currentStep = wizardSteps[stepIndex];
  const isLastStep = stepIndex === wizardSteps.length - 1;

  const handleNext = async () => {
    const isValid = await trigger(
      currentStep.fields as unknown as (keyof ProcrastinationTaskFormSchema)[],
    );
    if (isValid) nextStep(wizardSteps.length - 1);
  };

  const handleSave = handleSubmit(async (values) => {
    setDraftValues(values);
    try {
      const saved = await saveMutation.mutateAsync({
        input: {
          taskDescription: values.taskDescription,
          avoidanceReason: values.avoidanceReason,
          fearThought: values.fearThought,
          challengedThought: values.challengedThought,
          deadline: values.deadline,
          reward: values.reward,
        },
        steps: values.steps,
      });
      resetDraft();
      showToast({ title: t("common:feedback.saved"), tone: "success" });
      router.replace(`/modules/cbt/tasks/${saved.id}`);
    } catch (e) {
      const message = e instanceof Error ? e.message : t("tasks.saveError");
      showToast({ title: t("common:feedback.problem"), description: message, tone: "error" });
    }
  });

  return (
    <MobileFormScreen
      footer={
        <View className="flex-row gap-3">
          {stepIndex > 0 ? (
            <View className="flex-1">
              <Button onPress={previousStep} variant="ghost">
                <Text>{t("tasks.back")}</Text>
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
                  ? t("tasks.saving")
                  : isLastStep
                    ? t("tasks.save")
                    : t("tasks.continue")}
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
            <Text variant="h1">{t("tasks.newTitle")}</Text>
          </View>
          <Text variant="muted">{t("tasks.newDescription")}</Text>
        </View>

        <View className="flex-row flex-wrap gap-2">
          {wizardSteps.map((step, index) => {
            const isActive = stepIndex === index;
            return (
              <Button
                key={step.title}
                accessibilityState={{ disabled: index > stepIndex, selected: isActive }}
                disabled={index > stepIndex}
                onPress={() => {
                  if (index <= stepIndex)
                    useProcrastinationDraftStore.getState().setStepIndex(index);
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
              name="taskDescription"
              render={({ field: { onBlur, onChange, value } }) => (
                <View className="gap-2">
                  <Label>{t("tasks.taskDescription")}</Label>
                  <Text variant="muted">{t("tasks.taskDescriptionHint")}</Text>
                  <Textarea
                    accessibilityLabel={t("tasks.taskDescription")}
                    onBlur={onBlur}
                    onChangeText={onChange}
                    placeholder={t("tasks.taskDescriptionPlaceholder")}
                    value={value}
                  />
                  {errors.taskDescription?.message ? (
                    <Text className="text-sm text-destructive">
                      {errors.taskDescription.message}
                    </Text>
                  ) : null}
                </View>
              )}
            />

            <Controller
              control={control}
              name="avoidanceReason"
              render={({ field: { onBlur, onChange, value } }) => (
                <View className="gap-2">
                  <Label>{t("tasks.avoidanceReason")}</Label>
                  <Text variant="muted">{t("tasks.avoidanceReasonHint")}</Text>
                  <Textarea
                    accessibilityLabel={t("tasks.avoidanceReason")}
                    onBlur={onBlur}
                    onChangeText={onChange}
                    placeholder={t("tasks.avoidanceReasonPlaceholder")}
                    value={value}
                  />
                </View>
              )}
            />
          </View>
        ) : null}

        {stepIndex === 1 ? (
          <Controller
            control={control}
            name="fearThought"
            render={({ field: { onBlur, onChange, value } }) => (
              <View className="gap-2">
                <Label>{t("tasks.fearThought")}</Label>
                <Text variant="muted">{t("tasks.fearThoughtHint")}</Text>
                <Textarea
                  accessibilityLabel={t("tasks.fearThought")}
                  onBlur={onBlur}
                  onChangeText={onChange}
                  placeholder={t("tasks.fearThoughtPlaceholder")}
                  value={value}
                />
              </View>
            )}
          />
        ) : null}

        {stepIndex === 2 ? (
          <Controller
            control={control}
            name="challengedThought"
            render={({ field: { onBlur, onChange, value } }) => (
              <View className="gap-2">
                <Label>{t("tasks.challengedThought")}</Label>
                <Text variant="muted">{t("tasks.challengedThoughtHint")}</Text>
                <Textarea
                  accessibilityLabel={t("tasks.challengedThought")}
                  onBlur={onBlur}
                  onChangeText={onChange}
                  placeholder={t("tasks.challengedThoughtPlaceholder")}
                  value={value}
                />
              </View>
            )}
          />
        ) : null}

        {stepIndex === 3 ? (
          <View className="gap-4">
            <View className="gap-2">
              <Label>{t("tasks.stepsLabel")}</Label>
              <Text variant="muted">{t("tasks.stepsHint")}</Text>
              <Text variant="muted">{t("tasks.smallestStepDescription")}</Text>
            </View>
            {stepArray.fields.map((field, index) => (
              <Card key={field.id}>
                <CardHeader>
                  <CardTitle>{t("tasks.stepNumber", { n: index + 1 })}</CardTitle>
                </CardHeader>
                <View className="gap-3 px-6 pb-6">
                  <Controller
                    control={control}
                    name={`steps.${index}.description`}
                    render={({ field: { onBlur, onChange, value } }) => (
                      <View className="gap-2">
                        <Label>{t("tasks.stepDescription")}</Label>
                        <Input
                          accessibilityLabel={t("tasks.stepDescription")}
                          onBlur={onBlur}
                          onChangeText={onChange}
                          placeholder={t("tasks.stepDescriptionPlaceholder")}
                          value={value}
                        />
                        {errors.steps?.[index]?.description?.message ? (
                          <Text className="text-sm text-destructive">
                            {errors.steps[index]!.description!.message}
                          </Text>
                        ) : null}
                      </View>
                    )}
                  />

                  <Controller
                    control={control}
                    name={`steps.${index}.estimatedMinutes`}
                    render={({ field: { onChange, value } }) => (
                      <View className="gap-2">
                        <Label>{t("tasks.stepMinutes")}</Label>
                        <Input
                          accessibilityLabel={t("tasks.stepMinutes")}
                          keyboardType="numeric"
                          onChangeText={(text) => {
                            const n = parseInt(text, 10);
                            onChange(Number.isNaN(n) ? null : n);
                          }}
                          placeholder="15"
                          value={value !== null ? String(value) : ""}
                        />
                      </View>
                    )}
                  />

                  {stepArray.fields.length > 1 ? (
                    <Button onPress={() => stepArray.remove(index)} size="sm" variant="ghost">
                      <Text>{t("tasks.removeStep")}</Text>
                    </Button>
                  ) : null}
                </View>
              </Card>
            ))}
            <Button
              onPress={() => stepArray.append({ description: "", estimatedMinutes: null })}
              variant="outline"
            >
              <Text>{t("tasks.addStep")}</Text>
            </Button>
          </View>
        ) : null}

        {stepIndex === 4 ? (
          <View className="gap-6">
            <Controller
              control={control}
              name="reward"
              render={({ field: { onBlur, onChange, value } }) => (
                <View className="gap-2">
                  <Label>{t("tasks.reward")}</Label>
                  <Text variant="muted">{t("tasks.rewardHint")}</Text>
                  <Input
                    accessibilityLabel={t("tasks.reward")}
                    onBlur={onBlur}
                    onChangeText={onChange}
                    placeholder={t("tasks.rewardPlaceholder")}
                    value={value}
                  />
                </View>
              )}
            />

            <Controller
              control={control}
              name="deadline"
              render={({ field: { onChange, value } }) => (
                <View className="gap-2">
                  <Label>{t("tasks.deadline")}</Label>
                  <Text variant="muted">{t("tasks.deadlineHint")}</Text>
                  <Input
                    accessibilityLabel={t("tasks.deadline")}
                    onChangeText={(text) => onChange(text.length > 0 ? text : null)}
                    placeholder="YYYY-MM-DD"
                    value={value ?? ""}
                  />
                </View>
              )}
            />
          </View>
        ) : null}
      </View>
    </MobileFormScreen>
  );
}
