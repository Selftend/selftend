import { router } from "expo-router";
import { useState } from "react";
import { Pressable, ScrollView, View, type LayoutChangeEvent } from "react-native";
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
import { MOOD_EMOJI_BY_SCORE, STEPS } from "@/src/components/app/mood-scale";
import { formatMoodRelativeTime } from "@/src/features/mood/relative-time";
import { MoodEntryCard } from "@/src/features/mood/mood-entry-card";
import { buildMoodChartData } from "@/src/features/mood/chart-data";
import { useMoodLogs } from "@/src/features/mood/queries";
import { getDayMoodSummary, getMoodSummary, type MoodSummary } from "@/src/features/mood/summaries";
import { useSession } from "@/src/providers/session-provider";
import { toLocalDateKey, useSelectedDate } from "@/src/stores/selected-date-store";
import { cn } from "@/lib/utils";

const RECENT_LIMIT = 10;
const CHART_DAYS = 14;

export default function MoodTrackerScreen() {
  const { t, i18n } = useTranslation("mood");
  const { t: tc } = useTranslation("common");
  const { user } = useSession();
  const userId = user?.id ?? null;

  // Fetch enough history to cover the 60-day DateBar window even for users who
  // log several times a day, so day-scoped views aren't empty for older dates.
  const { data: moodLogs } = useMoodLogs(userId, 200);
  const { selectedDate, isToday } = useSelectedDate();

  const [forceOnboarding, setForceOnboarding] = useState(false);
  const [chartContainerWidth, setChartContainerWidth] = useState(300);

  const daySummary = getDayMoodSummary(moodLogs, selectedDate);
  const dayLabel = new Intl.DateTimeFormat(i18n.language, {
    weekday: "short",
    month: "short",
    day: "numeric",
  }).format(new Date(selectedDate + "T12:00:00"));
  const sevenDay = getMoodSummary(moodLogs, 7);
  const thirtyDay = getMoodSummary(moodLogs, 30);
  const chartData = buildMoodChartData(moodLogs, CHART_DAYS);
  const recent = (moodLogs ?? [])
    .filter((log) => toLocalDateKey(log.loggedAt) === selectedDate)
    .slice(0, RECENT_LIMIT);

  const lastEntry = (moodLogs ?? [])[0] ?? null;
  const lastEntryWhen = lastEntry ? formatMoodRelativeTime(lastEntry.loggedAt, t) : null;

  const handleChartLayout = (e: LayoutChangeEvent) => {
    setChartContainerWidth(e.nativeEvent.layout.width);
  };

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
            <ModuleHomeHeader
              addWidgetCategory="mood"
              title={t("title")}
              hue="be"
              icon="mood"
              description={t("description")}
              actions={[
                { type: "notifications", targetKey: "mood" },
                { type: "info", onPress: () => setForceOnboarding(true) },
              ]}
              meta={
                <View className="flex-row flex-wrap items-center gap-x-4 gap-y-1">
                  <Text variant="muted" className="text-xs">
                    {t("hero.lastEntry")} ·{" "}
                    {lastEntry ? (
                      <Text className="text-xs">
                        {MOOD_EMOJI_BY_SCORE[lastEntry.moodScore] ?? ""}{" "}
                        <Text className="text-xs font-bold text-be">{lastEntry.moodScore}/5</Text>
                        {lastEntryWhen ? ` · ${lastEntryWhen}` : ""}
                      </Text>
                    ) : (
                      <Text className="text-xs font-bold text-be/60">{tc("never")}</Text>
                    )}
                  </Text>
                  <Text variant="muted" className="text-xs">
                    {t("hero.thisWeek")} ·{" "}
                    <Text className="text-xs font-bold text-be">
                      {t("summary.count", { count: sevenDay.count })}
                    </Text>
                  </Text>
                </View>
              }
            />

            <TodayCheckInCard summary={daySummary} isToday={isToday} dayLabel={dayLabel} />

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
                  <View onLayout={handleChartLayout}>
                    {chartData.length > 0 ? (
                      <MoodLineChart data={chartData} width={chartContainerWidth} />
                    ) : (
                      <Text variant="muted">{t("trend.empty")}</Text>
                    )}
                  </View>
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
  isToday: boolean;
  dayLabel: string;
}

function TodayCheckInCard({ summary, isToday, dayLabel }: TodayCheckInCardProps) {
  const { t } = useTranslation("mood");
  const logged = summary.count > 0;
  const description = !logged
    ? isToday
      ? t("today.howAreYou")
      : t("today.howWasDay")
    : summary.count === 1
      ? t("today.completeOne", { score: summary.average })
      : t("today.completeMany", { count: summary.count, average: summary.average });

  return (
    <Card>
      <CardHeader>
        <View className="flex-row items-center gap-2">
          {logged ? <Icon name="check-circle" className="size-5 text-primary" /> : null}
          <CardTitle>{isToday ? t("today.title") : dayLabel}</CardTitle>
        </View>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        <View className="flex-row gap-2">
          {STEPS.map((step) => (
            <Pressable
              key={step.score}
              accessibilityLabel={t(`scale.steps.${step.score}`)}
              accessibilityRole="button"
              onPress={() =>
                router.push(
                  `/tools/mood-tracker/new?score=${step.score}` as Parameters<
                    typeof router.push
                  >[0],
                )
              }
              className={cn(
                "min-w-10 flex-1 basis-10 items-center justify-center gap-1 rounded-2xl border-2 px-1 py-3",
                `bg-card ${step.unselectedClass}`,
              )}
            >
              <Text className="text-2xl">{step.emoji}</Text>
              <Text className="text-xs font-semibold text-muted-foreground">{step.score}</Text>
              <Text className="text-[10.5px] leading-tight text-muted-foreground" numberOfLines={1}>
                {t(`scale.shortLabels.${step.score}`)}
              </Text>
            </Pressable>
          ))}
        </View>
        {logged ? (
          <Button
            onPress={() => router.push("/tools/mood-tracker/new")}
            variant="ghost"
            size="sm"
            className="mt-3 self-start"
          >
            <Icon name="add" className="size-4" />
            <Text>{t("today.logAnother")}</Text>
          </Button>
        ) : null}
      </CardContent>
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
