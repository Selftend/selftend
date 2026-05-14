import { zodResolver } from "@hookform/resolvers/zod";
import { Controller, useForm } from "react-hook-form";
import { ActivityIndicator, View } from "react-native";
import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { SafeAreaView } from "react-native-safe-area-context";

import { Button } from "@/src/components/react-native-reusables/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/src/components/react-native-reusables/card";
import { Input } from "@/src/components/react-native-reusables/input";
import { Label } from "@/src/components/react-native-reusables/label";
import { Text } from "@/src/components/react-native-reusables/text";
import { Textarea } from "@/src/components/react-native-reusables/textarea";
import { MobileFormScreen } from "@/src/components/app/mobile-form-screen";
import { LoadingState } from "@/src/components/app/screen-state";
import { useActivities } from "@/src/features/activities/queries";
import { useAngerLogs } from "@/src/features/anger/queries";
import { useCoreBeliefs } from "@/src/features/beliefs/queries";
import { useThoughtRecords } from "@/src/features/cbt/queries";
import { useHierarchies } from "@/src/features/exposure/queries";
import { useGoals } from "@/src/features/goals/queries";
import { useMindfulnessSessions } from "@/src/features/mindfulness/queries";
import { useTasks } from "@/src/features/procrastination/queries";
import {
  useChallengePlans,
  useDeleteChallengePlan,
  useRecoveryPlan,
  useSaveChallengePlan,
  useUpsertRecoveryPlan,
} from "@/src/features/recovery/queries";
import {
  challengePlanFormSchema,
  recoveryPlanFormSchema,
  type RecoveryPlanFormSchema,
} from "@/src/features/recovery/schemas";
import type { ChallengePlan } from "@/src/features/recovery/types";
import { useSelfCareLogs } from "@/src/features/self-care/queries";
import { useUserPreferences } from "@/src/features/settings/queries";
import { useValuesProfiles } from "@/src/features/values/queries";
import { useWorryEntries } from "@/src/features/worry/queries";
import { useSession } from "@/src/providers/session-provider";
import { useToastStore } from "@/src/stores/toast-store";

const strategyKeys = [
  "goals",
  "activities",
  "thoughts",
  "values",
  "beliefs",
  "exposure",
  "worry",
  "mindfulness",
  "tasks",
  "anger",
  "selfCare",
] as const;

type StrategyKey = (typeof strategyKeys)[number];
type ListFieldName = "recoveryKeys" | "maintenanceCommitments";

interface ChallengeDraft {
  id?: string;
  challengeDescription: string;
  copingSteps: string[];
}

const defaultValues: RecoveryPlanFormSchema = {
  recoveryKeys: [""],
  personalSlogan: "",
  strategyIntegrationNotes: {},
  maintenanceCommitments: [""],
};

function isStrategyKey(key: string): key is StrategyKey {
  return (strategyKeys as readonly string[]).includes(key);
}

function toEditableList(values: string[]) {
  return values.length > 0 ? values : [""];
}

function sanitizeRecoveryValues(values: RecoveryPlanFormSchema) {
  return {
    recoveryKeys: values.recoveryKeys.map((value) => value.trim()).filter(Boolean),
    personalSlogan: values.personalSlogan.trim(),
    strategyIntegrationNotes: Object.fromEntries(
      Object.entries(values.strategyIntegrationNotes)
        .map(([key, value]) => [key, value.trim()] as const)
        .filter(([, value]) => value.length > 0),
    ),
    maintenanceCommitments: values.maintenanceCommitments
      .map((value) => value.trim())
      .filter(Boolean),
  };
}

