import { addDaysToKey, dayKeyDiff, dayRangeEndKey, parseLocalNoon } from "@/src/utils/date";

/**
 * Which of the three bodies the card renders. Only the body changes - the
 * header, the reflection prompt and the recovery-plan door are identical in all
 * three (#1906).
 */
export type RecordBandState = "loading" | "empty" | "single-day" | "marks";

/** A sparse tick above the band: the first day of a month on the axis. */
export interface RecordBandMonth {
  /** Days after the anchor, so the tick can be positioned without a date. */
  offset: number;
  label: string;
}

export interface RecordBand {
  state: RecordBandState;
  /** Day offsets from the anchor that hold a record. One per DAY, never per record. */
  marks: number[];
  months: RecordBandMonth[];
  /** Days on the axis, anchor through end, inclusive. */
  totalDays: number;
  /** The anchor - the person's first recorded day - or null when there is none. */
  firstKey: string | null;
  /** Today, or a later day the person already holds a record on. */
  lastKey: string | null;
  /** The anchor's month in full, for the accessibility summary's extent. */
  firstMonthLabel: string | null;
}

const NOTHING: Omit<RecordBand, "state"> = {
  marks: [],
  months: [],
  totalDays: 0,
  firstKey: null,
  lastKey: null,
  firstMonthLabel: null,
};

/**
 * ☠️ **`undefined` IS NOT `[]`.** `undefined` is the query still in flight;
 * `[]` is a person with no record. Collapsing them makes the card state
 * "Days you record anything will appear here." on first paint for someone whose
 * record is years long - absence asserted before anything is known, on the one
 * screen whose whole job is to state the record truthfully.
 */
const LOADING: RecordBand = { ...NOTHING, state: "loading" };
const EMPTY: RecordBand = { ...NOTHING, state: "empty" };

/**
 * One mark for each day the person recorded anything, anywhere in the app,
 * across all time (#1906, from #1839 §3).
 *
 * ☠️ **A day with six records and a day with one produce the SAME mark.** The
 * unit is the day and the screen computes nothing: it states that the record
 * exists and stops. #1840 cut the spanning scalar, so anything here that
 * counted would be re-supplying the denominator #1834 removed.
 *
 * ☠️ **The gate is SPAN, not COUNT.** The axis is anchored at the first record,
 * so a person whose whole record is today has a zero-width axis - one mark
 * filling a band that claims to be a timeline. Two records today is therefore
 * the single-day body; one record three days ago is the band.
 *
 * ☠️ **Only recorded days become marks; the days between them are drawn as
 * nothing.** There is no lattice and no empty cell - a drawn empty cell
 * promotes absence to a first-class mark, which on this screen is the whole
 * failure being avoided. The offsets exist so the band can position marks along
 * a continuous axis instead of laying out a grid of days.
 *
 * The anchoring is `buildMoodHeatmapWeeks`' (`src/features/mood/heatmap-data.ts`),
 * adopted rather than rewritten - including its end key, which is today OR a
 * later day the user already holds a record on (#250).
 */
export function buildRecordBand(
  dayKeys: string[] | undefined,
  lang = "en",
  now = new Date(),
): RecordBand {
  if (dayKeys === undefined) return LOADING;
  if (dayKeys.length === 0) return EMPTY;

  // `union` in the RPC already made these distinct, and they arrive ascending -
  // but neither is relied on here. A builder that only works on sorted, deduped
  // input is one refactor of its caller away from drawing a day twice.
  const marked = new Set(dayKeys.filter((key) => typeof key === "string" && key !== ""));
  if (marked.size === 0) return EMPTY;

  let firstKey: string | null = null;
  for (const key of marked) if (firstKey === null || key < firstKey) firstKey = key;

  const lastKey = dayRangeEndKey(marked, now);
  const totalDays = dayKeyDiff(firstKey!, lastKey) + 1;

  const monthFmt = new Intl.DateTimeFormat(lang, { month: "short" });
  const anchorFmt = new Intl.DateTimeFormat(lang, { month: "short", year: "numeric" });
  const extentFmt = new Intl.DateTimeFormat(lang, { month: "long", year: "numeric" });

  // Span, not count: `2026-09-02` from `2026-09-04` is 2 days back and draws.
  const state: RecordBandState = totalDays >= 3 ? "marks" : "single-day";

  const marks = [...marked].map((key) => dayKeyDiff(firstKey!, key)).sort((a, b) => a - b);

  // The leftmost tick names month and year; every later one names the month
  // alone, and only where a month actually begins on the axis.
  const months: RecordBandMonth[] = [
    { offset: 0, label: anchorFmt.format(parseLocalNoon(firstKey!)) },
  ];
  for (let offset = 1; offset < totalDays; offset += 1) {
    const key = addDaysToKey(firstKey!, offset);
    if (key.endsWith("-01")) months.push({ offset, label: monthFmt.format(parseLocalNoon(key)) });
  }

  return {
    state,
    marks,
    months,
    totalDays,
    firstKey,
    lastKey,
    firstMonthLabel: extentFmt.format(parseLocalNoon(firstKey!)),
  };
}
