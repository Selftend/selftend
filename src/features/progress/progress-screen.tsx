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
import { ScreenHeader } from "@/src/components/app/screen-header";
import { MoodLineChart } from "@/src/components/app/mood-line-chart";
import { LoadingState } from "@/src/components/app/screen-state";
import { dailyIntegerAverages, lastNLocalDateKeys } from "@/src/features/mood/chart-data";
import { useMoodHistory } from "@/src/features/mood/queries";
import { useSession } from "@/src/providers/session-provider";

const REFLECTION_PROMPTS = [
  "progress.prompt1",
  "progress.prompt2",
  "progress.prompt3",
  "progress.prompt4",
] as const;

function getDayLabel(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString(undefined, { day: "numeric", month: "numeric" });
}

export default function ProgressScreen() {
  const { t } = useTranslation("navigation");
  const { user } = useSession();
  const { width } = useWindowDimensions();

  const { data: moodLogs, isLoading } = useMoodHistory(user?.id ?? null, 60);

  const last14Dates = lastNLocalDateKeys(14);

  const chartData = (() => {
    if (!moodLogs) return [];
    const averages = dailyIntegerAverages(moodLogs, last14Dates);
    return last14Dates.map((date, i) => ({
      day: i % 2 === 0 ? getDayLabel(date) : "",
      score: averages[i],
    }));
  })();

  const chartPoints = chartData.filter((d) => d.score !== null) as {
    day: string;
    score: number;
  }[];

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
            <ScreenHeader title={t("progress.title")} />
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
