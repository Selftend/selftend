import { ActivityIndicator, View } from "react-native";
import { useTranslation } from "react-i18next";

import { ReservedSpace } from "@/src/components/app/reserved-space";
import { BarChart } from "@/src/components/charts/bar-chart";
import { Text } from "@/src/components/react-native-reusables/text";
import {
  formatJournalWritingBucket,
  journalWritingBarLabel,
  journalWritingReservationBuckets,
  journalWritingUnit,
} from "@/src/features/journal/journal-overview";
import type { JournalWritingBucket, JournalWritingRange } from "@/src/features/journal/types";

/**
 * The gap between the bars and the caption under them.
 *
 * It is the enclosing `Section`'s own `gap-4`, restated here because the two used to be
 * siblings inside the section and are now one block: matching it is what keeps the
 * caption where it has always sat. One constant, one block, both states - which is also
 * why the reservation cannot reserve a gap the real chart does not draw.
 */
const CHART_GAP = "gap-4";

/** Below this the chart's columns are wide enough for the roomier gap between them. */
const DENSE_BUCKETS = 14;

/**
 * The journal writing chart: a bar per bucket the range's read returned, and the caption
 * naming what one bar covers.
 *
 * Lifted out of the screen so {@link JournalWritingChartReservation} can render the very
 * same component, invisibly, to hold this block's space while the read is in flight. The
 * stick being the content rather than a silhouette beside it is the whole of ADR-0009's
 * edge 4: nothing to measure, and nothing that can drift out of step.
 */
export function JournalWritingChart({ buckets }: { buckets: readonly JournalWritingBucket[] }) {
  const { t, i18n } = useTranslation("journal");

  return (
    <View className={CHART_GAP}>
      <BarChart
        bars={buckets.map((bucket, index, all) => ({
          key: bucket.startDayKey,
          value: bucket.wordCount,
          label: journalWritingBarLabel(bucket, index, all.length, i18n.language),
          accessibilityLabel: t("writing.barLabel", {
            period: formatJournalWritingBucket(bucket, i18n.language),
            count: bucket.wordCount,
          }),
        }))}
        barAreaHeight={72}
        minBarHeight={8}
        zeroHeight={2}
        tintClass="bg-primary"
        barClassName="rounded-sm"
        columnClassName="gap-1.5"
        labelClassName="tabular-nums"
        className={buckets.length > DENSE_BUCKETS ? "gap-0.5" : "gap-1"}
      />
      <Text variant="muted" className="text-xs">
        {t(`writing.caption.${journalWritingUnit(buckets)}`)}
      </Text>
    </View>
  );
}

/**
 * The writing chart's SPACE, held while the buckets behind it are still being read -
 * ADR-0009 clause 2, in the shape clause 1 permits.
 *
 * What stood here was an `ActivityIndicator` in a `py-8` box, shorter than the block it
 * stood in for, so the entries list below it - every card a tap target - rose while the
 * chart was in flight and dropped back as it landed. Cosmetic in the sense that no tap
 * had landed on the wrong entry, but the same mechanism as the check-in editor's, and the
 * second of the three sites queued behind the rule.
 *
 * **The stick is the chart itself**, at `opacity-0`, rendered from buckets derived from
 * the selected range by {@link journalWritingReservationBuckets}. The range is local
 * state, known before any read: that is what lets the reservation be exact rather than
 * approximate here. The heights it has to match are the bar area, the labels under it -
 * drawn at seven buckets, not at thirty - and the caption line, and each of the three
 * comes out of the real component from the real range.
 *
 * ☠️ **No fill, only the spinner it replaces.** Grey bars would say writing is coming and
 * how much of it, and whether this range holds any writing at all is precisely what the
 * read is about to answer - the range can perfectly well settle on "No writing in this
 * range." Clause 1 forbids a loading surface that claim, so the space is held blank
 * around a contentless signal (ADR-0009, edge 2). The same call the check-in editor's
 * emotion grid and the week block both made.
 *
 * 📌 Nothing inside is reachable: a chart column is a labelled `View`, never a control, so
 * the invisible-but-focusable trap `ReservedSpace` documents cannot arise here. The stick
 * holds words - bar labels, a caption, a per-column announcement - and `ReservedSpace`
 * hides all of it from the accessibility tree, which is also why the caption may name a
 * unit the read has not confirmed: no reader is told it. (All time is months here; the
 * RPC switches to years past two years of history. Both captions are one line.)
 *
 * ⚠️ **A reduction, not an elimination** - edge 1's trade, stated where it lands. The
 * read can settle on the empty-range line or, offline, on the error line above, and both
 * are shorter than what is reserved. The reservation belongs to the pending state, so it
 * collapses when the truth arrives and there is less of it than a chart.
 */
export function JournalWritingChartReservation({ range }: { range: JournalWritingRange }) {
  return (
    <ReservedSpace
      testID="journal-writing-reservation"
      overlay={<ActivityIndicator testID="journal-writing-loading" />}
    >
      <JournalWritingChart buckets={journalWritingReservationBuckets(range)} />
    </ReservedSpace>
  );
}
