import { router, useLocalSearchParams } from "expo-router";
import { ScrollView, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useState } from "react";
import { useTranslation } from "react-i18next";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Text } from "@/components/ui/text";
import { LoadingState } from "@/src/components/screen-state";
import { useGoal, useMilestones, useToggleMilestone, useUpdateGoalStatus } from "@/src/features/goals/queries";
import { useSession } from "@/src/providers/session-provider";
import { useToastStore } from "@/src/stores/toast-store";
import type { GoalStatus } from "@/src/features/goals/types";

export default function GoalDetailScreen() {
  const { t } = useTranslation("cbt");
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useSession();
  const showToast = useToastStore((state) => state.showToast);
  const [confirmStatus, setConfirmStatus] = useState<GoalStatus | null>(null);

  const { data: goal, isLoading: goalLoading } = useGoal(user?.id ?? null, id ?? null);
  const { data: milestones, isLoading: milestonesLoading } = useMilestones(
    user?.id ?? null,
    id ?? null,
  );
  const toggleMutation = useToggleMilestone(user?.id ?? null, id ?? null);
  const statusMutation = useUpdateGoalStatus(user?.id ?? null);

  const total = milestones?.length ?? 0;
  const done = milestones?.filter((m) => m.completedAt !== null).length ?? 0;
  const progress = total > 0 ? done / total : 0;

  const handleToggle = async (milestoneId: string, currentlyCompleted: boolean) => {
    try {
      await toggleMutation.mutateAsync({
        milestoneId,
        completed: !currentlyCompleted,
      });
    } catch {
      showToast({ title: t("common:feedback.problem"), tone: "error" });
    }
  };

  const handleStatus = async (status: GoalStatus) => {
    if (!goal) return;
    try {
      await statusMutation.mutateAsync({ goalId: goal.id, status });
      setConfirmStatus(null);
      showToast({ title: t("common:feedback.saved"), tone: "success" });
    } catch {
      showToast({ title: t("common:feedback.problem"), tone: "error" });
    }
  };

  if (goalLoading || milestonesLoading) {
    return (
      <SafeAreaView className="flex-1 bg-background">
        <View className="flex-1 justify-center">
          <LoadingState title={t("goals.loading")} />
        </View>
      </SafeAreaView>
    );
  }

  if (!goal) {
    return (
      <SafeAreaView className="flex-1 bg-background">
        <View className="flex-1 justify-center p-6">
          <Text variant="h2">{t("goals.notFound")}</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-background">
      <ScrollView contentContainerClassName="grow p-6">
        <View className="gap-6">
          <View className="gap-2">
            <Text variant="h1">{goal.title}</Text>
            {goal.description ? <Text variant="muted">{goal.description}</Text> : null}
          </View>

          <View className="flex-row flex-wrap gap-2">
            <View className="rounded-full bg-muted px-3 py-1">
              <Text className="text-xs">{t(`goals.domain.${goal.lifeDomain}`)}</Text>
            </View>
            <View className="rounded-full bg-muted px-3 py-1">
              <Text className="text-xs">{t(`goals.type.${goal.goalType}`)}</Text>
            </View>
            <View className="rounded-full bg-muted px-3 py-1">
              <Text className="text-xs">{t(`goals.status.${goal.status}`)}</Text>
            </View>
          </View>

          {total > 0 ? (
            <View className="gap-2">
              <View className="flex-row justify-between">
                <Text className="text-sm font-medium">{t("goals.progress")}</Text>
                <Text className="text-sm text-muted-foreground">
                  {done}/{total}
                </Text>
              </View>
              <View className="h-2 overflow-hidden rounded-full bg-muted">
                <View
                  className="h-full rounded-full bg-primary"
                  style={{ width: `${Math.round(progress * 100)}%` }}
                />
              </View>
            </View>
          ) : null}

          {milestones && milestones.length > 0 ? (
            <View className="gap-3">
              <Text variant="h3">{t("goals.milestones")}</Text>
              {milestones.map((milestone) => {
                const isCompleted = milestone.completedAt !== null;
                return (
                  <View key={milestone.id} className="flex-row items-start gap-3">
                    <Checkbox
                      accessibilityLabel={milestone.description}
                      checked={isCompleted}
                      onCheckedChange={() => void handleToggle(milestone.id, isCompleted)}
                    />
                    <Label
                      className={isCompleted ? "line-through text-muted-foreground" : ""}
                      onPress={() => void handleToggle(milestone.id, isCompleted)}
                    >
                      {milestone.description}
                    </Label>
                  </View>
                );
              })}
            </View>
          ) : null}

          {goal.status === "active" ? (
            <View className="gap-3">
              <Text variant="h3">{t("goals.actions")}</Text>
              <Button
                onPress={() => router.push(`/cbt/goals/new?goalId=${goal.id}`)}
                variant="secondary"
              >
                <Text>{t("goals.edit")}</Text>
              </Button>
              {confirmStatus ? (
                <Card>
                  <CardHeader>
                    <CardTitle>{t(`goals.confirm.${confirmStatus}Title`)}</CardTitle>
                    <CardDescription>{t(`goals.confirm.${confirmStatus}Description`)}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <View className="flex-row gap-3">
                      <View className="flex-1">
                        <Button
                          onPress={() => setConfirmStatus(null)}
                          variant="ghost"
                        >
                          <Text>{t("goals.cancel")}</Text>
                        </Button>
                      </View>
                      <View className="flex-1">
                        <Button
                          disabled={statusMutation.isPending}
                          onPress={() => void handleStatus(confirmStatus)}
                          variant="destructive"
                        >
                          <Text>{t(`goals.status.${confirmStatus}`)}</Text>
                        </Button>
                      </View>
                    </View>
                  </CardContent>
                </Card>
              ) : (
                <View className="flex-row gap-3">
                  <View className="flex-1">
                    <Button
                      onPress={() => setConfirmStatus("paused")}
                      variant="outline"
                    >
                      <Text>{t("goals.status.paused")}</Text>
                    </Button>
                  </View>
                  <View className="flex-1">
                    <Button
                      onPress={() => setConfirmStatus("completed")}
                      variant="outline"
                    >
                      <Text>{t("goals.status.completed")}</Text>
                    </Button>
                  </View>
                </View>
              )}
            </View>
          ) : null}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
