import { router } from "expo-router";
import { useMemo, useState } from "react";
import { View, type LayoutChangeEvent } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";

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
import { SegmentedControl } from "@/src/components/app/segmented-control";
import { MoodScale } from "@/src/components/app/mood-scale";
import { ToolStats } from "@/src/components/app/tool-stats";
import { MoodHistoryList } from "@/src/features/mood/mood-history-list";
import { buildMoodChartData } from "@/src/features/mood/chart-data";
import { useMoodLogs, useMoodLogCount } from "@/src/features/mood/queries";
import {
  getDayMoodSummary,
  getMoodSummary,
  getDailyAverages,
  getTopEmotions,
  getWeekDelta,
  type MoodSummary,
} from "@/src/features/mood/summaries";
import { WeekHero } from "@/src/features/mood/mood-week-hero";
import { formatLocalTimestamp, parseLocalNoon } from "@/src/utils/date";
import { useSession } from "@/src/providers/session-provider";
import { useSelectedDate } from "@/src/stores/selected-date-store";

export default function MoodTrackerScreen() {
  const { t, i18n } = useTranslation("mood");
  const { user } = useSession();
  const userId = user?.id ?? null;

  // Fetch enough history to cover the 60-day DateBar window even for users who
  // log several times a day, so day-scoped views aren't empty for older dates.
  const { data: moodLogs } = useMoodLogs(userId, 200);
  const { selectedDate, isToday } = useSelectedDate();

  const [forceOnboarding, setForceOnboarding] = useState(false);
  const [chartContainerWidth, setChartContainerWidth] = useState(300);
  const [trendDays, setTrendDays] = useState<7 | 14 | 30>(14);

  // Each aggregation iterates up to 200 logs; memoize so unrelated re-renders (chart-width
  // onLayout, onboarding toggle, DateBar changes) don't recompute the week/day summaries.
  const daySummary = useMemo(
    () => getDayMoodSummary(moodLogs, selectedDate),
    [moodLogs, selectedDate],
  );
  const dayLabel = useMemo(
    () =>
      new Intl.DateTimeFormat(i18n.language, {
        weekday: "short",
        month: "short",
        day: "numeric",
      }).format(parseLocalNoon(selectedDate)),
    [i18n.language, selectedDate],
  );
  const sevenDay = useMemo(() => getMoodSummary(moodLogs, 7), [moodLogs]);
  const weekDelta = useMemo(() => getWeekDelta(moodLogs), [moodLogs]);
  const weekByDay = useMemo(() => getDailyAverages(moodLogs, 7), [moodLogs]);
  const topEmotions = useMemo(() => getTopEmotions(moodLogs, 3), [moodLogs]);
  const { data: totalCount } = useMoodLogCount(userId);
  const thisWeekCount = sevenDay.count;
  const lastLog = (moodLogs ?? [])[0] ?? null; // listMoodLogs returns newest-first
  const lastWhen = lastLog ? formatLocalTimestamp(lastLog.loggedAt) : null;

  const statItems = [
    { value: String(totalCount ?? moodLogs?.length ?? 0), label: t("stats.checkinsLabel") },
    { value: String(thisWeekCount), label: t("stats.thisWeekLabel") },
    {
      value: sevenDay.average === null ? "–" : sevenDay.average.toFixed(1),
      label: t("stats.avgLabel"),
    },
  ];
  const chartData = useMemo(() => buildMoodChartData(moodLogs, trendDays), [moodLogs, trendDays]);
  const history = moodLogs ?? [];

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
        <MoodHistoryList
          logs={history}
          ListHeaderComponent={
            <View className="gap-6">
              <ModuleHomeHeader
                addWidgetCategory="mood"
                title={t("title")}
                hue="be"
                icon="mood"
                moduleLabel={null}
                description={t("description")}
                actions={[
                  { type: "notifications", targetKey: "mood" },
                  { type: "info", onPress: () => setForceOnboarding(true) },
                ]}
                meta={
                  <ToolStats
                    accentClassName="text-be"
                    items={statItems}
                    subline={lastWhen ? t("stats.last", { when: lastWhen }) : t("stats.never")}
                  />
                }
              />

              <TodayCheckInCard summary={daySummary} isToday={isToday} dayLabel={dayLabel} />

              <View className="gap-3">
                <Text variant="h3">{t("week.title")}</Text>
                <WeekHero delta={weekDelta} byDay={weekByDay} topEmotions={topEmotions} />
              </View>

              <View className="gap-3">
                <View className="flex-row items-center justify-between">
                  <Text variant="h3">{t("trendControls.title")}</Text>
                  <SegmentedControl
                    value={trendDays}
                    onChange={setTrendDays}
                    options={[
                      { value: 7, label: t("trendControls.range7") },
                      { value: 14, label: t("trendControls.range14") },
                      { value: 30, label: t("trendControls.range30") },
                    ]}
                  />
                </View>
                <Card>
                  <CardContent className="pt-4">
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

              <Text variant="h3">{t("history.title")}</Text>
            </View>
          }
        />
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
        <MoodScale
          value={null}
          onChange={(score) =>
            router.push(
              `/tools/mood-tracker/new?score=${score}` as Parameters<typeof router.push>[0],
            )
          }
          compact
        />
      </CardContent>
    </Card>
  );
}
