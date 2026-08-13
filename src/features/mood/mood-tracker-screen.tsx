import { router, useFocusEffect } from "expo-router";
import { useCallback, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  useWindowDimensions,
  View,
  type LayoutChangeEvent,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";

import { cn } from "@/lib/utils";
import { Text } from "@/src/components/react-native-reusables/text";
import { ModuleHomeHeader } from "@/src/components/app/module-home-header";
import { MoodOnboarding } from "@/src/components/app/mood-onboarding-modal";
import { Section } from "@/src/components/app/section";
import { LineChart, lineChartContentWidth } from "@/src/components/charts/line-chart";
import { SegmentedControl } from "@/src/components/app/segmented-control";
import { MoodScale } from "@/src/components/app/mood-scale";
import { DateRangeField, type DateRange } from "@/src/components/app/date-range-field";
import { buildMoodChartDataForRange } from "@/src/features/mood/chart-data";
import {
  ALL_TIME_FROM_ISO,
  useFirstMoodDayKey,
  useMoodHistory,
  useMoodLogCount,
  useMoodScorePoints,
  useMoodWeek,
} from "@/src/features/mood/queries";
import { getMoodDistribution, getMoodSummary } from "@/src/features/mood/summaries";
import type { MoodLog } from "@/src/features/mood/types";
import { MoodDistributionChart } from "@/src/features/mood/mood-distribution";
import {
  buildWeekDays,
  countLogsInCurrentWeek,
  currentWeekStartKey,
  earliestWeekStartKey,
  getTopEmotionsForWindow,
  getWeekDeltaForWindow,
  shiftWeek,
  weekWindowFor,
} from "@/src/features/mood/week-window";
import { MoodHeatmap } from "@/src/features/mood/mood-heatmap";
import { formatWeekLabel, WeekHero, WeekNavigator } from "@/src/features/mood/mood-week-hero";
import { ShowAllHistoryLink } from "@/src/features/mood/show-all-history-link";
import { DEFAULT_INTERACTIVE_HIT_SLOP } from "@/src/lib/accessibility";
import { HOME_COLUMN } from "@/src/lib/layout";
import { formatOneDecimal } from "@/src/lib/locale-format";
import { useRoomStyle } from "@/src/lib/use-room-style";
import {
  addDaysToKey,
  dayKeyDiff,
  dayRangeEndKey,
  formatCompactAtOffset,
  parseLocalNoon,
} from "@/src/utils/date";
import { useSession } from "@/src/providers/session-provider";
import { currentDateKey, useSelectedDate } from "@/src/stores/selected-date-store";

/**
 * Per-section, INDEPENDENT range pickers (#880, amending #700).
 *
 * The deciding evidence: the design file itself draws independent selections —
 * trend at 30d while the distribution shows All time — so "one shared control"
 * was never what the design specified. Each stats section (Mood trend,
 * Distribution) carries its own control and its own selection state,
 * defaulting to the design's drawn states: trend 30d, distribution All time.
 * The map has no control at all (#899): always the whole history.
 *
 * The trend's presets are VIEWPORTS, not trailing windows (#900, amending
 * #880): `30d` sizes what is visible, and the chart pans horizontally back
 * through the whole history, anchored at the newest edge — the heatmap's
 * scroller pattern. All time fits the whole span (nothing left to pan);
 * Custom fits its explicit bounds (nothing outside them belongs on the
 * chart). The distribution's presets stay trailing windows — a share-of-total
 * has no axis to pan.
 *
 * No persistence (upheld from #700), and no per-selection queries: every
 * section is a client-side narrowing of ONE all-time score-points fetch — the
 * same cache entry the map reads, unbounded since #693.
 */
type StatsRange = "7d" | "30d" | "90d" | "all" | "custom";
type StatsSection = "trend" | "distribution";

const PRESET_DAYS: Record<"7d" | "30d" | "90d", number> = {
  "7d": 7,
  "30d": 30,
  "90d": 90,
};

export default function MoodTrackerScreen() {
  const { t, i18n } = useTranslation("mood");
  const roomStyle = useRoomStyle("be");
  const { user } = useSession();
  const userId = user?.id ?? null;

  // History feeds today's card and the "last logged" subline. It is deliberately
  // NOT the week block's source any more: that block can now page past this
  // cache's 200-row ceiling, which would render real logged weeks as empty (#697).
  const { data: moodLogs } = useMoodHistory(userId, 200);
  const { selectedDate } = useSelectedDate();
  /**
   * One breakpoint for the two rows the design packs tighter than 360dp allows:
   * the week header (label + chevrons + history link — #697 measured the bg
   * overflow) and the trend header (heading + five segments — #737's ~560dp).
   * Wide screens take the design's single rows; narrow keep the decided splits.
   */
  const { width: windowWidth } = useWindowDimensions();
  const wideRows = windowWidth >= 640;

  const [forceOnboarding, setForceOnboarding] = useState(false);
  const [chartContainerWidth, setChartContainerWidth] = useState(300);
  const [ranges, setRanges] = useState<Record<StatsSection, StatsRange>>({
    trend: "30d",
    distribution: "all",
  });
  const [customRanges, setCustomRanges] = useState<Record<StatsSection, DateRange | null>>({
    trend: null,
    distribution: null,
  });
  // Which section's control opened the custom picker — one modal serves both
  // controls, writing back to the section that asked.
  const [rangePickerFor, setRangePickerFor] = useState<StatsSection | null>(null);
  // Purely local, and it does not touch the today picker: "log for today" and
  // "look at a week" are different questions. There is deliberately no global
  // selected-date state to collide with (#250).
  //
  // The displayed week is stored as its own start key rather than an offset,
  // and the anchor - which week "now" falls in - is re-read on focus. A screen
  // left mounted across a Sunday-to-Monday rollover (a detail screen pushed
  // over it) would otherwise keep calling last week "This week" and refuse to
  // page forward, because nothing about `offset: 0` changed.
  const [anchorWeekStart, setAnchorWeekStart] = useState(currentWeekStartKey);
  const [displayedWeekStart, setDisplayedWeekStart] = useState(currentWeekStartKey);
  useFocusEffect(
    useCallback(() => {
      setAnchorWeekStart(currentWeekStartKey());
    }, []),
  );

  const weekWindow = useMemo(
    () => weekWindowFor(displayedWeekStart, anchorWeekStart),
    [displayedWeekStart, anchorWeekStart],
  );
  // One fetch per displayed week, covering it and the week before it, so the
  // delta is right on a navigated week rather than only on the current one.
  const weekQuery = useMoodWeek(userId, weekWindow.startKey);
  const weekLogs = weekQuery.data;

  // Newest-first, so `find` is today's latest log — the one the picker shows
  // selected and the caption names.
  const latestToday = (moodLogs ?? []).find((log) => log.dayKey === selectedDate) ?? null;
  const sevenDay = useMemo(() => getMoodSummary(moodLogs, 7), [moodLogs]);
  const weekDelta = useMemo(
    () => getWeekDeltaForWindow(weekLogs, weekWindow),
    [weekLogs, weekWindow],
  );
  const weekByDay = useMemo(() => buildWeekDays(weekLogs, weekWindow), [weekLogs, weekWindow]);
  const topEmotions = useMemo(
    () => getTopEmotionsForWindow(weekLogs, weekWindow, 3),
    [weekLogs, weekWindow],
  );
  const { data: totalCount } = useMoodLogCount(userId);
  // The calendar week, not a trailing seven days: the block below says "This
  // week" and means Monday-to-Sunday, and the same two words may not name two
  // different spans on one screen (#697).
  const thisWeekCount = useMemo(() => countLogsInCurrentWeek(moodLogs), [moodLogs]);
  const lastLog = (moodLogs ?? [])[0] ?? null; // listMoodLogs returns newest-first
  // Compact, like the design draws it: `last logged 4:50 pm`, not the full
  // date-and-year the medium/short Intl styles produce (#870).
  const lastWhen = lastLog
    ? formatCompactAtOffset(lastLog.loggedAt, lastLog.loggedOffsetMinutes)
    : null;
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
          { value: String(checkInCount), label: t("stats.checkins", { count: checkInCount }) },
          { value: String(thisWeekCount), label: t("stats.thisWeekLabel") },
          {
            value:
              sevenDay.average === null ? "-" : formatOneDecimal(sevenDay.average, i18n.language),
            label: t("stats.avgLabel"),
          },
          // The old ToolStats.subline, folded into the row as a value-less item -
          // which is exactly how the design's `2a` renders "last logged 4:50 pm".
          ...(subline ? [{ value: "", label: subline }] : []),
        ]
      : [];
  const { data: firstLogDayKey } = useFirstMoodDayKey(userId);
  /**
   * Each section's chosen range, resolved to the pieces the window math needs.
   * `isAll` waits for `firstLogDayKey` so All time has a real lower bound;
   * until it loads the section falls back to the default preset window.
   */
  const resolveRange = (section: StatsSection) => {
    const range = ranges[section];
    const custom = customRanges[section];
    const isCustom = range === "custom" && custom !== null;
    const isAll = range === "all" && Boolean(firstLogDayKey);
    const presetDays = PRESET_DAYS[range === "7d" || range === "90d" ? range : "30d"];
    return { isCustom, isAll, presetDays, custom };
  };
  const trendWindow = resolveRange("trend");
  const distWindow = resolveRange("distribution");

  // ONE all-time fetch feeds the trend, the distribution AND the map — the
  // key matches MoodHeatmap's exactly, so React Query dedupes them into a
  // single cache entry (#900, replacing #880's union-of-selections window).
  // The trend's data need stopped being a selection: a preset is a viewport
  // that pans back to the first entry, so it always wants the whole history,
  // and the distribution narrows back to its own day keys below. #693
  // established this query pages to exhaustion; it rides its own narrow
  // projection (timestamp/offset/score), so the 200-row history cache never
  // caps it.
  const { data: scorePoints } = useMoodScorePoints(userId, ALL_TIME_FROM_ISO);
  // Paging stops at the week holding the first entry: weeks before the account
  // existed are empty chrome. Until that query answers, only the current week is
  // reachable - better than offering a back arrow that lands on a blank week.
  const earliestWeekStart = useMemo(
    () => earliestWeekStartKey(firstLogDayKey ?? null, anchorWeekStart),
    [firstLogDayKey, anchorWeekStart],
  );

  /**
   * The civil-day window each chart reads, resolved per section (#880).
   *
   * Still narrowed by DAY KEY, never by the raw response: `listMoodScorePoints`
   * deliberately over-fetches — its bounds filter `logged_at`, a UTC instant,
   * while points are bucketed by the civil day captured with them, so the query
   * pads a whole day at each end. Every consumer narrows back to its own keys,
   * or a check-in on the day just outside a range appears in one chart and not
   * another.
   *
   * The shared end is `dayRangeEndKey`, not today: fly east-to-west and you
   * land holding an entry keyed "tomorrow", and a window that stops at the
   * viewer's current day would silently drop it (#250).
   */
  const sharedEndKey = useMemo(
    () => dayRangeEndKey((scorePoints ?? []).map((point) => point.dayKey)),
    [scorePoints],
  );
  const sectionKeys = (w: ReturnType<typeof resolveRange>) => {
    if (w.isCustom) return { startKey: w.custom!.start, endKey: w.custom!.end };
    if (w.isAll) return { startKey: firstLogDayKey!, endKey: sharedEndKey };
    return { startKey: addDaysToKey(sharedEndKey, -(w.presetDays - 1)), endKey: sharedEndKey };
  };
  const distKeys = sectionKeys(distWindow);

  /**
   * The trend's span under viewport presets (#900): a preset never CROPS the
   * data — it sizes what is visible. The chart's span runs from the earliest
   * fetched day (or the preset's trailing start, whichever is older) to the
   * shared end, and `panning` is true exactly when history outgrows the
   * viewport — a shorter history renders the same trailing window as before,
   * with nothing to pan. All time and Custom keep their fitted spans from
   * `sectionKeys`.
   */
  const earliestPointKey = (scorePoints ?? []).reduce<string | null>(
    (earliest, point) => (earliest === null || point.dayKey < earliest ? point.dayKey : earliest),
    null,
  );
  const trendIsPreset = !trendWindow.isCustom && !trendWindow.isAll;
  const trailingStartKey = addDaysToKey(sharedEndKey, -(trendWindow.presetDays - 1));
  const panning = trendIsPreset && earliestPointKey !== null && earliestPointKey < trailingStartKey;
  const trendKeys = panning
    ? { startKey: earliestPointKey, endKey: sharedEndKey }
    : sectionKeys(trendWindow);
  const trendDayCount = dayKeyDiff(trendKeys.startKey, trendKeys.endKey) + 1;

  // Fitted spans label only the first and last day — interior labels would
  // collide at the trend windows' densities (matches the previous bespoke
  // chart). A panning viewport instead needs dates wherever the user has
  // panned TO, so labels recur about every third of a viewport: walking from
  // the newest point leftward, a point is labelled once it sits at least
  // `presetDays / 3` days left of the last labelled one.
  //
  // Plain derivations, no useMemo: the deps would be fields of the per-render
  // `sectionKeys` objects, which the React Compiler refuses to preserve — it
  // memoizes these itself once nothing blocks compilation.
  const trendDays = buildMoodChartDataForRange(
    scorePoints,
    trendKeys.startKey,
    trendKeys.endKey,
    i18n.language,
  );
  const labelledIndices = new Set<number>();
  if (panning) {
    const labelIntervalDays = Math.ceil(trendWindow.presetDays / 3);
    let nextLabelAtOrBelow = Infinity;
    for (let i = trendDays.length - 1; i >= 0; i--) {
      // Recover the point's day index from its offset (offsets spread over
      // `trendDayCount - 1` intervals, so this inversion is exact).
      const dayIndex = Math.round(trendDays[i].offset * (trendDayCount - 1));
      if (i === trendDays.length - 1 || dayIndex <= nextLabelAtOrBelow) {
        labelledIndices.add(i);
        nextLabelAtOrBelow = dayIndex - labelIntervalDays;
      }
    }
  }
  const chartData = trendDays.map((d, i, days) => ({
    offset: d.offset,
    value: d.score,
    label: panning
      ? labelledIndices.has(i)
        ? d.day
        : undefined
      : i === 0 || i === days.length - 1
        ? d.day
        : undefined,
  }));

  // Sized so the anchored viewport shows exactly the preset's day count — the
  // chart owns the math because only it knows what its axis and insets take
  // out of the scroll viewport.
  const trendContentWidth = panning
    ? lineChartContentWidth(chartContainerWidth, trendWindow.presetDays, trendDayCount)
    : undefined;

  // The distribution reduces over the same fetched points, narrowed to ITS OWN
  // day keys (#880) - one query, no second fetch and no contact with the capped
  // history.
  const distribution = getMoodDistribution(
    (scorePoints ?? []).filter(
      (point) => point.dayKey >= distKeys.startKey && point.dayKey <= distKeys.endKey,
    ),
  );

  /**
   * The resolved span beside each section heading, e.g. "3 Mar – 1 Apr" (#700).
   *
   * Shown for Custom and for All time - the two ranges whose extent a segment
   * label does not state. `7d`/`30d`/`90d` already say their own span. The
   * All-time span ends at `dayRangeEndKey(points)`, so a newly arrived entry
   * can move the label without any of the range inputs changing.
   */
  const sectionSpanLabel = (w: ReturnType<typeof resolveRange>) => {
    const bounds = w.isCustom
      ? ([w.custom!.start, w.custom!.end] as const)
      : w.isAll
        ? ([firstLogDayKey!, sharedEndKey] as const)
        : null;
    if (!bounds) return null;
    const fmt = new Intl.DateTimeFormat(i18n.language, { day: "numeric", month: "short" });
    return `${fmt.format(parseLocalNoon(bounds[0]))} – ${fmt.format(parseLocalNoon(bounds[1]))}`;
  };
  const trendSpan = sectionSpanLabel(trendWindow);
  const distSpan = sectionSpanLabel(distWindow);

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

  /**
   * One control each for the trend and the distribution (#880) — the map has
   * none: it always shows the whole history, and its horizontal scroller is
   * how the past is reached (#899 reverted the control #880 gave it). The
   * control rides the section's heading row only
   * where the width is real (#700's measurement stands: heading + five
   * segments ≈ 560dp in `bg` against 328dp usable, and `SegmentedControl` is a
   * no-wrap, no-scroll flex row) — below 640dp each control keeps a row of its
   * own inside its section instead.
   */
  const rangeControl = (section: StatsSection) => (
    <SegmentedControl
      value={ranges[section]}
      onChange={(next: StatsRange) => {
        // Custom is a two-step choice: the picker applies it. Tapping the
        // active Custom segment again reopens the picker.
        if (next === "custom") {
          setRangePickerFor(section);
          return;
        }
        setRanges((prev) => ({ ...prev, [section]: next }));
      }}
      options={[
        { value: "7d", label: t("trendControls.range7") },
        { value: "30d", label: t("trendControls.range30") },
        { value: "90d", label: t("trendControls.range90") },
        // A short key of its own, deliberately separate from the section
        // titles: "All time" here is a range segment, not a heading.
        { value: "all", label: t("trendControls.rangeAll") },
        { value: "custom", label: t("trendControls.rangeCustom") },
      ]}
    />
  );

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
                preselected, so the first screenful is the whole interaction.
                mt-6 holds the hairline off the stat run, so the space below the
                stats reads as the same rhythm as the band inside the section —
                without it the rule sat directly under the stats (#884). */}
            <Section className="mt-6">
              <TodayCheckIn latest={latestToday} dateKey={selectedDate} />
            </Section>

            {hasAnyCheckIn ? (
              // The section's heading IS the week label, and it moves as you page
              // (#697). Two labels - a static "This week" eyebrow above a
              // navigator saying the same thing - is the shape this avoids.
              <Section
                title={formatWeekLabel(weekWindow, t, i18n.language)}
                action={
                  <View className="flex-row items-center gap-4">
                    <WeekNavigator
                      canGoBack={weekWindow.startKey > earliestWeekStart}
                      canGoForward={!weekWindow.isCurrentWeek}
                      onPrevious={() => setDisplayedWeekStart((k) => shiftWeek(k, -1))}
                      onNext={() =>
                        setDisplayedWeekStart((k) =>
                          shiftWeek(k, 1) > anchorWeekStart ? anchorWeekStart : shiftWeek(k, 1),
                        )
                      }
                    />
                    {/* The design's header row carries the history link; on a
                        narrow screen it drops to its own line inside WeekHero
                        (#697's 360dp bg measurement). Conditional, not CSS-
                        hidden, so it never exists twice in the a11y tree. */}
                    {wideRows ? <ShowAllHistoryLink /> : null}
                  </View>
                }
              >
                {/*
                  A week that has not loaded is not an empty week. `weekLogs` is
                  undefined while the fetch is in flight AND after it fails, and
                  every aggregation above turns undefined into "-", seven blank
                  days and "No emotions tagged yet" - telling a user paging
                  through a flaky connection that a week they filled is empty.
                  The same distinction the subline makes for `moodLogs` (#735)
                  and the all-history screen makes for its pages (#734).

                  Data wins over the error arm on purpose: a failed BACKGROUND
                  refetch that still has this week cached should keep rendering
                  the week, not replace it with a retry prompt.
                */}
                {weekLogs ? (
                  <WeekHero
                    window={weekWindow}
                    days={weekByDay}
                    delta={weekDelta}
                    topEmotions={topEmotions}
                    logs={weekLogs}
                    showHistoryLink={!wideRows}
                  />
                ) : weekQuery.isError ? (
                  <WeekLoadFailed onRetry={() => void weekQuery.refetch()} />
                ) : (
                  <View className="items-center py-8">
                    <ActivityIndicator />
                  </View>
                )}
              </Section>
            ) : null}

            {/*
              Each stats section carries its OWN range control (#880, amending
              #700). At ≥640dp the control rides the section's heading row; on a
              narrow screen it keeps a row of its own inside the section (#700's
              width measurement stands — heading + five segments ≈ 560dp in `bg`
              against 328dp usable). The `flex-row` wrapper keeps the pill sized
              to its segments rather than stretching the full column.
            */}
            {showTrend ? (
              <Section
                title={t("trendControls.title")}
                action={wideRows ? rangeControl("trend") : undefined}
              >
                {!wideRows ? <View className="flex-row">{rangeControl("trend")}</View> : null}
                {trendSpan ? (
                  <Text variant="muted" className="text-[13px]">
                    {trendSpan}
                  </Text>
                ) : null}
                <View onLayout={handleChartLayout}>
                  {chartData.length >= 2 ? (
                    <LineChart
                      points={chartData}
                      domain={[1, 5]}
                      width={chartContainerWidth}
                      contentWidth={trendContentWidth}
                    />
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
              Between the trend and the map, over its own range (#880, default
              All time). At one entry it reads "one check-in, and it was Okay" -
              zero counts stay in the legend as part of the picture (#881).
            */}
            {hasAnyCheckIn ? (
              <Section
                title={t("distribution.title")}
                action={wideRows ? rangeControl("distribution") : undefined}
              >
                {!wideRows ? (
                  <View className="flex-row">{rangeControl("distribution")}</View>
                ) : null}
                {distSpan ? (
                  <Text variant="muted" className="text-[13px]">
                    {distSpan}
                  </Text>
                ) : null}
                <MoodDistributionChart counts={distribution} />
              </Section>
            ) : null}

            {/* No range control and no span caption (#899): the map is pinned
                to the whole history, and the scroller's own month labels name
                the period a caption would restate. */}
            {hasAnyCheckIn ? (
              <Section title={t("heatmap.title")}>
                <MoodHeatmap userId={userId} />
              </Section>
            ) : null}

            {/* One modal serving both controls, writing back to the
                section whose control opened it. */}
            {hasAnyCheckIn ? (
              <DateRangeField
                visible={rangePickerFor !== null}
                onClose={() => setRangePickerFor(null)}
                value={rangePickerFor !== null ? customRanges[rangePickerFor] : null}
                onChange={(range) => {
                  if (rangePickerFor === null) return;
                  setCustomRanges((prev) => ({ ...prev, [rangePickerFor]: range }));
                  setRanges((prev) => ({ ...prev, [rangePickerFor]: "custom" }));
                }}
                minDateKey={firstLogDayKey ?? undefined}
                maxDateKey={currentDateKey()}
              />
            ) : null}
          </View>
        </ScrollView>
      </SafeAreaView>
    </>
  );
}

/**
 * The week could not be read. Deliberately NOT `ErrorState`: that renders a
 * `Card`, and #690/#735 took cards off the module homes - a bordered panel
 * among hairline sections reads as a competing page. Quiet line plus a retry,
 * at the scale of the section it sits in.
 */
function WeekLoadFailed({ onRetry }: { onRetry: () => void }) {
  const { t } = useTranslation("mood");

  return (
    <View className="gap-2 py-2">
      <Text variant="muted" className="text-[13px]">
        {t("week.loadFailed")}
      </Text>
      <Pressable
        accessibilityRole="button"
        hitSlop={DEFAULT_INTERACTIVE_HIT_SLOP}
        onPress={onRetry}
        role="button"
        className="self-start active:opacity-70"
      >
        <Text className="text-[13px] font-semibold text-primary-ink">
          {t("errors:fallback.retry")}
        </Text>
      </Pressable>
    </View>
  );
}

interface TodayCheckInProps {
  /** The latest of today's logs, newest-first — null when today is unlogged. */
  latest: MoodLog | null;
  dateKey: string;
}

// The overview always describes the device's current local day (#250), so this
// names today rather than branching on a constant (#720). A panel for some other
// day is the redesign's day panel (#697), not this one wearing a flag.
//
// The design's centred block (`2a`): question, the date under it, the bare
// scale, then a caption line naming today's last log. The scale shows that
// log's score selected — the picker doubles as today's record — and tapping
// any glyph still opens the editor with it preselected, which the caption
// says out loud ("tap to add another").
function TodayCheckIn({ latest, dateKey }: TodayCheckInProps) {
  const { t, i18n } = useTranslation("mood");
  const dateLine = new Intl.DateTimeFormat(i18n.language, {
    weekday: "long",
    day: "numeric",
    month: "long",
  }).format(parseLocalNoon(dateKey));
  // Today's log by construction (`latestToday`), so the compact form is always
  // a bare time — `last logged 4:50 pm`, which is also what stops the caption
  // wrapping onto two ragged lines at 360dp (#870).
  const lastWhen = latest
    ? formatCompactAtOffset(latest.loggedAt, latest.loggedOffsetMinutes)
    : null;

  return (
    // No extra py: the section's own padding IS the breathing space, and the
    // even rhythm above/below the block is the point (#884).
    <View className="items-center gap-5">
      <View className="items-center gap-1">
        {/* Level 2: the module title is the page heading, and this is the
            first thing under it. */}
        <Text
          role="heading"
          aria-level={2}
          className="text-center text-lg font-semibold text-foreground"
        >
          {t("today.howAreYou")}
        </Text>
        <Text variant="muted" className="text-[13px]">
          {dateLine}
        </Text>
      </View>
      <MoodScale
        value={latest?.moodScore ?? null}
        onChange={(score) =>
          router.push(`/tools/check-in/new?score=${score}` as Parameters<typeof router.push>[0])
        }
        compact
      />
      {/* min-height keeps the block from jumping when the first log lands. */}
      <View
        testID="today-caption"
        className="min-h-[20px] flex-row flex-wrap items-center justify-center gap-x-2"
      >
        {latest && lastWhen ? (
          <>
            <Text className="text-[13px] font-semibold text-primary-ink">
              {t(`checkin.scaleLabels.${latest.moodScore}`)}
            </Text>
            <Text variant="muted" className="text-[13px]">
              · {t("today.lastLoggedTap", { when: lastWhen })}
            </Text>
          </>
        ) : null}
      </View>
    </View>
  );
}
