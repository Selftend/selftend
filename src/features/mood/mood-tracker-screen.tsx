import { router } from "expo-router";
import { useState } from "react";
import { ScrollView, View, useWindowDimensions } from "react-native";
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
import { Icon } from "@/src/components/react-native-reusables/icon";
import { Text } from "@/src/components/react-native-reusables/text";
import { ModuleHomeHeader } from "@/src/components/app/module-home-header";
import { MoodOnboarding } from "@/src/components/app/mood-onboarding-modal";
import { MoodLineChart } from "@/src/components/app/mood-line-chart";
import { MoodEntryCard } from "@/src/features/mood/mood-entry-card";
import { buildMoodChartData } from "@/src/features/mood/chart-data";
import { useMoodLogs } from "@/src/features/mood/queries";
import { getMoodSummary, type MoodSummary } from "@/src/features/mood/summaries";
import { useSession } from "@/src/providers/session-provider";

const RECENT_LIMIT = 10;
const CHART_DAYS = 14;
const CHART_HORIZONTAL_PADDING = 48; // p-6 on the ScrollView = 24px each side

export default function MoodTrackerScreen() {
  const { t } = useTranslation("mood");
  const { user } = useSession();
  const { width } = useWindowDimensions();
  const userId = user?.id ?? null;

  const { data: moodLogs } = useMoodLogs(userId, 30);

  const [forceOnboarding, setForceOnboarding] = useState(false);

  const today = getMoodSummary(moodLogs, 1);
  const sevenDay = getMoodSummary(moodLogs, 7);
  const thirtyDay = getMoodSummary(moodLogs, 30);
  const chartData = buildMoodChartData(moodLogs, CHART_DAYS);
  const recent = moodLogs?.slice(0, RECENT_LIMIT) ?? [];

  const chartWidth = Math.min(width, 720) - CHART_HORIZONTAL_PADDING;

  return (
    <>
      <MoodOnboarding
        visible={forceOnboarding}
        onComplete={() => setForceOnboarding(false)}
        onDismiss={() => setForceOnboarding(false)}
      />
      <SafeAreaView className="flex-1 bg-background" edges={["bottom", "left", "right"]}>
        <ScrollView contentContainerClassName="grow p-6">
          <View className="gap-6">
            <View className="gap-2">
              <ModuleHomeHeader
                title={t("title")}
                actions={[
                  { type: "notifications", targetKey: "mood" },
                  { type: "info", onPress: () => setForceOnboarding(true) },
                ]}
              />
              <Text variant="muted" className="max-w-[64ch]">
                {t("description")}
              </Text>
            </View>

            <TodayCheckInCard
              summary={today}
              onLog={() => router.push("/tools/mood-tracker/new")}
            />

            {today.count > 0 ? (
              <Button
                onPress={() => router.push("/tools/mood-tracker/new")}
                variant="outline"
                className="self-start"
              >
                <Icon name="mood" className="size-4" />
                <Text>{t("today.logAnother")}</Text>
              </Button>
            ) : null}

            <View className="gap-3">
              <Text variant="h3">{t("sections.summary")}</Text>
              <View className="flex-row flex-wrap gap-3">
                <SummaryTile labelKey="summary.sevenDay" summary={sevenDay} />
                <SummaryTile labelKey="summary.thirtyDay" summary={thirtyDay} />
              </View>
            </View>

            <View className="gap-3">
              <Text variant="h3">{t("sections.trend")}</Text>
              <Card>
                <CardHeader>
                  <CardTitle>{t("trend.lastDays")}</CardTitle>
                </CardHeader>
                <CardContent>
                  {chartData.length > 0 ? (
                    <MoodLineChart data={chartData} width={chartWidth} />
                  ) : (
                    <Text variant="muted">{t("trend.empty")}</Text>
                  )}
                </CardContent>
              </Card>
            </View>

            <View className="gap-3">
              <Text variant="h3">{t("sections.recent")}</Text>
              {recent.length > 0 ? (
                <View className="gap-3">
                  {recent.map((entry) => (
                    <MoodEntryCard key={entry.id} entry={entry} />
                  ))}
                </View>
              ) : (
                <Text variant="muted">{t("recent.empty")}</Text>
              )}
            </View>
          </View>
        </ScrollView>
      </SafeAreaView>
    </>
  );
}

interface TodayCheckInCardProps {
  summary: MoodSummary;
  onLog: () => void;
}

function TodayCheckInCard({ summary, onLog }: TodayCheckInCardProps) {
  const { t } = useTranslation("mood");
  const logged = summary.count > 0;
  const description = !logged
    ? t("today.pending")
    : summary.count === 1
      ? t("today.completeOne", { score: summary.average })
      : t("today.completeMany", { count: summary.count, average: summary.average });

  return (
    <Card>
      <CardHeader>
        <View className="flex-row items-center gap-2">
          {logged ? <Icon name="check-circle" className="size-5 text-primary" /> : null}
          <CardTitle>{t("today.title")}</CardTitle>
        </View>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      {!logged ? (
        <CardContent>
          <Button onPress={onLog} className="self-start">
            <Icon name="mood" className="size-4 text-primary-foreground" />
            <Text>{t("cta.logMood")}</Text>
          </Button>
        </CardContent>
      ) : null}
    </Card>
  );
}

interface SummaryTileProps {
  labelKey: string;
  summary: MoodSummary;
}

function SummaryTile({ labelKey, summary }: SummaryTileProps) {
  const { t } = useTranslation("mood");
  return (
    <View className="min-w-[180px] flex-1 basis-[180px] gap-1 rounded-2xl border border-border bg-card p-4">
      <Text variant="muted" className="text-xs uppercase tracking-wide">
        {t(labelKey)}
      </Text>
      {summary.average === null ? (
        <Text className="text-sm">{t("summary.noData")}</Text>
      ) : (
        <>
          <Text className="text-2xl font-semibold">
            {t("summary.average", { average: summary.average })}
          </Text>
          <Text variant="muted" className="text-xs">
            {t("summary.count", { count: summary.count })}
          </Text>
        </>
      )}
    </View>
  );
}
