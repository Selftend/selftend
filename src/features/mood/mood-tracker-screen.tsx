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
import { ContentSheet } from "@/src/components/app/content-sheet";
import { ModuleHomeHeader } from "@/src/components/app/module-home-header";
import { MoodOnboarding } from "@/src/components/app/mood-onboarding-modal";
import { LineChart } from "@/src/components/charts/line-chart";
import { SegmentedControl } from "@/src/components/app/segmented-control";
import { MoodScale } from "@/src/components/app/mood-scale";
import { ToolStats } from "@/src/components/app/tool-stats";
import { DateRangeField, type DateRange } from "@/src/components/app/date-range-field";
import { MoodHistoryList } from "@/src/features/mood/mood-history-list";
import { buildMoodChartData, buildMoodChartDataForRange } from "@/src/features/mood/chart-data";
import {
  useFirstMoodDayKey,
  useMoodHistory,
  useMoodLogCount,
  useMoodScorePoints,
} from "@/src/features/mood/queries";
import {
  getDayMoodSummary,
  getMoodSummary,
  getDailyAverages,
  getTopEmotions,
  getWeekDelta,
  type MoodSummary,
} from "@/src/features/mood/summaries";
import { MoodHeatmap } from "@/src/features/mood/mood-heatmap";
import { WeekHero } from "@/src/features/mood/mood-week-hero";
import { useRoomStyle } from "@/src/lib/use-room-style";
import { formatAtOffset, parseLocalNoon, startOfDayDaysAgo } from "@/src/utils/date";
import { useSession } from "@/src/providers/session-provider";
import { currentDateKey, useSelectedDate } from "@/src/stores/selected-date-store";

type TrendRange = "7d" | "30d" | "90d" | "custom";

const PRESET_DAYS: Record<Exclude<TrendRange, "custom">, number> = {
  "7d": 7,
  "30d": 30,
  "90d": 90,
};

