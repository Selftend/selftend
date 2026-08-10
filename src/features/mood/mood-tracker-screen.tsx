import { router, useFocusEffect } from "expo-router";
import { useCallback, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  View,
  type LayoutChangeEvent,
} from "react-native";
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
import { buildMoodChartDataForRange } from "@/src/features/mood/chart-data";
import {
  useFirstMoodDayKey,
  useMoodHistory,
  useMoodLogCount,
  useMoodScorePoints,
  useMoodWeek,
} from "@/src/features/mood/queries";
import {
  getDayMoodSummary,
  getMoodDistribution,
  getMoodSummary,
  type MoodSummary,
} from "@/src/features/mood/summaries";
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
import { DEFAULT_INTERACTIVE_HIT_SLOP } from "@/src/lib/accessibility";
import { HOME_COLUMN } from "@/src/lib/layout";
import { useRoomStyle } from "@/src/lib/use-room-style";
import {
  addDaysToKey,
  dayRangeEndKey,
  formatAtOffset,
  parseLocalNoon,
  startOfDayDaysAgo,
} from "@/src/utils/date";
import { useSession } from "@/src/providers/session-provider";
import { currentDateKey, useSelectedDate } from "@/src/stores/selected-date-store";

/**
 * The window the trend and the distribution SHARE (#737, decided on #700).
 *
 * Neither three controls nor one: the mood map keeps no control and stays
 * all-time, because a calendar grid at `7d` is just the week strip and the
 * heatmap has been unbounded since it was built. Trend and distribution are
 * adjacent sections answering two halves of one question, so two adjacent
 * charts silently covering different periods would be worse than the mild loss
 * of power in sharing. Sharing also means ONE `scorePoints` query feeds both,
 * and the distribution needs no query of its own.
 */