export default function RecoveryScreen() {
  const { t } = useTranslation("cbt");
  const { user } = useSession();
  const showToast = useToastStore((state) => state.showToast);

  const { data: preferences } = useUserPreferences(user?.id ?? null);
  const { data: recoveryPlan, isLoading: isRecoveryLoading } = useRecoveryPlan(user?.id ?? null);
  const { data: challengePlans } = useChallengePlans(user?.id ?? null);
  const upsertRecoveryMutation = useUpsertRecoveryPlan(user?.id ?? null);
  const saveChallengeMutation = useSaveChallengePlan(user?.id ?? null);
  const deleteChallengeMutation = useDeleteChallengePlan(user?.id ?? null);

  const { data: goals } = useGoals(user?.id ?? null);
  const { data: activities } = useActivities(user?.id ?? null);
  const { data: thoughtRecords } = useThoughtRecords(user?.id ?? null);
  const { data: valuesProfiles } = useValuesProfiles(user?.id ?? null);
  const { data: beliefs } = useCoreBeliefs(user?.id ?? null);
  const { data: hierarchies } = useHierarchies(user?.id ?? null);
  const { data: worries } = useWorryEntries(user?.id ?? null);
  const { data: mindfulnessSessions } = useMindfulnessSessions(user?.id ?? null);
  const { data: tasks } = useTasks(user?.id ?? null);
  const { data: angerLogs } = useAngerLogs(user?.id ?? null);
  const { data: selfCareLogs } = useSelfCareLogs(user?.id ?? null);

  const [challengeDraft, setChallengeDraft] = useState<ChallengeDraft | null>(null);

  const {
    control,
    formState: { isSubmitting },
    getValues,
    handleSubmit,
    reset,
    setValue,
    watch,
  } = useForm<RecoveryPlanFormSchema>({
    defaultValues,
    resolver: zodResolver(recoveryPlanFormSchema),
  });

  const recoveryKeys = watch("recoveryKeys");
  const maintenanceCommitments = watch("maintenanceCommitments");
  const strategyIntegrationNotes = watch("strategyIntegrationNotes");

  useEffect(() => {
    if (!recoveryPlan) return;
    reset({
      recoveryKeys: toEditableList(recoveryPlan.recoveryKeys),
      personalSlogan: recoveryPlan.personalSlogan,
      strategyIntegrationNotes: recoveryPlan.strategyIntegrationNotes,
      maintenanceCommitments: toEditableList(recoveryPlan.maintenanceCommitments),
    });
  }, [recoveryPlan, reset]);

  const activeStrategyKeys = useMemo(() => {
    const configured = preferences?.activeStrategies.filter(isStrategyKey) ?? [];
    if (configured.length > 0) {
      return configured;
    }

    const recordBacked: StrategyKey[] = [];
    if ((goals?.length ?? 0) > 0) recordBacked.push("goals");
    if ((activities?.length ?? 0) > 0) recordBacked.push("activities");
    if ((thoughtRecords?.length ?? 0) > 0) recordBacked.push("thoughts");
    if ((valuesProfiles?.length ?? 0) > 0) recordBacked.push("values");
    if ((beliefs?.length ?? 0) > 0) recordBacked.push("beliefs");
    if ((hierarchies?.length ?? 0) > 0) recordBacked.push("exposure");
    if ((worries?.length ?? 0) > 0) recordBacked.push("worry");
    if ((mindfulnessSessions?.length ?? 0) > 0) recordBacked.push("mindfulness");
    if ((tasks?.length ?? 0) > 0) recordBacked.push("tasks");
    if ((angerLogs?.length ?? 0) > 0) recordBacked.push("anger");
    if ((selfCareLogs?.length ?? 0) > 0) recordBacked.push("selfCare");

    return recordBacked.length > 0 ? recordBacked : [...strategyKeys];
  }, [
    activities,
    angerLogs,
    beliefs,
    goals,
    hierarchies,
    mindfulnessSessions,
    preferences,
    selfCareLogs,
    tasks,
    thoughtRecords,
    valuesProfiles,
    worries,
  ]);

  const updateListItem = (fieldName: ListFieldName, index: number, value: string) => {
    const next = [...watch(fieldName)];
    next[index] = value;
    setValue(fieldName, next, { shouldDirty: true });
  };

  const appendListItem = (fieldName: ListFieldName) => {
    setValue(fieldName, [...watch(fieldName), ""], { shouldDirty: true });
  };

  const removeListItem = (fieldName: ListFieldName, index: number) => {
    const next = watch(fieldName).filter((_, itemIndex) => itemIndex !== index);
    setValue(fieldName, next.length > 0 ? next : [""], { shouldDirty: true });
  };

  const updateStrategyNote = (strategyKey: StrategyKey, value: string) => {
    setValue(
      "strategyIntegrationNotes",
      {
        ...strategyIntegrationNotes,
        [strategyKey]: value,
      },
      { shouldDirty: true },
    );
  };

  const handleSaveRecoveryPlan = handleSubmit(async (values) => {
    try {
      await upsertRecoveryMutation.mutateAsync(sanitizeRecoveryValues(values));
      showToast({ title: t("common:feedback.saved"), tone: "success" });
    } catch (error) {
      const message = error instanceof Error ? error.message : t("recovery.saveError");
      showToast({ title: t("common:feedback.problem"), description: message, tone: "error" });
    }
  });

  const startEditingChallenge = (plan: ChallengePlan) => {
    setChallengeDraft({
      id: plan.id,
      challengeDescription: plan.challengeDescription,
      copingSteps: toEditableList(plan.copingSteps),
    });
  };

  const handleSaveChallenge = async () => {
    if (!challengeDraft) return;

    const parsed = challengePlanFormSchema.safeParse({
      challengeDescription: challengeDraft.challengeDescription,
      copingSteps: challengeDraft.copingSteps.filter((step) => step.trim().length > 0),
    });

    if (!parsed.success) {
      showToast({
        title: t("common:feedback.problem"),
        description: t("recovery.saveError"),
        tone: "error",
      });
      return;
    }

    try {
      const plan = await upsertRecoveryMutation.mutateAsync(sanitizeRecoveryValues(getValues()));
      await saveChallengeMutation.mutateAsync({
        recoveryPlanId: plan.id,
        input: parsed.data,
        challengePlanId: challengeDraft.id,
      });
      setChallengeDraft(null);
      showToast({ title: t("common:feedback.saved"), tone: "success" });
    } catch (error) {
      const message = error instanceof Error ? error.message : t("recovery.saveError");
      showToast({ title: t("common:feedback.problem"), description: message, tone: "error" });
    }
  };

  const handleDeleteChallenge = async (challengePlanId: string) => {
    try {
      await deleteChallengeMutation.mutateAsync(challengePlanId);
      if (challengeDraft?.id === challengePlanId) {
        setChallengeDraft(null);
      }
      showToast({ title: t("common:feedback.saved"), tone: "success" });
    } catch (error) {
      const message = error instanceof Error ? error.message : t("recovery.saveError");
      showToast({ title: t("common:feedback.problem"), description: message, tone: "error" });
    }
  };

  const updateCopingStep = (index: number, value: string) => {
    setChallengeDraft((draft) => {
      if (!draft) return draft;
      const next = [...draft.copingSteps];
      next[index] = value;
      return { ...draft, copingSteps: next };
    });
  };

  const addCopingStep = () => {
    setChallengeDraft((draft) =>
      draft ? { ...draft, copingSteps: [...draft.copingSteps, ""] } : draft,
    );
  };

  const removeCopingStep = (index: number) => {
    setChallengeDraft((draft) => {
      if (!draft) return draft;
      const next = draft.copingSteps.filter((_, itemIndex) => itemIndex !== index);
      return { ...draft, copingSteps: next.length > 0 ? next : [""] };
    });
  };

  const renderList = (
    label: string,
    hint: string,
    items: string[],
    fieldName: ListFieldName,
    addLabel: string,
    removeLabel: string,
    placeholder: string,
  ) => (
    <View className="gap-3">
      <Label>{label}</Label>
      <Text variant="muted">{hint}</Text>
      {items.map((value, index) => (
        <View key={`${fieldName}-${index}`} className="flex-row items-start gap-2">
          <View className="flex-1">
            <Input
              accessibilityLabel={`${label} ${index + 1}`}
              onChangeText={(text) => updateListItem(fieldName, index, text)}
              placeholder={placeholder}
              value={value}
            />
          </View>
          {items.length > 1 ? (
            <Button onPress={() => removeListItem(fieldName, index)} size="sm" variant="ghost">
              <Text>{removeLabel}</Text>
            </Button>
          ) : null}
        </View>
      ))}
      <Button onPress={() => appendListItem(fieldName)} size="sm" variant="outline">
        <Text>{addLabel}</Text>
      </Button>
    </View>
  );

  if (isRecoveryLoading) {
    return (
      <SafeAreaView className="flex-1 bg-background">
        <View className="flex-1 justify-center">
          <LoadingState title={t("recovery.loading")} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <MobileFormScreen
      footer={
        <Button
          disabled={isSubmitting || upsertRecoveryMutation.isPending}
          onPress={() => void handleSaveRecoveryPlan()}
        >
          {isSubmitting || upsertRecoveryMutation.isPending ? (
            <ActivityIndicator color="#ffffff" />
          ) : null}
          <Text>{recoveryPlan ? t("recovery.update") : t("recovery.save")}</Text>
        </Button>
      }
    >
      <View className="gap-6">
        <View className="gap-2">
          <Text variant="h1">{t("recovery.title")}</Text>
          <Text variant="muted">{t("recovery.description")}</Text>
        </View>

        <Card>
          <CardHeader>
            <CardTitle>{t("recovery.recoveryKeys")}</CardTitle>
            <CardDescription>{t("recovery.recoveryKeysHint")}</CardDescription>
          </CardHeader>
          <CardContent>
            {renderList(
              t("recovery.recoveryKeys"),
              t("recovery.recoveryKeysHint"),
              recoveryKeys,
              "recoveryKeys",
              t("recovery.addKey"),
              t("recovery.removeKey"),
              t("recovery.keyPlaceholder"),
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t("recovery.personalSlogan")}</CardTitle>
            <CardDescription>{t("recovery.personalSloganHint")}</CardDescription>
          </CardHeader>
          <CardContent>
            <Controller
              control={control}
              name="personalSlogan"
              render={({ field: { onBlur, onChange, value } }) => (
                <Textarea
                  accessibilityLabel={t("recovery.personalSlogan")}
                  onBlur={onBlur}
                  onChangeText={onChange}
                  placeholder={t("recovery.personalSloganPlaceholder")}
                  value={value}
                />
              )}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t("recovery.strategyNotes")}</CardTitle>
            <CardDescription>{t("recovery.strategyNotesHint")}</CardDescription>
          </CardHeader>
          <CardContent className="gap-4">
            {activeStrategyKeys.map((strategyKey) => {
              const label = t(`dashboard.strategies.${strategyKey}`);
              return (
                <View key={strategyKey} className="gap-2">
                  <Label>{label}</Label>
                  <Textarea
                    accessibilityLabel={label}
                    onChangeText={(value) => updateStrategyNote(strategyKey, value)}
                    placeholder={t("recovery.strategyNotePlaceholder", { strategy: label })}
                    value={strategyIntegrationNotes[strategyKey] ?? ""}
                  />
                </View>
              );
            })}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t("recovery.challengePlans")}</CardTitle>
            <CardDescription>{t("recovery.challengePlansHint")}</CardDescription>
          </CardHeader>
          <CardContent className="gap-4">
            {(challengePlans ?? []).map((plan) => (
              <View key={plan.id} className="gap-3 rounded-md border border-border p-4">
                <View className="gap-1">
                  <Text className="font-medium">{plan.challengeDescription}</Text>
                  <Text variant="muted">{plan.copingSteps.join(" · ")}</Text>
                </View>
                <View className="flex-row flex-wrap gap-2">
                  <Button onPress={() => startEditingChallenge(plan)} size="sm" variant="outline">
                    <Text>{t("recovery.editChallenge")}</Text>
                  </Button>
                  <Button
                    disabled={deleteChallengeMutation.isPending}
                    onPress={() => void handleDeleteChallenge(plan.id)}
                    size="sm"
                    variant="ghost"
                  >
                    <Text>{t("recovery.removeChallenge")}</Text>
                  </Button>
                </View>
              </View>
            ))}

            {challengeDraft ? (
              <View className="gap-4 rounded-md border border-border p-4">
                <View className="gap-2">
                  <Label>{t("recovery.challengeDescription")}</Label>
                  <Textarea
                    accessibilityLabel={t("recovery.challengeDescription")}
                    onChangeText={(value) =>
                      setChallengeDraft((draft) =>
                        draft ? { ...draft, challengeDescription: value } : draft,
                      )
                    }
                    placeholder={t("recovery.challengeDescriptionPlaceholder")}
                    value={challengeDraft.challengeDescription}
                  />
                </View>

                <View className="gap-3">
                  <Label>{t("recovery.copingSteps")}</Label>
                  {challengeDraft.copingSteps.map((value, index) => (
                    <View key={`coping-${index}`} className="flex-row items-start gap-2">
                      <View className="flex-1">
                        <Input
                          accessibilityLabel={`${t("recovery.copingSteps")} ${index + 1}`}
                          onChangeText={(text) => updateCopingStep(index, text)}
                          placeholder={t("recovery.copingStepPlaceholder")}
                          value={value}
                        />
                      </View>
                      {challengeDraft.copingSteps.length > 1 ? (
                        <Button onPress={() => removeCopingStep(index)} size="sm" variant="ghost">
                          <Text>{t("recovery.removeCopingStep")}</Text>
                        </Button>
                      ) : null}
                    </View>
                  ))}
                  <Button onPress={addCopingStep} size="sm" variant="outline">
                    <Text>{t("recovery.addCopingStep")}</Text>
                  </Button>
                </View>

                <View className="flex-row flex-wrap gap-2">
                  <Button
                    disabled={saveChallengeMutation.isPending || upsertRecoveryMutation.isPending}
                    onPress={() => void handleSaveChallenge()}
                    size="sm"
                  >
                    {saveChallengeMutation.isPending || upsertRecoveryMutation.isPending ? (
                      <ActivityIndicator color="#ffffff" />
                    ) : null}
                    <Text>{t("recovery.saveChallenge")}</Text>
                  </Button>
                  <Button onPress={() => setChallengeDraft(null)} size="sm" variant="ghost">
                    <Text>{t("recovery.cancelChallenge")}</Text>
                  </Button>
                </View>
              </View>
            ) : null}

            {!challengeDraft ? (
              <Button
                onPress={() => setChallengeDraft({ challengeDescription: "", copingSteps: [""] })}
                size="sm"
                variant="outline"
              >
                <Text>{t("recovery.addChallenge")}</Text>
              </Button>
            ) : null}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t("recovery.maintenanceCommitments")}</CardTitle>
            <CardDescription>{t("recovery.maintenanceCommitmentsHint")}</CardDescription>
          </CardHeader>
          <CardContent>
            {renderList(
              t("recovery.maintenanceCommitments"),
              t("recovery.maintenanceCommitmentsHint"),
              maintenanceCommitments,
              "maintenanceCommitments",
              t("recovery.addCommitment"),
              t("recovery.removeCommitment"),
              t("recovery.commitmentPlaceholder"),
            )}
          </CardContent>
        </Card>
      </View>
    </MobileFormScreen>
  );
}
