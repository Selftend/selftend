import { ScrollView, useWindowDimensions, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/src/components/react-native-reusables/card";
import { Text } from "@/src/components/react-native-reusables/text";
import { localDateKey, toLocalDateKey } from "@/src/stores/selected-date-store";
import { BackButton } from "@/src/components/app/back-button";
import { MoodLineChart } from "@/src/components/app/mood-line-chart";
import { LoadingState } from "@/src/components/app/screen-state";
import { useGratitudeEntries } from "@/src/features/gratitude/queries";
import { useJournalEntries } from "@/src/features/journal/queries";
import { useMoodLogs } from "@/src/features/mood/queries";
import { useSession } from "@/src/providers/session-provider";

const REFLECTION_PROMPTS = [
  "progress.prompt1",
  "progress.prompt2",
  "progress.prompt3",
  "progress.prompt4",
] as const;

function getLast14Dates(): string[] {
  const dates: string[] = [];
  const now = new Date();
  for (let i = 13; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    dates.push(localDateKey(d));
  }
  return dates;
}

function getDayLabel(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString(undefined, { day: "numeric", month: "numeric" });
}

function getCutoff(days: number): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - (days - 1));
  return d;
}

export default function ProgressScreen() {
  const { t } = useTranslation("navigation");
  const { user } = useSession();
  const { width } = useWindowDimensions();

  const { data: moodLogs, isLoading: moodLoading } = useMoodLogs(user?.id ?? null, 60);
  const { data: journalEntries, isLoading: journalLoading } = useJournalEntries(
    user?.id ?? null,
    200,
  );
  const { data: gratitudeEntries, isLoading: gratitudeLoading } = useGratitudeEntries(
    user?.id ?? null,
    200,
  );

  const isLoading = moodLoading || journalLoading || gratitudeLoading;

  const last14Dates = getLast14Dates();

  const chartData = (() => {
    if (!moodLogs) return [];
    return last14Dates.map((date, i) => {
      const logsOnDay = moodLogs.filter((l) => toLocalDateKey(l.loggedAt) === date);
      const avgScore =
        logsOnDay.length > 0
          ? Math.round(logsOnDay.reduce((sum, l) => sum + l.moodScore, 0) / logsOnDay.length)
          : null;
      // Only show day label every other point to avoid crowding
      const label = i % 2 === 0 ? getDayLabel(date) : "";
      return { day: label, date, score: avgScore };
    });
  })();

  const chartPoints = chartData.filter((d) => d.score !== null) as {
    day: string;
    score: number;
  }[];

  const thirtyDayCutoff = getCutoff(30);

  const thirtyDayMoodCount = moodLogs
    ? moodLogs.filter((l) => new Date(l.loggedAt) >= thirtyDayCutoff).length
    : 0;
  const thirtyDayJournalCount = journalEntries
    ? journalEntries.filter((e) => new Date(e.createdAt) >= thirtyDayCutoff).length
    : 0;
  const thirtyDayGratitudeCount = gratitudeEntries
    ? gratitudeEntries.filter((e) => new Date(e.loggedAt) >= thirtyDayCutoff).length
    : 0;

  const promptKey = REFLECTION_PROMPTS[new Date().getDay() % REFLECTION_PROMPTS.length];
  const chartWidth = Math.min(width - 48, 400);

  if (isLoading) {
    return (
      <SafeAreaView className="flex-1 bg-background">
        <View className="flex-1 justify-center">
          <LoadingState title={t("progress.title")} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-background">
      <ScrollView contentContainerClassName="grow p-6">
        <View className="gap-6">
          <View className="gap-2">
            <View className="flex-row items-center gap-2">
              <BackButton showLabel={false} className="-ml-2" />
              <Text variant="h1">{t("progress.title")}</Text>
            </View>
            <Text variant="muted">{t("progress.description")}</Text>
          </View>

          {/* 14-day mood trend */}
          <Card>
            <CardHeader>
              <CardTitle>{t("progress.moodTrend")}</CardTitle>
              <CardDescription>{t("progress.moodTrendDescription")}</CardDescription>
            </CardHeader>
            <CardContent>
              {chartPoints.length > 0 ? (
                <MoodLineChart data={chartPoints} width={chartWidth} />
              ) : (
                <Text variant="muted">{t("progress.noMoodData")}</Text>
              )}
            </CardContent>
          </Card>

          {/* 30-day activity counts */}
          <Card>
            <CardHeader>
              <CardTitle>{t("progress.activityTitle")}</CardTitle>
              <CardDescription>{t("progress.activityDescription")}</CardDescription>
            </CardHeader>
            <CardContent>
              <View className="flex-row flex-wrap gap-4">
                <View className="gap-1">
                  <Text className="text-3xl font-bold">{thirtyDayMoodCount}</Text>
                  <Text className="text-xs text-muted-foreground">{t("progress.moodLogs")}</Text>
                </View>
                <View className="gap-1">
                  <Text className="text-3xl font-bold">{thirtyDayJournalCount}</Text>
                  <Text className="text-xs text-muted-foreground">
                    {t("progress.journalEntries")}
                  </Text>
                </View>
                <View className="gap-1">
                  <Text className="text-3xl font-bold">{thirtyDayGratitudeCount}</Text>
                  <Text className="text-xs text-muted-foreground">
                    {t("progress.gratitudeEntries")}
                  </Text>
                </View>
              </View>
            </CardContent>
          </Card>

          {/* Reflection prompt */}
          <Card>
            <CardHeader>
              <CardTitle>{t("progress.reflectionTitle")}</CardTitle>
              <CardDescription>{t("progress.reflectionDescription")}</CardDescription>
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
