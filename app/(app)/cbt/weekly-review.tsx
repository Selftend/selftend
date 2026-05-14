import { ScrollView, useWindowDimensions, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useMemo } from "react";
import { useTranslation } from "react-i18next";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/src/components/react-native-reusables/card";
import { Text } from "@/src/components/react-native-reusables/text";
import { MoodLineChart } from "@/src/components/app/mood-line-chart";
import { LoadingState } from "@/src/components/app/screen-state";
import { useActivities } from "@/src/features/activities/queries";
import { useGoals, useMilestones } from "@/src/features/goals/queries";
import { useMoodLogs } from "@/src/features/mood/queries";
import { useThoughtRecords } from "@/src/features/cbt/queries";
import { useSession } from "@/src/providers/session-provider";

const REFLECTION_PROMPTS = [
  "weeklyReview.reflection.prompt1",
  "weeklyReview.reflection.prompt2",
  "weeklyReview.reflection.prompt3",
  "weeklyReview.reflection.prompt4",
] as const;

function getWeekDates(): string[] {
  const dates: string[] = [];
  const now = new Date();
  for (let i = 6; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    dates.push(d.toISOString().slice(0, 10));
  }
  return dates;
}

function getDayLabel(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString(undefined, { weekday: "short" }).slice(0, 3);
}

function ActiveGoalMilestones({ goalId, userId }: { goalId: string; userId: string }) {
  const { t } = useTranslation("cbt");
  const { data: milestones } = useMilestones(userId, goalId);
  const { data: goals } = useGoals(userId);

  const goal = goals?.find((g) => g.id === goalId);
  if (!goal || !milestones) return null;

  const done = milestones.filter((m) => m.completedAt !== null).length;
  const total = milestones.length;
  const progress = total > 0 ? done / total : 0;

  return (
    <View className="gap-2">
      <Text className="font-medium">{goal.title}</Text>
      <View className="flex-row items-center gap-3">
        <View className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
          <View
            className="h-full rounded-full bg-primary"
            style={{ width: `${Math.round(progress * 100)}%` }}
          />
        </View>
        <Text className="text-xs text-muted-foreground">
          {t("weeklyReview.milestonesProgress", { done, total })}
        </Text>
      </View>
    </View>
  );
}