type TrendRange = "7d" | "30d" | "90d" | "all" | "custom";

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

  const [forceOnboarding, setForceOnboarding] = useState(false);
  const [chartContainerWidth, setChartContainerWidth] = useState(300);
  const [trendRange, setTrendRange] = useState<TrendRange>("30d");
  const [customRange, setCustomRange] = useState<DateRange | null>(null);
  const [rangePickerOpen, setRangePickerOpen] = useState(false);
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

  // Each aggregation iterates up to 200 logs; memoize so unrelated re-renders (chart-width
  // onLayout or onboarding toggle) don't recompute the week/day summaries.
  const daySummary = useMemo(
    () => getDayMoodSummary(moodLogs, selectedDate),
    [moodLogs, selectedDate],
  );
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
          { value: String(checkInCount), label: t("stats.checkins", { count: checkInCount }) },
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
  const { data: firstLogDayKey } = useFirstMoodDayKey(userId);
  // The shared window rides its own narrow query (timestamp/offset/score only), so
  // the 200-row history cache never caps the range. Preset windows omit the upper
  // bound — the key stays stable across renders and new logs still land in-window.
  //
  // `all` bounds at the first entry rather than the epoch, so the span label
  // states a real period; #693 already established this query pages to
  // exhaustion, so All time adds no new query SHAPE, only a wider `fromIso`.
  // Until that key loads it falls back to the default window rather than
  // fetching from 1970.
  const isCustom = trendRange === "custom" && customRange !== null;
  const isAllTime = trendRange === "all" && Boolean(firstLogDayKey);
  const presetDays = PRESET_DAYS[trendRange === "7d" || trendRange === "90d" ? trendRange : "30d"];
  const windowFromIso = isCustom
    ? new Date(`${customRange.start}T00:00:00`).toISOString()
    : isAllTime
      ? // UTC midnight, NOT the viewer's local midnight. A day key is a civil day
        // in the frame it was CAPTURED in, so the earliest instant belonging to it
        // can sit up to 14h before its UTC midnight - but up to 25h before the
        // viewer's local midnight, if that entry was logged at +14:00 and is being
        // read at -11:00. `listMoodScorePoints` pads by only 24h, so the local
        // reading would leave the user's very first entry outside the `.gte` bound
        // and All time would silently omit it. Matches `listMoodLogsInDayRange`.
        `${firstLogDayKey!}T00:00:00.000Z`
      : startOfDayDaysAgo(presetDays).toISOString();
  const windowToIso = isCustom
    ? new Date(`${customRange.end}T23:59:59.999`).toISOString()
    : undefined;
  const { data: scorePoints } = useMoodScorePoints(userId, windowFromIso, windowToIso);
  // Paging stops at the week holding the first entry: weeks before the account
  // existed are empty chrome. Until that query answers, only the current week is
  // reachable - better than offering a back arrow that lands on a blank week.
  const earliestWeekStart = useMemo(
    () => earliestWeekStartKey(firstLogDayKey ?? null, anchorWeekStart),
    [firstLogDayKey, anchorWeekStart],
  );

  /**
   * The ONE civil-day window both charts read.
   *
   * It has to be computed once and shared, because `listMoodScorePoints`
   * deliberately over-fetches: its bounds filter `logged_at`, a UTC instant,
   * while points are bucketed by the civil day captured with them, so the query
   * pads a whole day at each end. Every consumer is expected to narrow back by
   * day key - the trend does it by walking an explicit range. Handing the RAW
   * response to the distribution counted those padded rows, so a check-in on the
   * day just outside the range appeared in one chart and not the other, breaking
   * the single guarantee this ticket exists to make.
   *
   * The end is `dayRangeEndKey`, not today: fly east-to-west and you land
   * holding an entry keyed "tomorrow", and All time that stops at the viewer's
   * current day would drop it from the trend while still counting it in the
   * distribution (#250).
   */
  const rangeKeys = useMemo(() => {
    const endKey = dayRangeEndKey((scorePoints ?? []).map((point) => point.dayKey));
    if (isCustom) return { startKey: customRange.start, endKey: customRange.end };
    if (isAllTime) return { startKey: firstLogDayKey!, endKey };
    return { startKey: addDaysToKey(endKey, -(presetDays - 1)), endKey };
  }, [scorePoints, isCustom, customRange, isAllTime, firstLogDayKey, presetDays]);

  // Only the first and last day are labelled — interior labels would collide
  // at the trend windows' densities (matches the previous bespoke chart).
  //
  // One builder for every range: `buildMoodChartData(points, days)` is itself
  // just `buildMoodChartDataForRange` over `dayRangeEndKey`-anchored keys, so
  // driving it from the shared window changes no preset behaviour and removes
  // the chance of the two charts computing their bounds differently.
  const chartData = useMemo(() => {
    const days = buildMoodChartDataForRange(
      scorePoints,
      rangeKeys.startKey,
      rangeKeys.endKey,
      i18n.language,
    );
    return days.map((d, i) => ({
      offset: d.offset,
      value: d.score,
      label: i === 0 || i === days.length - 1 ? d.day : undefined,
    }));
  }, [scorePoints, rangeKeys, i18n.language]);

  // The distribution reduces over the SAME points the trend plots (#701),
  // narrowed to the SAME day keys - one range, one query, no second fetch and no
  // contact with the capped history.
  const distribution = useMemo(
    () =>
      getMoodDistribution(
        (scorePoints ?? []).filter(
          (point) => point.dayKey >= rangeKeys.startKey && point.dayKey <= rangeKeys.endKey,
        ),
      ),
    [scorePoints, rangeKeys],
  );

  /**
   * The resolved span under the control, e.g. "3 Mar – 1 Apr" (#700).
   *
   * Shown for Custom and for All time - the two ranges whose extent a segment
   * label does not state. `7d`/`30d`/`90d` already say their own span.
   */
  const spanLabel = useMemo(() => {
    const bounds = isCustom
      ? ([customRange.start, customRange.end] as const)
      : isAllTime
        ? ([rangeKeys.startKey, rangeKeys.endKey] as const)
        : null;
    if (!bounds) return null;
    const fmt = new Intl.DateTimeFormat(i18n.language, { day: "numeric", month: "short" });
    return `${fmt.format(parseLocalNoon(bounds[0]))} – ${fmt.format(parseLocalNoon(bounds[1]))}`;
    // `rangeKeys`, not `firstLogDayKey`: the All-time span ends at
    // `dayRangeEndKey(points)`, so a newly arrived entry can move the label
    // without any of the range inputs changing.
  }, [isCustom, customRange, isAllTime, rangeKeys, i18n.language]);
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
              // The section's heading IS the week label, and it moves as you page
              // (#697). Two labels - a static "This week" eyebrow above a
              // navigator saying the same thing - is the shape this avoids.
              <Section
                title={formatWeekLabel(weekWindow, t, i18n.language)}
                action={
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
              ONE range control, on a row of its own, above the two sections it
              governs (#737, decided on #700). Not beside a heading: the design
              puts heading + span + five segments on one line, which measures
              ~408dp in `en` and ~560dp in `bg` against 328dp usable, and
              `SegmentedControl` is a no-wrap, no-scroll flex row that would just
              clip. The map deliberately gets NO control and stays all-time.

              It appears with the first section it governs - the distribution, at
              one check-in - so it is never a control over nothing.
            */}
            {hasAnyCheckIn ? (
              <Section className="gap-2">
                {/* The pill sizes to its segments rather than stretching: on its
                    own row it would otherwise span the full column with the
                    segments packed left and trailing muted space. */}
                <View className="flex-row">
                  <SegmentedControl
                    value={trendRange}
                    onChange={(next) => {
                      // Custom is a two-step choice: the picker applies it. Tapping
                      // the active Custom segment again reopens the picker.
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
                      // A short key of its own: `heatmap.title` is the 15-character
                      // `За цялото време`, right as a section title and unusable as
                      // a segment.
                      { value: "all", label: t("trendControls.rangeAll") },
                      { value: "custom", label: t("trendControls.rangeCustom") },
                    ]}
                  />
                </View>
                {spanLabel ? (
                  <Text variant="muted" className="text-[13px]">
                    {spanLabel}
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
              </Section>
            ) : null}

            {showTrend ? (
              <Section title={t("trendControls.title")}>
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
              Between the trend and the map, on the range they share (#701). At
              one entry it reads "one check-in, and it was Okay" - four visible
              zeros are part of the picture, which is exactly the claim the
              design's stacked pill could not avoid making ("100% Okay").
            */}
            {hasAnyCheckIn ? (
              <Section title={t("distribution.title")}>
                <MoodDistributionChart counts={distribution} />
              </Section>
            ) : null}

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
