import { zodResolver } from "@hookform/resolvers/zod";
import { Controller, useForm } from "react-hook-form";
import { ActivityIndicator, Platform, View } from "react-native";
import { useEffect, useState } from "react";
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
import { useAllExposureItems, useHierarchies } from "@/src/features/exposure/queries";
import { useGoals } from "@/src/features/goals/queries";
import { useMindfulnessSessions } from "@/src/features/mindfulness/queries";
import { useMoodLogs } from "@/src/features/mood/queries";
import { useTasks } from "@/src/features/procrastination/queries";
import { resolveActiveStrategyKeys } from "@/src/features/recovery/active-strategies";
import {
  addCopingStep as addCopingStepToDraft,
  removeCopingStep as removeCopingStepFromDraft,
  updateCopingStep as updateCopingStepInDraft,
  type ChallengeDraft,
} from "@/src/features/recovery/challenge-draft";
import { buildRecoveryPlanExport } from "@/src/features/recovery/export";
import {
  defaultValues,
  sanitizeRecoveryValues,
  toEditableList,
} from "@/src/features/recovery/form-values";
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
import type { RecoverySources } from "@/src/features/recovery/sources";
import { computeRecoveryStats } from "@/src/features/recovery/stats";
import { buildTimeline, formatDate, getTimelineLabel } from "@/src/features/recovery/timeline";
import type { ChallengePlan } from "@/src/features/recovery/types";
import { useSelfCareLogs } from "@/src/features/self-care/queries";
import { useUserPreferences } from "@/src/features/settings/queries";
import { useValuesProfile } from "@/src/features/values/queries";
import { useWorryEntries } from "@/src/features/worry/queries";
import { useSingleFlight } from "@/src/lib/use-single-flight";
import { useStringListField } from "@/src/lib/use-string-list-field";
import { useSession } from "@/src/providers/session-provider";
import { useToastStore } from "@/src/stores/toast-store";
import { ScreenHeader } from "@/src/components/app/screen-header";
import { type StrategyKey } from "@/src/features/cbt/strategies";
import { currentDateKey } from "@/src/utils/date";

type ListFieldName = "recoveryKeys" | "maintenanceCommitments";

