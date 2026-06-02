import { router, useLocalSearchParams } from "expo-router";
import { ActivityIndicator, Pressable, ScrollView, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useState } from "react";
import { useTranslation } from "react-i18next";

import { ScreenHeader } from "@/src/components/app/screen-header";
import { ConfirmDialog } from "@/src/components/app/confirm-dialog";
import { Button } from "@/src/components/react-native-reusables/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/src/components/react-native-reusables/card";
import { Icon } from "@/src/components/react-native-reusables/icon";
import { Text } from "@/src/components/react-native-reusables/text";
import { ActDetailLoading, ActDetailNotFound } from "@/src/features/act/act-detail-scaffold";
import {
  useActionSteps,
  useCommittedAction,
  useCommittedActions,
  useDeleteActionStep,
  useDeleteCommittedAction,
  useSaveActionStep,
  useToggleActionStep,
  useUpdateCommittedAction,
} from "@/src/features/act/queries";
import { type ActionStatus } from "@/src/features/act/types";
import { useCachedItem } from "@/src/features/act/use-cached-item";
import { useSession } from "@/src/providers/session-provider";
import { useToastStore } from "@/src/stores/toast-store";
import { cn } from "@/lib/utils";

const STATUS_ACTIONS: ActionStatus[] = ["active", "completed", "abandoned"];
const STATUS_TRANSITION_LABEL_KEY: Record<ActionStatus, string> = {
  active: "committedAction.markActive",
  completed: "committedAction.markComplete",
  abandoned: "committedAction.markAbandoned",
};

