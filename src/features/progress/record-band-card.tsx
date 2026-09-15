import { useMemo, useRef } from "react";
import { ScrollView, View } from "react-native";
import { useTranslation } from "react-i18next";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/src/components/react-native-reusables/card";
import { Text } from "@/src/components/react-native-reusables/text";
import {
  DAY_PITCH,
  MIN_TICK_GAP_DAYS,
  buildRecordBand,
  type RecordBand,
} from "@/src/features/progress/record-band";
import { useRecordDays } from "@/src/features/progress/queries";
import { useSession } from "@/src/providers/session-provider";

/** Mark geometry. The pitch itself lives with the tick rule it constrains. */
const MARK_WIDTH = 3;
const MARK_HEIGHT = 22;
/** Gap between the marks and the month labels under them. */
const TICK_GAP = 6;
const TICK_HEIGHT = 12;

/**
 * "Your days" - one inert mark for each day the person has a record on, over an
 * all-time axis anchored at the first one (#1906).
 *
 * ☠️ **The marks are inert: no press handler, no door.** #1840's stated reason
 * this screen is safe is that it holds no content - "you cannot re-read a
 * thought record from a dot". A pressable dot is exactly what would put that
 * back, and a day names no tool, so the tool-screen rule has no target here
 * either. The screen's one door is the recovery plan.
 *
 * ☠️ **No count line, no caption, no range control.** #1840 cut the spanning
 * scalar; a caption restores it by the back door in the numerator-over-drawn-
 * denominator form #1834 warned about, and a changeable window re-supplies the
 * denominator by inviting comparison between windows.
 *
 * ☠️ **The empty state points nowhere.** Home's zero-state ships three buttons
 * because an empty dashboard is a configuration the person has not done; an
 * empty record is not a defect and has nothing to repair. A door here would say
 * *go and use a tool so this fills in*, which makes the chart the reason to
 * practise - the inversion `docs/product-principles.md` §12 and ADR-0004 refuse.
 *
 * Guest and registered are the same screen: the user id comes off the session,
 * a guest has a real one, and the rows are user-scoped. No sign-in offer on any
 * state - conversion is invited from the user menu, never from a surface the
 * person is reading (#1807).
 */
export function RecordBandCard() {
  const { t, i18n } = useTranslation("navigation");
  const { user } = useSession();
  const { data, isError } = useRecordDays(user?.id ?? null);

  const band = useMemo(() => buildRecordBand(data, i18n.language), [data, i18n.language]);

  return (
    <Card testID="your-days-card">
      <CardHeader>
        <CardTitle>{t("progress.timelineTitle")}</CardTitle>
        <CardDescription>{t("progress.timelineDescription")}</CardDescription>
      </CardHeader>
      <CardContent>{renderBody()}</CardContent>
    </Card>
  );

  function renderBody() {
    /*
     * ☠️ A failed read is NOT an empty record, and this is the one card that
     * may not confuse the two. `MoodHeatmap` shows its empty string when the
     * query fails, which on this screen would be exactly the false absence the
     * whole feature exists to avoid - so the error says what happened instead.
     *
     * Checked before the band: query errors reach Sentry through the shared
     * `QueryCache.onError` but raise no toast (only mutations do), so without
     * this the card would sit titled and blank for good, indistinguishable
     * from still loading.
     *
     * ☠️☠️ **`data === undefined`, never bare `isError`.** That argument holds
     * only where there is nothing to draw. `isError` is the query's status and
     * query-core sets it on ANY failed fetch, held data or not - which is why
     * TanStack derives `isRefetchError` from `isError && hasData` at all - and
     * `recordDaysKeys.all` is invalidated by every tool's save, so a failed
     * post-save re-read, or an ordinary refetch past the 60s `staleTime`, took
     * the drawn band away and reported days that were in the cache and on the
     * server as unloadable. Held days stay drawn; the error answers for the
     * blank. The same predicate #2253 removed from `LoadMoreFooter`.
     */
    if (isError && data === undefined) {
      return <Text variant="muted">{t("progress.timelineError")}</Text>;
    }

    switch (band.kind) {
      // Nothing at all until the days arrive. The empty line is a claim about
      // the person's record, and it must not be made before the answer is in.
      case "pending":
        return null;
      // Both empty bodies are a single muted line in this CardContent, the shape
      // `RecoveryTimelineCard` already uses - the house `EmptyState` renders its
      // own `Card` and would double-card inside this one. Neither carries a
      // title: the card above already has one.
      case "empty":
        return <Text variant="muted">{t("progress.timelineEmpty")}</Text>;
      // Its own string, because "nothing here yet" would be a lie about the
      // person's own record, and a count would be the count line refused above.
      case "singleDay":
        return <Text variant="muted">{t("progress.timelineSingleDay")}</Text>;
      case "band":
        return (
          <RecordBandStrip
            band={band}
            label={t("progress.timelineA11y", {
              from: band.extent.from,
              to: band.extent.to,
            })}
          />
        );
    }
  }
}