export default function RecoveryScreen() {
  const { t, i18n } = useTranslation("cbt");
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
  const { data: valuesProfile } = useValuesProfile(user?.id ?? null);
  const { data: beliefs } = useCoreBeliefs(user?.id ?? null);
  const { data: hierarchies } = useHierarchies(user?.id ?? null);
  const { data: exposureItems } = useAllExposureItems(user?.id ?? null);
  const { data: moodLogs } = useMoodLogs(user?.id ?? null, 365);
  const { data: worries } = useWorryEntries(user?.id ?? null);
  const { data: mindfulnessSessions } = useMindfulnessSessions(user?.id ?? null);
  const { data: tasks } = useTasks(user?.id ?? null);
  const { data: angerLogs } = useAngerLogs(user?.id ?? null);
  const { data: selfCareLogs } = useSelfCareLogs(user?.id ?? null);

  const sources: RecoverySources = {
    goals,
    activities,
    thoughtRecords,
    valuesProfile,
    beliefs,
    hierarchies,
    exposureItems,
    moodLogs,
    worries,
    mindfulnessSessions,
    tasks,
    angerLogs,
    selfCareLogs,
  };

  const [challengeDraft, setChallengeDraft] = useState<ChallengeDraft | null>(null);
  const [isExporting, setIsExporting] = useState(false);

  const form = useForm<RecoveryPlanFormSchema>({
    defaultValues,
    resolver: zodResolver(recoveryPlanFormSchema),
  });
  const {
    control,
    formState: { isSubmitting },
    getValues,
    handleSubmit,
    reset,
    setValue,
    watch,
  } = form;

  const strategyIntegrationNotes = watch("strategyIntegrationNotes");

  const recoveryKeysField = useStringListField(form, "recoveryKeys", {
    shouldDirty: true,
    keepAtLeastOne: true,
  });
  const maintenanceCommitmentsField = useStringListField(form, "maintenanceCommitments", {
    shouldDirty: true,
    keepAtLeastOne: true,
  });

  useEffect(() => {
    if (!recoveryPlan) return;
    reset({
      recoveryKeys: toEditableList(recoveryPlan.recoveryKeys),
      personalSlogan: recoveryPlan.personalSlogan,
      strategyIntegrationNotes: recoveryPlan.strategyIntegrationNotes,
      maintenanceCommitments: toEditableList(recoveryPlan.maintenanceCommitments),
    });
  }, [recoveryPlan, reset]);

  const activeStrategyKeys = resolveActiveStrategyKeys(preferences, sources);

  const recoveryStats = computeRecoveryStats(sources);

  const timelineItems = buildTimeline(sources, recoveryPlan);

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

  // Create-capable (a new challenge draft has no id yet -> INSERT), so a rapid
  // double-press must not save the challenge plan twice.
  const handleSaveChallenge = useSingleFlight(async () => {
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
  });

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

  const handleExportRecoveryPlan = async () => {
    setIsExporting(true);

    try {
      const exportText = buildRecoveryPlanExport({
        challengePlans: challengePlans ?? [],
        lang: i18n.language,
        recoveryValues: sanitizeRecoveryValues(getValues()),
        stats: recoveryStats,
        t,
        timelineItems,
      });

      if (Platform.OS === "web") {
        const blob = new Blob([exportText], { type: "text/markdown" });
        const url = URL.createObjectURL(blob);
        const anchor = document.createElement("a");
        anchor.href = url;
        anchor.download = `selftend-recovery-plan-${currentDateKey()}.md`;
        document.body.appendChild(anchor);
        anchor.click();
        document.body.removeChild(anchor);
        URL.revokeObjectURL(url);
      } else {
        const { Share } = await import("react-native");
        await Share.share({
          message: exportText,
          title: t("recovery.export.fileTitle"),
        });
      }

      showToast({
        title: t("common:feedback.saved"),
        description: t("recovery.export.exported"),
        tone: "success",
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : t("recovery.export.exportError");
      showToast({ title: t("common:feedback.problem"), description: message, tone: "error" });
    } finally {
      setIsExporting(false);
    }
  };

  const updateCopingStep = (index: number, value: string) => {
    setChallengeDraft((draft) => (draft ? updateCopingStepInDraft(draft, index, value) : draft));
  };

  const addCopingStep = () => {
    setChallengeDraft((draft) => (draft ? addCopingStepToDraft(draft) : draft));
  };

  const removeCopingStep = (index: number) => {
    setChallengeDraft((draft) => (draft ? removeCopingStepFromDraft(draft, index) : draft));
  };

  const renderList = (
    label: string,
    hint: string,
    fieldName: ListFieldName,
    field: ReturnType<typeof useStringListField<RecoveryPlanFormSchema>>,
    addLabel: string,
    removeLabel: string,
    placeholder: string,
  ) => (
    <View className="gap-3">
      <Label>{label}</Label>
      <Text variant="muted">{hint}</Text>
      {field.items.map((value, index) => (
        <View key={`${fieldName}-${index}`} className="flex-row items-start gap-2">
          <View className="flex-1">
            <Input
              accessibilityLabel={`${label} ${index + 1}`}
              onChangeText={(text) => field.update(index, text)}
              placeholder={placeholder}
              value={value}
            />
          </View>
          {field.items.length > 1 ? (
            <Button onPress={() => field.remove(index)} size="sm" variant="ghost">
              <Text>{removeLabel}</Text>
            </Button>
          ) : null}
        </View>
      ))}
      <Button onPress={() => field.append()} size="sm" variant="outline">
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
          <ScreenHeader title={t("recovery.title")} />
          <Text variant="muted">{t("recovery.description")}</Text>
        </View>

        <Card>
          <CardHeader>
            <CardTitle>{t("recovery.stats.title")}</CardTitle>
            <CardDescription>{t("recovery.stats.description")}</CardDescription>
          </CardHeader>
          <CardContent>
            <View className="flex-row flex-wrap gap-3">
              {recoveryStats.map((stat) => (
                <View
                  key={stat.key}
                  className="min-w-[44%] flex-1 gap-1 rounded-md border border-border p-3"
                >
                  <Text className="text-2xl font-semibold">{stat.value}</Text>
                  <Text variant="muted">
                    {t(`recovery.stats.${stat.key}`, { count: stat.value })}
                  </Text>
                </View>
              ))}
            </View>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t("recovery.timeline.title")}</CardTitle>
            <CardDescription>{t("recovery.timeline.description")}</CardDescription>
          </CardHeader>
          <CardContent className="gap-4">
            {timelineItems.length > 0 ? (
              timelineItems.map((item) => (
                <View key={`${item.key}-${item.date}`} className="flex-row gap-3">
                  <View className="items-center">
                    <View className="mt-1 size-3 rounded-full bg-primary" />
                    <View className="w-px flex-1 bg-border" />
                  </View>
                  <View className="flex-1 gap-1 pb-4">
                    <Text className="text-sm text-muted-foreground">
                      {formatDate(item.date, i18n.language)}
                    </Text>
                    <Text className="font-medium">{getTimelineLabel(t, item.key)}</Text>
                    <Text variant="muted">
                      {t("recovery.timeline.count", { count: item.count })}
                    </Text>
                  </View>
                </View>
              ))
            ) : (
              <Text variant="muted">{t("recovery.timeline.empty")}</Text>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t("recovery.export.title")}</CardTitle>
            <CardDescription>{t("recovery.export.description")}</CardDescription>
          </CardHeader>
          <CardContent>
            <Button disabled={isExporting} onPress={() => void handleExportRecoveryPlan()}>
              {isExporting ? <ActivityIndicator color="#ffffff" /> : null}
              <Text>
                {isExporting ? t("recovery.export.exporting") : t("recovery.export.button")}
              </Text>
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t("recovery.recoveryKeys")}</CardTitle>
            <CardDescription>{t("recovery.recoveryKeysHint")}</CardDescription>
          </CardHeader>
          <CardContent>
            {renderList(
              t("recovery.recoveryKeys"),
              t("recovery.recoveryKeysHint"),
              "recoveryKeys",
              recoveryKeysField,
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
              "maintenanceCommitments",
              maintenanceCommitmentsField,
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