export default function ActCommittedActionDetailScreen() {
  const { t } = useTranslation("act");
  const { user } = useSession();
  const { id } = useLocalSearchParams<{ id: string }>();
  const actionId = typeof id === "string" ? id : null;
  const showToast = useToastStore((state) => state.showToast);

  const { item: action, isLoading } = useCachedItem(
    useCommittedActions,
    useCommittedAction,
    user?.id ?? null,
    actionId,
  );

  const { data: steps = [] } = useActionSteps(user?.id ?? null, actionId);

  const updateMutation = useUpdateCommittedAction(user?.id ?? null);
  const deleteMutation = useDeleteCommittedAction(user?.id ?? null);
  const saveStepMutation = useSaveActionStep(user?.id ?? null);
  const toggleStepMutation = useToggleActionStep(user?.id ?? null);
  const deleteStepMutation = useDeleteActionStep(user?.id ?? null);

  const [confirmOpen, setConfirmOpen] = useState(false);
  const [deleteError, setDeleteError] = useState("");
  const [newStepText, setNewStepText] = useState("");

  if (isLoading) {
    return <ActDetailLoading title={t("committedAction.listTitle")} />;
  }

  if (!action) {
    return (
      <ActDetailNotFound
        title={t("committedAction.listTitle")}
        message={t("committedAction.noActions")}
      />
    );
  }

  async function handleStatusChange(status: ActionStatus) {
    if (!action) return;
    await updateMutation.mutateAsync({ actionId: action.id, patch: { status } });
  }

  async function handleDelete() {
    if (!action) return;
    setDeleteError("");
    try {
      await deleteMutation.mutateAsync(action.id);
      setConfirmOpen(false);
      showToast({ title: t("committedAction.deletedToast"), tone: "success" });
      router.replace("/modules/act/committed-action" as Parameters<typeof router.replace>[0]);
    } catch (e) {
      setDeleteError(e instanceof Error ? e.message : t("committedAction.saveProblem"));
    }
  }

  async function handleAddStep() {
    if (!actionId || !newStepText.trim()) return;
    await saveStepMutation.mutateAsync({ actionId, description: newStepText });
    setNewStepText("");
  }

  async function handleToggleStep(stepId: string, current: boolean) {
    if (!actionId) return;
    const completed = !current;
    await toggleStepMutation.mutateAsync({ stepId, completed, actionId });
    showToast({
      title: completed
        ? t("committedAction.stepCompletedToast")
        : t("committedAction.stepReopenedToast"),
      tone: "success",
    });
  }

  async function handleDeleteStep(stepId: string) {
    if (!actionId) return;
    await deleteStepMutation.mutateAsync({ stepId, actionId });
  }

  const doneCount = steps.filter((s) => s.isCompleted).length;

  return (
    <SafeAreaView className="flex-1 bg-background" edges={["bottom", "left", "right"]}>
      <ScrollView contentContainerClassName="grow p-6">
        <View className="gap-6">
          {/* Header */}
          <View className="gap-2">
            <ScreenHeader title={action.title} />
            <View className="flex-row items-center gap-2">
              <Text variant="muted" className="text-xs">
                {t(`values.${action.lifeDomain}`)}
              </Text>
              <StatusPill status={action.status} t={t} />
            </View>
            <View className="flex-row gap-2">
              <Button onPress={() => setConfirmOpen(true)} variant="ghost">
                <Icon name="delete-outline" className="size-4 text-destructive" />
                <Text>{t("committedAction.delete")}</Text>
              </Button>
            </View>
          </View>

          <Card>
            <CardHeader>
              <CardTitle>{t("committedAction.statusLabel")}</CardTitle>
            </CardHeader>
            <CardContent>
              <View className="flex-row flex-wrap gap-2">
                {STATUS_ACTIONS.filter((s) => s !== action.status).map((s) => (
                  <Button
                    key={s}
                    variant="secondary"
                    disabled={updateMutation.isPending}
                    onPress={() => void handleStatusChange(s)}
                  >
                    {updateMutation.isPending ? <ActivityIndicator /> : null}
                    <Text>{t(STATUS_TRANSITION_LABEL_KEY[s])}</Text>
                  </Button>
                ))}
              </View>
            </CardContent>
          </Card>

          {/* Details */}
          {action.description ? (
            <Card>
              <CardHeader>
                <CardTitle>{t("committedAction.descriptionLabel")}</CardTitle>
              </CardHeader>
              <CardContent>
                <Text className="text-base leading-6">{action.description}</Text>
              </CardContent>
            </Card>
          ) : null}

          {action.targetDate ? (
            <Card>
              <CardHeader>
                <CardTitle>{t("committedAction.targetDateLabel")}</CardTitle>
                <CardDescription>{action.targetDate}</CardDescription>
              </CardHeader>
            </Card>
          ) : null}

          {action.obstacles ? (
            <Card>
              <CardHeader>
                <CardTitle>{t("committedAction.obstaclesLabel")}</CardTitle>
              </CardHeader>
              <CardContent>
                <Text className="text-base leading-6">{action.obstacles}</Text>
              </CardContent>
            </Card>
          ) : null}

          <View className="gap-3">
            <View className="flex-row items-baseline justify-between">
              <Text variant="h3">{t("committedAction.stepsTitle")}</Text>
              {steps.length > 0 ? (
                <Text variant="muted" className="text-xs">
                  {t("committedAction.progressLabel", {
                    done: doneCount,
                    total: steps.length,
                  })}
                </Text>
              ) : null}
            </View>
            <Text variant="muted" className="text-xs">
              {t("committedAction.stepsSubtitle")}
            </Text>

            {steps.length === 0 ? (
              <Text variant="muted">{t("committedAction.noSteps")}</Text>
            ) : (
              <View className="gap-2">
                {steps.map((step) => (
                  <View
                    key={step.id}
                    className="flex-row items-start gap-3 rounded-lg border border-border bg-card p-3"
                  >
                    <Pressable
                      accessibilityRole="checkbox"
                      accessibilityState={{ checked: step.isCompleted }}
                      onPress={() => void handleToggleStep(step.id, step.isCompleted)}
                      className="mt-0.5"
                    >
                      <Icon
                        name={step.isCompleted ? "check-circle" : "radio-button-unchecked"}
                        className={cn(
                          "size-5",
                          step.isCompleted ? "text-act" : "text-muted-foreground",
                        )}
                      />
                    </Pressable>
                    <Text
                      className={cn(
                        "flex-1 text-sm leading-snug",
                        step.isCompleted && "text-muted-foreground line-through",
                      )}
                    >
                      {step.description}
                    </Text>
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel={t("committedAction.deleteStep")}
                      onPress={() => void handleDeleteStep(step.id)}
                    >
                      <Icon name="close" className="size-4 text-muted-foreground" />
                    </Pressable>
                  </View>
                ))}
              </View>
            )}

            {/* Add step input */}
            <View className="flex-row items-center gap-2 rounded-xl border border-border bg-card px-3">
              <TextInput
                className="flex-1 py-3 text-sm text-foreground"
                placeholder={t("committedAction.addStepPlaceholder")}
                placeholderTextColor="gray"
                value={newStepText}
                onChangeText={setNewStepText}
                onSubmitEditing={() => void handleAddStep()}
                returnKeyType="done"
              />
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={t("committedAction.addStep")}
                onPress={() => void handleAddStep()}
                disabled={!newStepText.trim() || saveStepMutation.isPending}
              >
                {saveStepMutation.isPending ? (
                  <ActivityIndicator />
                ) : (
                  <Icon
                    name="add-circle"
                    className={cn(
                      "size-6",
                      newStepText.trim() ? "text-act" : "text-muted-foreground",
                    )}
                  />
                )}
              </Pressable>
            </View>
          </View>
        </View>
      </ScrollView>

      <ConfirmDialog
        cancelLabel={t("committedAction.cancel")}
        confirmLabel={t("committedAction.delete")}
        error={deleteError}
        isPending={deleteMutation.isPending}
        message={t("committedAction.deleteConfirmBody")}
        onCancel={() => {
          setConfirmOpen(false);
          setDeleteError("");
        }}
        onConfirm={() => void handleDelete()}
        title={t("committedAction.deleteConfirm")}
        visible={confirmOpen}
      />
    </SafeAreaView>
  );
}

function StatusPill({
  status,
  t,
}: {
  status: ActionStatus;
  t: ReturnType<typeof useTranslation<"act">>["t"];
}) {
  const classes: Record<ActionStatus, string> = {
    active: "bg-act/15 text-act",
    completed: "bg-green-500/15 text-green-700 dark:text-green-400",
    abandoned: "bg-muted text-muted-foreground",
  };
  return (
    <View className={cn("rounded-full px-2 py-0.5", classes[status])}>
      <Text className="text-xs font-medium">{t(`committedAction.status.${status}`)}</Text>
    </View>
  );
}
