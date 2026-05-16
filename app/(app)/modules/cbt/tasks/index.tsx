import { router } from "expo-router";
import { ScrollView, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";

import { Button } from "@/src/components/react-native-reusables/button";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/src/components/react-native-reusables/card";
import { Text } from "@/src/components/react-native-reusables/text";
import { AccessibleCardLink } from "@/src/components/app/accessible-card-link";
import { LoadingState } from "@/src/components/app/screen-state";
import { useTasks } from "@/src/features/procrastination/queries";
import { useSession } from "@/src/providers/session-provider";
import { BackButton } from "@/src/components/app/back-button";

export default function TasksScreen() {
  const { t } = useTranslation("cbt");
  const { user } = useSession();
  const { data: tasks, isLoading } = useTasks(user?.id ?? null);

  const active = tasks?.filter((t) => t.status === "active") ?? [];
  const past = tasks?.filter((t) => t.status !== "active") ?? [];

  return (
    <SafeAreaView className="flex-1 bg-background">
      <ScrollView contentContainerClassName="grow p-6">
        <View className="gap-6">
          <View className="flex-row items-center justify-between gap-4">
            <View className="flex-1 gap-2">
              <View className="flex-row items-center gap-2">
                <BackButton showLabel={false} className="-ml-2" />
                <Text variant="h1">{t("tasks.title")}</Text>
              </View>
              <Text variant="muted">{t("tasks.description")}</Text>
            </View>
            <Button onPress={() => router.push("/modules/cbt/tasks/new")} size="sm">
              <Text>{t("tasks.new")}</Text>
            </Button>
          </View>

          {isLoading ? (
            <LoadingState title={t("tasks.loading")} />
          ) : active.length === 0 && past.length === 0 ? (
            <Card>
              <CardHeader>
                <CardTitle>{t("tasks.empty")}</CardTitle>
                <CardDescription>{t("tasks.emptyDescription")}</CardDescription>
              </CardHeader>
            </Card>
          ) : (
            <>
              {active.length > 0 ? (
                <View className="gap-3">
                  <Text variant="h3">{t("tasks.active")}</Text>
                  {active.map((task) => (
                    <AccessibleCardLink
                      key={task.id}
                      title={task.taskDescription}
                      description={
                        task.deadline
                          ? t("tasks.deadlineLabel", { value: task.deadline })
                          : undefined
                      }
                      onPress={() =>
                        router.push(
                          `/modules/cbt/tasks/${task.id}` as Parameters<typeof router.push>[0],
                        )
                      }
                    />
                  ))}
                </View>
              ) : null}
              {past.length > 0 ? (
                <View className="gap-3">
                  <Text variant="h3">{t("tasks.past")}</Text>
                  {past.map((task) => (
                    <AccessibleCardLink
                      key={task.id}
                      title={task.taskDescription}
                      description={t(`tasks.status.${task.status}`)}
                      onPress={() =>
                        router.push(
                          `/modules/cbt/tasks/${task.id}` as Parameters<typeof router.push>[0],
                        )
                      }
                    />
                  ))}
                </View>
              ) : null}
            </>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