export default function MoodTrackerScreen() {
  const { t, i18n } = useTranslation("mood");
  const roomStyle = useRoomStyle("be");
  const { user } = useSession();
  const userId = user?.id ?? null;

  // History feeds the week summaries, day card, and history list; the trend chart
  // rides its own unbounded score-points query further down.
  const { data: moodLogs } = useMoodHistory(userId, 200);
  const { selectedDate, isToday } = useSelectedDate();

  const [forceOnboarding, setForceOnboarding] = useState(false);
  const [chartContainerWidth, setChartContainerWidth] = useState(300);
  const [trendRange, setTrendRange] = useState<TrendRange>("30d");
  const [customRange, setCustomRange] = useState<DateRange | null>(null);
  const [rangePickerOpen, setRangePickerOpen] = useState(false);

  // Each aggregation iterates up to 200 logs; memoize so unrelated re-renders (chart-width
  // onLayout or onboarding toggle) don't recompute the week/day summaries.
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
  const lastWhen = lastLog ? formatAtOffset(lastLog.loggedAt, lastLog.loggedOffsetMinutes) : null;
  // `moodLogs` is undefined while loading and after a failed fetch with no
  // cache - only an actually-loaded (possibly empty) history may claim "no
  // check-ins", or a returning user's history reads as erased.
  const subline = lastWhen
    ? t("stats.last", { when: lastWhen })
    : moodLogs
      ? t("stats.never")
      : undefined;

  const statItems = [
    { value: String(totalCount ?? moodLogs?.length ?? 0), label: t("stats.checkinsLabel") },
    { value: String(thisWeekCount), label: t("stats.thisWeekLabel") },
    {
      value: sevenDay.average === null ? "-" : sevenDay.average.toFixed(1),
      label: t("stats.avgLabel"),
    },
  ];
  // The trend window rides its own narrow query (timestamp/offset/score only), so
  // the 200-row history cache never caps the range. Preset windows omit the upper
  // bound — the key stays stable across renders and new logs still land in-window.
  const isCustom = trendRange === "custom" && customRange !== null;
  const windowFromIso = isCustom
    ? new Date(`${customRange.start}T00:00:00`).toISOString()
    : startOfDayDaysAgo(PRESET_DAYS[trendRange === "custom" ? "30d" : trendRange]).toISOString();
  const windowToIso = isCustom
    ? new Date(`${customRange.end}T23:59:59.999`).toISOString()
    : undefined;
  const { data: scorePoints } = useMoodScorePoints(userId, windowFromIso, windowToIso);
  const { data: firstLogDayKey } = useFirstMoodDayKey(userId);

  // Only the first and last day are labelled — interior labels would collide
  // at the trend windows' densities (matches the previous bespoke chart).
  const chartData = useMemo(() => {
    const days = isCustom
      ? buildMoodChartDataForRange(scorePoints, customRange.start, customRange.end, i18n.language)
      : buildMoodChartData(
          scorePoints,
          PRESET_DAYS[trendRange === "custom" ? "30d" : trendRange],
          i18n.language,
        );
    return days.map((d, i) => ({
      offset: d.offset,
      value: d.score,
      label: i === 0 || i === days.length - 1 ? d.day : undefined,
    }));
  }, [scorePoints, isCustom, customRange, trendRange, i18n.language]);

  // e.g. "3 Mar – 1 Apr", locale-aware, shown while a custom range is active.
  const customSpanLabel = useMemo(() => {
    if (!isCustom) return null;
    const fmt = new Intl.DateTimeFormat(i18n.language, { day: "numeric", month: "short" });
    return `${fmt.format(parseLocalNoon(customRange.start))} – ${fmt.format(parseLocalNoon(customRange.end))}`;
  }, [isCustom, customRange, i18n.language]);
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
      <SafeAreaView
        className="flex-1 bg-background"
        edges={["bottom", "left", "right"]}
        style={roomStyle}
      >
        <MoodHistoryList
          logs={history}
          ListHeaderComponent={
            // The field + sheet escape the list's 16px content padding so the
            // rose field runs edge to edge; the sheet re-adds the inset for
            // its cards, and the rows below stay on the list's own padding.
            <View className="-mx-4 -mt-4">
              <ModuleHomeHeader
                variant="field"
                addWidgetCategory="mood"
                title={t("title")}
                hue="be"
                icon="mood"
                moduleLabel={null}
                tourScope="mood"
                description={t("description")}
                actions={[
                  { type: "notifications", targetKey: "mood" },
                  { type: "info", onPress: () => setForceOnboarding(true) },
                ]}
                meta={
                  <ToolStats
                    tone="onField"
                    accentClassName="text-accent-ink"
                    items={statItems}
                    subline={subline}
                    sublineTone={lastWhen ? "accent" : "muted"}
                  />
                }
              />
              <ContentSheet className="px-4">
                <View className="gap-6">
                  <TodayCheckInCard summary={daySummary} isToday={isToday} dayLabel={dayLabel} />

                  <View className="gap-3">
                    <Text variant="h3">{t("week.title")}</Text>
                    <WeekHero delta={weekDelta} byDay={weekByDay} topEmotions={topEmotions} />
                  </View>

                  <View className="gap-3">
                    <View className="flex-row flex-wrap items-center justify-between gap-2">
                      <Text variant="h3">{t("trendControls.title")}</Text>
                      <SegmentedControl
                        value={trendRange}
                        onChange={(next) => {
                          // Custom is a two-step choice: the picker applies it. Tapping the
                          // active Custom segment again reopens the picker for adjustment.
                          if (next === "custom") {
                            setRangePickerOpen(true);
                            return;
                          }
                          setTrendRange(next);
                        }}
                        options={[
                          { value: "7d", label: t("trendControls.range7") },
                          { value: "30d", label: t("trendControls.range30") },
                          { value: "90d", label: t("trendControls.range90") },
                          { value: "custom", label: t("trendControls.rangeCustom") },
                        ]}
                      />
                    </View>
                    {customSpanLabel ? (
                      <Text variant="muted" className="text-[13px]">
                        {customSpanLabel}
                      </Text>
                    ) : null}
                    <DateRangeField
                      visible={rangePickerOpen}
                      onClose={() => setRangePickerOpen(false)}
                      value={customRange}
                      onChange={(range) => {
                        setCustomRange(range);
                        setTrendRange("custom");
                      }}
                      minDateKey={firstLogDayKey ?? undefined}
                      maxDateKey={currentDateKey()}
                    />
                    <Card variant="soft" tint="be">
                      <CardContent className="pt-4">
                        <View onLayout={handleChartLayout}>
                          {chartData.length > 0 ? (
                            <LineChart
                              points={chartData}
                              domain={[1, 5]}
                              hue="be"
                              width={chartContainerWidth}
                            />
                          ) : (
                            <Text variant="muted">{t("trend.empty")}</Text>
                          )}
                        </View>
                      </CardContent>
                    </Card>
                  </View>

                  <View className="gap-3">
                    <Text variant="h3">{t("heatmap.title")}</Text>
                    <Card variant="soft" tint="be">
                      <CardContent className="pt-4">
                        <MoodHeatmap userId={userId} />
                      </CardContent>
                    </Card>
                  </View>

                  <Text variant="h3">{t("history.title")}</Text>
                </View>
              </ContentSheet>
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
    <Card variant="soft" tint="be">
      <CardHeader>
        <View className="flex-row items-center gap-2">
          {logged ? <Icon name="check-circle" className="size-5 text-primary" /> : null}
          <CardTitle aria-level={2}>{isToday ? t("today.title") : dayLabel}</CardTitle>
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
