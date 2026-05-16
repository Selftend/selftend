import { router } from "expo-router";
import { Pressable, ScrollView, View } from "react-native";
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
import { useGoals, useMilestones } from "@/src/features/goals/queries";
import { useSession } from "@/src/providers/session-provider";
import type { Goal } from "@/src/features/goals/types";
import { DEFAULT_INTERACTIVE_HIT_SLOP } from "@/src/lib/accessibility";
import { BackButton } from "@/src/components/app/back-button";

function GoalCard({ goal, userId }: { goal: Goal; userId: string }) {
  const { t } = useTranslation("cbt");
  const { data: milestones } = useMilestones(userId, goal.id);
  const total = milestones?.length ?? 0;
  const done = milestones?.filter((m) => m.completedAt !== null).length ?? 0;
  const progress = total > 0 ? done / total : 0;

  return (
    <Pressable
      accessibilityLabel={goal.title}
      accessibilityRole="button"
      className="rounded-xl"
      hitSlop={DEFAULT_INTERACTIVE_HIT_SLOP}
      onPress={() =>
        router.push(`/modules/cbt/goals/${goal.id}` as Parameters<typeof router.push>[0])
      }
      role="button"
    >
      <Card>
        <CardHeader>
          <CardTitle>{goal.title}</CardTitle>
          {total > 0 ? (
            <CardDescription>{t("goals.milestoneProgress", { done, total })}</CardDescription>
          ) : null}
        </CardHeader>
        {total > 0 ? (
          <View className="mx-6 mb-4 h-1.5 overflow-hidden rounded-full bg-muted">
            <View
              className="h-full rounded-full bg-primary"
              style={{ width: `${Math.round(progress * 100)}%` }}
            />
          </View>
        ) : null}
      </Card>
    </Pressable>
  );
}

export default function GoalsScreen() {
  const { t } = useTranslation("cbt");
  const { user } = useSession();
  const { data: goals, isLoading } = useGoals(user?.id ?? null);

  const activeGoals = goals?.filter((g) => g.status === "active") ?? [];
  const pastGoals = goals?.filter((g) => g.status !== "active") ?? [];

  return (
    <SafeAreaView className="flex-1 bg-background">
      <ScrollView contentContainerClassName="grow p-6">
        <View className="gap-6">
          <View className="flex-row items-center justify-between gap-4">
            <View className="flex-1 gap-2">
              <View className="flex-row items-center gap-2">
                <BackButton showLabel={false} className="-ml-2" />
                <Text variant="h1">{t("goals.title")}</Text>
              </View>
              <Text variant="muted">{t("goals.description")}</Text>
            </View>
            <Button onPress={() => router.push("/modules/cbt/goals/new")} size="sm">
              <Text>{t("goals.new")}</Text>
            </Button>
          </View>

          {isLoading ? (
            <LoadingState title={t("goals.loading")} />
          ) : activeGoals.length === 0 ? (
            <Card>
              <CardHeader>
                <CardTitle>{t("goals.empty")}</CardTitle>
                <CardDescription>{t("goals.emptyDescription")}</CardDescription>
              </CardHeader>
            </Card>
          ) : (
            <View className="gap-3">
              {activeGoals.map((goal) => (
                <GoalCard key={goal.id} goal={goal} userId={user!.id} />
              ))}
            </View>
          )}

          {pastGoals.length > 0 ? (
            <View className="gap-3">
              <Text variant="h3">{t("goals.pastGoals")}</Text>
              {pastGoals.map((goal) => (
                <AccessibleCardLink
                  key={goal.id}
                  title={goal.title}
                  description={t(`goals.status.${goal.status}`)}
                  onPress={() =>
                    router.push(
                      `/modules/cbt/goals/${goal.id}` as Parameters<typeof router.push>[0],
                    )
                  }
                />
              ))}
            </View>
          ) : null}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
