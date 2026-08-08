import { router } from "expo-router";
import { useMemo, useState } from "react";
import { Pressable, ScrollView, View, type LayoutChangeEvent } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";

import { cn } from "@/lib/utils";
import { Icon } from "@/src/components/react-native-reusables/icon";
import { Text } from "@/src/components/react-native-reusables/text";
import { ModuleHomeHeader } from "@/src/components/app/module-home-header";
import { MoodOnboarding } from "@/src/components/app/mood-onboarding-modal";
import { Section } from "@/src/components/app/section";
import { LineChart } from "@/src/components/charts/line-chart";
import { SegmentedControl } from "@/src/components/app/segmented-control";
import { MoodScale } from "@/src/components/app/mood-scale";
import { DateRangeField, type DateRange } from "@/src/components/app/date-range-field";
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
import { DEFAULT_INTERACTIVE_HIT_SLOP } from "@/src/lib/accessibility";
import { HOME_COLUMN } from "@/src/lib/layout";
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
  const { selectedDate } = useSelectedDate();

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

  const checkInCount = totalCount ?? moodLogs?.length ?? 0;
  // The stats row earns its place the same way the sections below do (#735,
  // decided on #695): a brand-new user is met by the picker, not by "0 check-ins
  // · 0 this week · - 7-day avg". `ModuleHomeHeader` renders nothing at all for
  // an empty array (#690), so there is no empty row left behind.
  const statItems =
    checkInCount > 0
      ? [
          { value: String(checkInCount), label: t("stats.checkinsLabel") },
          { value: String(thisWeekCount), label: t("stats.thisWeekLabel") },
          {
            value: sevenDay.average === null ? "-" : sevenDay.average.toFixed(1),
            label: t("stats.avgLabel"),
          },
          // The old ToolStats.subline, folded into the row as a value-less item -
          // which is exactly how the design's `2a` renders "last logged 4:50 pm".
          ...(subline ? [{ value: "", label: subline }] : []),
        ]
      : [];
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
  const handleChartLayout = (e: LayoutChangeEvent) => {
    setChartContainerWidth(e.nativeEvent.layout.width);
  };

  /**
   * Sections appear as they earn their place (#735, decided on #695).
   *
   * They append in a fixed order, so the screen GROWS rather than rearranges -
   * nothing already on screen ever moves. The alternative was meeting a brand-new
   * user with four near-identical empty panels, three of which say the same
   * sentence in different clothes ("Log a mood to start your trend.", "...your
   * map."). Four consecutive nothing-yet states read as four small failures,
   * which is the wrong first impression for this product.
   *
   * Earning a place is one-way. `checkInCount` falls back to the loaded logs, so
   * a pending or failed count query cannot retract the week block - and with it
   * the ONLY link to all history - from a user whose entries are already on
   * screen.
   *
   * The trend needs TWO points, not one: a line chart through a single point is
   * a dot, and "trend" is a claim about direction that one check-in cannot make.
   * `chartData` already counts days-with-data rather than days-in-window
   * (`chart-data.ts` skips empty buckets), so its length is the point count.
   *
   * But that count is the SELECTED range's, and the range switch lives inside
   * this section: gating on it directly lets a user pick 7d, land under two
   * points, and watch the control they'd use to get back to 30d unmount with the
   * chart. So the gate latches - once the trend has been earned it stays for the
   * life of the screen, and a narrow range empties the chart rather than the
   * page. This also rides out the blank between a range change and its data.
   */
  const hasAnyCheckIn = checkInCount > 0;
  const trendEarned = chartData.length >= 2;
  const [trendEverEarned, setTrendEverEarned] = useState(false);
  if (trendEarned && !trendEverEarned) setTrendEverEarned(true);
  const showTrend = trendEarned || trendEverEarned;

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
        {/*
          A plain scroller, not a list (#735, decided on #695). The overview used
          to BE its history list, with everything above passed as
          `ListHeaderComponent`; with the history gone there is nothing to
          virtualize - four sections, fixed count - so the inversion resolves
          into an ordinary page. The heatmap's own horizontal scroller nests
          inside this exactly as it already nested inside the list header.
        */}
        <ScrollView contentContainerClassName="grow p-4">
          {/* No gap: `Section` carries its own py-6, and the hairline belongs
              between two sections' padding rather than across a flex gap. */}
          <View className={cn(HOME_COLUMN)}>
            <ModuleHomeHeader
              addWidgetCategory="mood"
              title={t("title")}
              tourScope="mood"
              description={t("description")}
              actions={[
                { type: "notifications", targetKey: "mood" },
                { type: "info", onPress: () => setForceOnboarding(true) },
              ]}
              stats={statItems}
            />

            {/* Always. Tapping a score deep-links into the editor with it
                preselected, so the first screenful is the whole interaction. */}
            <Section ruled={false}>
              <TodayCheckIn summary={daySummary} />
            </Section>

            {hasAnyCheckIn ? (
              <Section title={t("week.title")} action={<ShowAllHistoryLink />}>
                <WeekHero delta={weekDelta} byDay={weekByDay} topEmotions={topEmotions} />
              </Section>
            ) : null}

            {showTrend ? (
              <Section
                title={t("trendControls.title")}
                action={
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
                }
              >
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
                <View onLayout={handleChartLayout}>
                  {chartData.length >= 2 ? (
                    <LineChart points={chartData} domain={[1, 5]} width={chartContainerWidth} />
                  ) : (
                    // The range the user chose, not their history, is what is
                    // thin here - so this says that rather than "log a mood".
                    <Text variant="muted" className="text-[13px]">
                      {t("trend.emptyRange")}
                    </Text>
                  )}
                </View>
              </Section>
            ) : null}

            {/*
              The distribution section belongs here, between the trend and the
              map, sharing the trend's range control (#737). This ticket reserves
              the slot rather than rendering an empty one - a placeholder panel
              is exactly the four-empty-panels first run the staging above exists
              to avoid.
            */}

            {hasAnyCheckIn ? (
              <Section title={t("heatmap.title")}>
                <MoodHeatmap userId={userId} />
              </Section>
            ) : null}
          </View>
        </ScrollView>
      </SafeAreaView>
    </>
  );
}