export default function WeeklyReviewScreen() {
  const { t } = useTranslation("cbt");
  const { user } = useSession();
  const { width } = useWindowDimensions();

  const { data: moodLogs, isLoading: moodLoading } = useMoodLogs(user?.id ?? null, 14);
  const { data: activities, isLoading: activitiesLoading } = useActivities(user?.id ?? null);
  const { data: goals, isLoading: goalsLoading } = useGoals(user?.id ?? null);
  const { data: thoughtRecords, isLoading: recordsLoading } = useThoughtRecords(user?.id ?? null);

  const weekDates = useMemo(() => getWeekDates(), []);

  const chartData = useMemo(() => {
    if (!moodLogs) return [];
    return weekDates.map((date) => {
      const logsOnDay = moodLogs.filter((l) => l.loggedAt.slice(0, 10) === date);
      const avgScore =
        logsOnDay.length > 0
          ? Math.round(logsOnDay.reduce((sum, l) => sum + l.moodScore, 0) / logsOnDay.length)
          : null;
      return { day: getDayLabel(date), date, score: avgScore };
    });
  }, [moodLogs, weekDates]);

  const chartPoints = chartData.filter((d) => d.score !== null) as {
    day: string;
    score: number;
  }[];

  const weekActivities = useMemo(() => {
    if (!activities) return { planned: 0, completed: 0 };
    const weekStart = weekDates[0];
    const weekEnd = weekDates[6];
    const inRange = activities.filter((a) => {
      const date = (a.scheduledAt ?? a.createdAt).slice(0, 10);
      return date >= weekStart && date <= weekEnd;
    });
    return {
      planned: inRange.length,
      completed: inRange.filter((a) => a.completedAt !== null).length,
    };
  }, [activities, weekDates]);

  const activeGoals = goals?.filter((g) => g.status === "active") ?? [];

  const weekRecords = useMemo(() => {
    if (!thoughtRecords) return [];
    const weekStart = weekDates[0];
    return thoughtRecords.filter((r) => r.createdAt.slice(0, 10) >= weekStart);
  }, [thoughtRecords, weekDates]);

  const promptKey = REFLECTION_PROMPTS[new Date().getDay() % REFLECTION_PROMPTS.length];
  const isLoading = moodLoading || activitiesLoading || goalsLoading || recordsLoading;

  const chartWidth = Math.min(width - 48, 400);

  if (isLoading) {
    return (
      <SafeAreaView className="flex-1 bg-background">
        <View className="flex-1 justify-center">
          <LoadingState title={t("weeklyReview.loading")} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-background">
      <ScrollView contentContainerClassName="grow p-6">
        <View className="gap-6">
          <View className="gap-2">
            <Text variant="h1">{t("weeklyReview.title")}</Text>
            <Text variant="muted">{t("weeklyReview.description")}</Text>
          </View>

          {/* Mood trend */}
          <Card>
            <CardHeader>
              <CardTitle>{t("weeklyReview.moodTrend")}</CardTitle>
              <CardDescription>{t("weeklyReview.moodTrendDescription")}</CardDescription>
            </CardHeader>
            <CardContent>
              {chartPoints.length > 0 ? (
                <MoodLineChart data={chartPoints} width={chartWidth} />
              ) : (
                <Text variant="muted">{t("weeklyReview.noMoodData")}</Text>
              )}
            </CardContent>
          </Card>

          {/* Activities */}
          <Card>
            <CardHeader>
              <CardTitle>{t("weeklyReview.activities")}</CardTitle>
            </CardHeader>
            <CardContent>
              <View className="flex-row gap-6">
                <View className="gap-1">
                  <Text className="text-2xl font-bold">{weekActivities.completed}</Text>
                  <Text className="text-xs text-muted-foreground">
                    {t("weeklyReview.activitiesCompleted")}
                  </Text>
                </View>
                <View className="gap-1">
                  <Text className="text-2xl font-bold">{weekActivities.planned}</Text>
                  <Text className="text-xs text-muted-foreground">
                    {t("weeklyReview.activitiesPlanned")}
                  </Text>
                </View>
                {weekActivities.planned > 0 ? (
                  <View className="gap-1">
                    <Text className="text-2xl font-bold">
                      {Math.round((weekActivities.completed / weekActivities.planned) * 100)}%
                    </Text>
                    <Text className="text-xs text-muted-foreground">
                      {t("weeklyReview.completionRate")}
                    </Text>
                  </View>
                ) : null}
              </View>
            </CardContent>
          </Card>

          {/* Goal milestones */}
          {activeGoals.length > 0 ? (
            <Card>
              <CardHeader>
                <CardTitle>{t("weeklyReview.goalProgress")}</CardTitle>
                <CardDescription>{t("weeklyReview.goalProgressDescription")}</CardDescription>
              </CardHeader>
              <CardContent>
                <View className="gap-4">
                  {activeGoals.map((goal) => (
                    <ActiveGoalMilestones key={goal.id} goalId={goal.id} userId={user!.id} />
                  ))}
                </View>
              </CardContent>
            </Card>
          ) : null}

          {/* Thought records this week */}
          <Card>
            <CardHeader>
              <CardTitle>{t("weeklyReview.thoughtRecords")}</CardTitle>
            </CardHeader>
            <CardContent>
              <View className="flex-row items-baseline gap-2">
                <Text className="text-3xl font-bold">{weekRecords.length}</Text>
                <Text className="text-muted-foreground">{t("weeklyReview.recordsThisWeek")}</Text>
              </View>
            </CardContent>
          </Card>

          {/* Reflection prompt */}
          <Card>
            <CardHeader>
              <CardTitle>{t("weeklyReview.reflection.title")}</CardTitle>
              <CardDescription>{t("weeklyReview.reflection.description")}</CardDescription>
            </CardHeader>
            <CardContent>
              <Text className="italic text-muted-foreground">{t(promptKey)}</Text>
            </CardContent>
          </Card>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
