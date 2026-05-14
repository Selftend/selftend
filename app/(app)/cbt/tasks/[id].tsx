import { useLocalSearchParams } from "expo-router";
import { ScrollView, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";

import { Button } from "@/src/components/react-native-reusables/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/src/components/react-native-reusables/card";
import { Checkbox } from "@/src/components/react-native-reusables/checkbox";
import { Label } from "@/src/components/react-native-reusables/label";
import { Text } from "@/src/components/react-native-reusables/text";
import { LoadingState } from "@/src/components/app/screen-state";
import {
  useTask,
  useTaskSteps,
  useToggleStep,
  useUpdateTaskStatus,
} from "@/src/features/procrastination/queries";
import { useSession } from "@/src/providers/session-provider";
import { useToastStore } from "@/src/stores/toast-store";

export default function TaskDetailScreen() {
  const { t } = useTranslation("cbt");
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useSession();
  const showToast = useToastStore((state) => state.showToast);

  const { data: task, isLoading: taskLoading } = useTask(user?.id ?? null, id ?? null);
  const { data: steps, isLoading: stepsLoading } = useTaskSteps(user?.id ?? null, id ?? null);
  const toggleMutation = useToggleStep(user?.id ?? null, id ?? null);
  const statusMutation = useUpdateTaskStatus(user?.id ?? null);

  const handleToggle = async (stepId: string, currentlyCompleted: boolean) => {
    try {
      await toggleMutation.mutateAsync({
        stepId,
        completed: !currentlyCompleted,
      });
    } catch {
      showToast({ title: t("common:feedback.problem"), tone: "error" });
    }
  };

  const handleComplete = async () => {
    if (!task) return;
    try {
      await statusMutation.mutateAsync({ taskId: task.id, status: "completed" });
      showToast({ title: t("tasks.celebrate"), tone: "success" });
    } catch {
      showToast({ title: t("common:feedback.problem"), tone: "error" });
    }
  };

  if (taskLoading || stepsLoading) {
    return (
      <SafeAreaView className="flex-1 bg-background">
        <View className="flex-1 justify-center">
          <LoadingState title={t("tasks.loading")} />
        </View>
      </SafeAreaView>
    );
  }

  if (!task) {
    return (
      <SafeAreaView className="flex-1 bg-background">
        <View className="flex-1 justify-center p-6">
          <Text variant="h2">{t("tasks.notFound")}</Text>
        </View>
      </SafeAreaView>
    );
  }

  const total = steps?.length ?? 0;
  const done = steps?.filter((s) => s.completedAt !== null).length ?? 0;
  const allDone = total > 0 && done === total;

  return (
    <SafeAreaView className="flex-1 bg-background">
      <ScrollView contentContainerClassName="grow p-6">
        <View className="gap-6">
          <View className="gap-2">
            <Text variant="h1">{task.taskDescription}</Text>
            <Text variant="muted">{t(`tasks.status.${task.status}`)}</Text>
          </View>

          {task.fearThought ? (
            <Card>
              <CardHeader>
                <CardTitle>{t("tasks.fearThought")}</CardTitle>
                <CardDescription>{task.fearThought}</CardDescription>
              </CardHeader>
            </Card>
          ) : null}

          {task.challengedThought ? (
            <Card>
              <CardHeader>
                <CardTitle>{t("tasks.challengedThought")}</CardTitle>
                <CardDescription>{task.challengedThought}</CardDescription>
              </CardHeader>
            </Card>
          ) : null}

          {steps && steps.length > 0 ? (
            <View className="gap-3">
              <View className="flex-row items-center justify-between">
                <Text variant="h3">{t("tasks.stepsLabel")}</Text>
                <Text variant="muted">
                  {done}/{total}
                </Text>
              </View>
              {steps.map((step) => {
                const isCompleted = step.completedAt !== null;
                return (
                  <View key={step.id} className="flex-row items-start gap-3">
                    <Checkbox
                      accessibilityLabel={step.description}
                      checked={isCompleted}
                      onCheckedChange={() => void handleToggle(step.id, isCompleted)}
                    />
                    <Label
                      className={
                        isCompleted ? "line-through text-muted-foreground flex-1" : "flex-1"
                      }
                      onPress={() => void handleToggle(step.id, isCompleted)}
                    >
                      {step.description}
                      {step.estimatedMinutes !== null
                        ? ` (${t("tasks.minutes", { value: step.estimatedMinutes })})`
                        : ""}
                    </Label>
                  </View>
                );
              })}
            </View>
          ) : null}

          {task.reward ? (
            <Card>
              <CardHeader>
                <CardTitle>{t("tasks.reward")}</CardTitle>
                <CardDescription>{task.reward}</CardDescription>
              </CardHeader>
            </Card>
          ) : null}

          {task.deadline ? (
            <Card>
              <CardHeader>
                <CardTitle>{t("tasks.deadline")}</CardTitle>
                <CardDescription>{task.deadline}</CardDescription>
              </CardHeader>
            </Card>
          ) : null}

          {task.status === "active" && allDone ? (
            <Card>
              <CardHeader>
                <CardTitle>{t("tasks.allDoneTitle")}</CardTitle>
                <CardDescription>{t("tasks.allDoneDescription")}</CardDescription>
              </CardHeader>
              <CardContent>
                <Button onPress={() => void handleComplete()}>
                  <Text>{t("tasks.markComplete")}</Text>
                </Button>
              </CardContent>
            </Card>
          ) : null}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