/**
 * The overview's only entrance to the all-history screen, in the week row where
 * the design draws it (#696). The week strip is check-in's recency view, so the
 * link sits beside it rather than under a duplicate list of recent entries.
 */
function ShowAllHistoryLink() {
  const { t } = useTranslation("mood");

  return (
    <Pressable
      accessibilityRole="link"
      hitSlop={DEFAULT_INTERACTIVE_HIT_SLOP}
      onPress={() => router.push("/tools/check-in/history")}
      className="flex-row items-center gap-1 active:opacity-70"
      role="link"
    >
      <Text className="text-[13px] font-semibold text-primary-ink">{t("allHistory.link")}</Text>
      <Icon name="arrow-forward" className="size-3.5 text-primary-ink" />
    </Pressable>
  );
}

interface TodayCheckInProps {
  summary: MoodSummary;
}

// The overview always describes the device's current local day (#250), so this
// names today rather than branching on a constant (#720). A panel for some other
// day is the redesign's day panel (#697), not this one wearing a flag.
//
// No longer a card (#735, decided on #690/#695): the surfaces stack down one
// column, and bordered cards on a background read as competing panels rather
// than one page. The hairline `Section` around it carries the separation now.
function TodayCheckIn({ summary }: TodayCheckInProps) {
  const { t } = useTranslation("mood");
  const logged = summary.count > 0;
  const description = !logged
    ? t("today.howAreYou")
    : summary.count === 1
      ? t("today.completeOne", { score: summary.average })
      : t("today.completeMany", { count: summary.count, average: summary.average });

  return (
    <>
      <View className="gap-1.5">
        <View className="flex-row items-center gap-2">
          {logged ? <Icon name="check-circle" className="size-5 text-primary" /> : null}
          {/* Level 2: the module title is the page heading, and this is the
              first thing under it - the same level the CardTitle carried. */}
          <Text variant="h3" aria-level={2} className="text-lg">
            {t("today.title")}
          </Text>
        </View>
        <Text variant="muted">{description}</Text>
      </View>
      <MoodScale
        value={null}
        onChange={(score) =>
          router.push(`/tools/check-in/new?score=${score}` as Parameters<typeof router.push>[0])
        }
        compact
      />
    </>
  );
}
