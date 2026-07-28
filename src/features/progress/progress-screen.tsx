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
import { LineChart } from "@/src/components/charts/line-chart";
import { LoadingState } from "@/src/components/app/screen-state";
import { buildMoodChartData } from "@/src/features/mood/chart-data";
import { useMoodScorePoints } from "@/src/features/mood/queries";
import { useSession } from "@/src/providers/session-provider";
import { startOfDayDaysAgo } from "@/src/utils/date";

const TREND_DAYS = 30;

const REFLECTION_PROMPTS = [
  "progress.prompt1",
  "progress.prompt2",
  "progress.prompt3",
  "progress.prompt4",
] as const;

export default function ProgressScreen() {
  const { t, i18n } = useTranslation("navigation");
  const { user } = useSession();
  const { width } = useWindowDimensions();

  // Fixed 30-day window over the narrow score-points query (timestamp/offset/score
  // only) — the same daily-resolution path as the mood screen's trend, sans controls.
  const { data: scorePoints, isLoading } = useMoodScorePoints(
    user?.id ?? null,
    startOfDayDaysAgo(TREND_DAYS).toISOString(),
  );

  const chartPoints = (() => {
    const days = buildMoodChartData(scorePoints, TREND_DAYS, i18n.language);
    // Only the first and last day are labelled — interior labels would collide
    // at this window's density (mirrors the mood screen's trend).
    return days.map((d, i) => ({
      offset: d.offset,
      value: d.score,
      label: i === 0 || i === days.length - 1 ? d.day : undefined,
    }));
  })();

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
                <LineChart points={chartPoints} domain={[1, 5]} hue="be" width={chartWidth} />
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
