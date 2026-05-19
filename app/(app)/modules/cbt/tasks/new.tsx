import { zodResolver } from "@hookform/resolvers/zod";
import { router } from "expo-router";
import { Controller, useFieldArray, useForm } from "react-hook-form";
import { View } from "react-native";
import { useTranslation } from "react-i18next";

import { Button } from "@/src/components/react-native-reusables/button";
import { Card, CardHeader, CardTitle } from "@/src/components/react-native-reusables/card";
import { Input } from "@/src/components/react-native-reusables/input";
import { Label } from "@/src/components/react-native-reusables/label";
import { Text } from "@/src/components/react-native-reusables/text";
import { Textarea } from "@/src/components/react-native-reusables/textarea";
import { WizardScreen } from "@/src/components/app/wizard-screen";
import { useSaveTask } from "@/src/features/procrastination/queries";
import {
  procrastinationTaskFormSchema,
  type ProcrastinationTaskFormSchema,
} from "@/src/features/procrastination/schemas";
import { useWizardDraft, selectWizardDraftValues } from "@/src/lib/use-wizard-draft";
import { useSession } from "@/src/providers/session-provider";
import { useProcrastinationDraftStore } from "@/src/stores/procrastination-draft-store";

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

  const storedDraftValues = useProcrastinationDraftStore(
    selectWizardDraftValues<ProcrastinationTaskFormSchema>("create", null),
  );

  const saveMutation = useSaveTask(user?.id ?? null);

  const form = useForm<ProcrastinationTaskFormSchema>({
    defaultValues: storedDraftValues ?? defaultValues,
    resolver: zodResolver(procrastinationTaskFormSchema),
  });
  const {
    control,
    formState: { errors },
  } = form;

  const stepArray = useFieldArray({ control, name: "steps" });

  const wizardSteps: {
    title: string;
    fields: readonly (keyof ProcrastinationTaskFormSchema)[];
  }[] = [
    { title: t("tasks.step1"), fields: ["taskDescription"] },
    { title: t("tasks.step2"), fields: ["fearThought"] },
    { title: t("tasks.step3"), fields: ["challengedThought"] },
    { title: t("tasks.step4"), fields: ["steps"] },
    { title: t("tasks.step5"), fields: ["reward", "deadline"] },
  ];

  const wizard = useWizardDraft({
    store: useProcrastinationDraftStore,
    draftMode: "create",
    entityId: null,
    stepFields: wizardSteps.map((s) => s.fields),
    form,
    onSave: (values) =>
      saveMutation.mutateAsync({
        input: {
          taskDescription: values.taskDescription,
          avoidanceReason: values.avoidanceReason,
          fearThought: values.fearThought,
          challengedThought: values.challengedThought,
          deadline: values.deadline,
          reward: values.reward,
        },
        steps: values.steps,
      }),
    onSaved: (saved) =>
      router.replace(`/modules/cbt/tasks/${saved.id}` as Parameters<typeof router.replace>[0]),
    toastLabels: {
      saved: t("common:feedback.saved"),
      problem: t("common:feedback.problem"),
      fallbackError: t("tasks.saveError"),
    },
  });

  return (
    <WizardScreen
      title={t("tasks.newTitle")}
      description={t("tasks.newDescription")}
      steps={wizardSteps}
      stepIndex={wizard.stepIndex}
      onJumpToStep={wizard.goToStep}
      onBack={wizard.previousStep}
      onPrimary={() => void (wizard.isLastStep ? wizard.handleSave() : wizard.handleNext())}
      primaryLabel={wizard.isLastStep ? t("tasks.save") : t("tasks.continue")}
      pendingLabel={t("tasks.saving")}
      backLabel={t("tasks.back")}
      isPending={wizard.isPending}
    >
      {wizard.stepIndex === 0 ? (
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
                  <Text className="text-sm text-destructive">{errors.taskDescription.message}</Text>
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

      {wizard.stepIndex === 1 ? (
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

      {wizard.stepIndex === 2 ? (
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

      {wizard.stepIndex === 3 ? (
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

      {wizard.stepIndex === 4 ? (
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
    </WizardScreen>
  );
}