/**
 * The band itself: marks placed by day index inside a horizontal scroller that
 * opens with the LAST MARK at the right edge.
 *
 * ☠️☠️ **Not `scrollToEnd` (#2344).** The axis runs to today whether or not
 * anything was recorded on it, so someone who recorded once and came back a
 * month later has an axis wider than the card whose only mark is far to the
 * left. Opening at the end put that mark off-screen under a month label, with
 * `showsHorizontalScrollIndicator={false}` leaving no affordance to say so - a
 * card titled "Your days" rendering a blank strip, which is the exact false
 * absence this feature exists to prevent, reached by ordinary use. For anyone
 * recording regularly the last mark IS today, so it is a no-op in spirit.
 *
 * ☠️ **A day with no record is not drawn at all** - the marks are positioned
 * absolutely into an axis that is otherwise blank, so an empty day occupies
 * width and nothing else. That is the shape's whole argument: a drawn empty
 * cell promotes absence to a first-class mark, which is what makes a lattice
 * read as a chain (#1834). No gridlines, no year separators, no today pin.
 *
 * ☠️ **A mark never says which tool it came from.** `src/lib/theme/encoding.ts`
 * keeps hue only where colour carries information read off it, and
 * "distinguishes items in a set" is explicitly not enough. Moot besides: the
 * unit is a day, and a day names no tool.
 */
function RecordBandStrip({
  band,
  label,
}: {
  band: Extract<RecordBand, { kind: "band" }>;
  label: string;
}) {
  const scrollRef = useRef<ScrollView>(null);
  // Refs, not state: both are read by an imperative call and nothing renders
  // from either, so measuring must not cost a second pass.
  const viewportWidthRef = useRef(0);
  const placedForRef = useRef<number | null>(null);

  const axisWidth = (band.totalDays - 1) * DAY_PITCH + MARK_WIDTH;
  // Room for the final month label to finish, and no more: it is left-aligned on
  // its own month, so it can run past the end of a short trailing stretch. Any
  // fixed tail would leave dead space after today on every longer axis.
  const lastTick = band.ticks[band.ticks.length - 1];
  const tail = Math.max(
    0,
    MIN_TICK_GAP_DAYS * DAY_PITCH - (axisWidth - lastTick.index * DAY_PITCH),
  );

  // The marks are sorted by index, and a band always has at least one.
  const lastMarkRight = band.marks[band.marks.length - 1].index * DAY_PITCH + MARK_WIDTH;

  /*
   * The clamp at zero is what puts an early mark at the LEFT edge rather than
   * scrolling the strip backwards past its own start - which is what makes the
   * 8px band, and every axis narrower than the card, open where the eye is.
   */
  function placeLastMark() {
    const viewportWidth = viewportWidthRef.current;
    if (viewportWidth <= 0) return;
    placedForRef.current = lastMarkRight;
    scrollRef.current?.scrollTo({ x: Math.max(0, lastMarkRight - viewportWidth), animated: false });
  }

  return (
    /*
     * One node for a screen reader, labelled by extent only (#1836). `image`
     * rather than `accessible` alone, because react-native-web does not group a
     * subtree on `accessible` - `role="img"` is what makes assistive tech treat
     * this as a single thing on web as well as native.
     *
     * ☠️ An a11y-only count was REFUSED. Handing a screen-reader user the very
     * figure that was cut for being harmful is worse than the gap it leaves.
     * Stated plainly: a screen-reader user gets almost nothing from this
     * screen. That is a known cost of the shape, recorded as such.
     */
    <View accessible accessibilityRole="image" accessibilityLabel={label} testID="record-band">
      <ScrollView
        ref={scrollRef}
        testID="record-band-scroll"
        horizontal
        showsHorizontalScrollIndicator={false}
        /*
         * Both events place the strip, because neither alone is enough and
         * their order is not guaranteed: content size without a measured
         * viewport cannot place anything, and a viewport measured before the
         * content lands scrolls an axis that is not there yet - so the content
         * signal has to be able to correct it afterwards.
         *
         * ☠️ But layout places only the FIRST time for a given last mark. A
         * re-layout - rotation, the keyboard, a breakpoint change - is not an
         * opening, and re-running the placement there would yank a reader who
         * had scrolled back into their own history to the right-hand edge. The
         * opening position is opinionated; where the person has scrolled to
         * since is theirs.
         */
        onLayout={(event) => {
          viewportWidthRef.current = event.nativeEvent.layout.width;
          if (placedForRef.current !== lastMarkRight) placeLastMark();
        }}
        onContentSizeChange={placeLastMark}
      >
        <View style={{ width: axisWidth + tail }}>
          <View style={{ height: MARK_HEIGHT }}>
            {band.marks.map((mark) => (
              <View
                key={mark.key}
                testID="record-mark"
                className="bg-primary"
                style={{
                  position: "absolute",
                  left: mark.index * DAY_PITCH,
                  width: MARK_WIDTH,
                  height: MARK_HEIGHT,
                  borderRadius: MARK_WIDTH / 2,
                }}
              />
            ))}
          </View>
          <View style={{ height: TICK_HEIGHT, marginTop: TICK_GAP }}>
            {band.ticks.map((tick) => (
              <Text
                key={tick.key}
                variant="muted"
                numberOfLines={1}
                style={{
                  position: "absolute",
                  left: tick.index * DAY_PITCH,
                  fontSize: 9,
                  lineHeight: TICK_HEIGHT,
                }}
              >
                {tick.label}
              </Text>
            ))}
          </View>
        </View>
      </ScrollView>
    </View>
  );
}
