import { dayKeyDiff, dayRangeEndKey, isValidDayKey, parseLocalNoon } from "@/src/utils/date";

/** A day the person has a record on, at its offset from the first one. */
interface RecordMark {
  key: string;
  index: number;
}

/** A month label on the axis, at the day index its month opens on. */
interface RecordTick {
  key: string;
  index: number;
  label: string;
}

export type RecordBand =
  /** The days have not arrived yet - see `buildRecordBand`. */
  | { kind: "pending" }
  /** No record anywhere, ever. */
  | { kind: "empty" }
  /** A record exists, but the axis it would sit on has no width yet. */
  | { kind: "singleDay" }
  | {
      kind: "band";
      /** Inclusive day count from the first record to the end of the axis. */
      totalDays: number;
      marks: RecordMark[];
      ticks: RecordTick[];
      /** The two ends of the axis, spelled out for the accessible summary. */
      extent: { from: string; to: string };
    };

/**
 * Days of axis a month label needs to itself before the next one may be placed.
 *
 * The pairing with `DAY_PITCH` is the whole rule: at 5px a day this is 100px of
 * clear space, which holds the widest label either locale produces at the 9px
 * the ticks render in - "септември 2026 г." is about 85px of it. Nothing
 * measures text here and there is no lattice under the labels to hang a
 * squeezed one on, so the budget is fixed rather than fitted.
 *
 * Two consecutive month starts are never closer than 28 days, so this only ever
 * drops the leading partial month's neighbour - never a label mid-axis.
 */
export const MIN_TICK_GAP_DAYS = 20;

/** Horizontal px per day of axis. See `MIN_TICK_GAP_DAYS`. */
export const DAY_PITCH = 5;

/**
 * The mark band on "Looking back": one inert mark for every day the person has
 * a record on, over an all-time axis anchored at the first record (#1906).
 *
 * ☠️ **It computes nothing.** A day with six records and a day with one produce
 * the same single mark - the RPC has already made the set distinct, and that is
 * the point of the shape rather than a limitation to fix later. There is no
 * count, no run length, no ratio, and nothing here can be added up: #1834 found
 * that a figure under a window label supplies its own denominator, and #1840
 * cut the spanning scalar outright.
 *
 * ☠️ **An empty day is not drawn.** The marks carry their own index into the
 * axis so a day with no record occupies width and nothing else. A drawn empty
 * cell promotes absence to a first-class mark, which is what makes a lattice
 * read as a chain (#1834) - the calendar is not the problem, the grid is.
 *
 * The three states gate on SPAN, not count. The axis is anchored at the first
 * record, so a record made an hour ago gives it zero width and there is nothing
 * to draw: that is the `singleDay` state, which needs a string of its own
 * because "nothing here yet" would be a lie about the person's own record.
 */
export function buildRecordBand(
  dayKeys: string[] | undefined,
  lang: string,
  now: Date = new Date(),
): RecordBand {
  // Undefined is "the query has not answered", which is not the same claim as
  // "there is no record" - and only one of the two is safe to state.
  if (dayKeys === undefined) return { kind: "pending" };

  // ☠️ A malformed key must not reach `Intl.format`, which throws `RangeError`
  // on an Invalid Date and would take the whole screen down rather than lose one
  // mark. `dayRangeEndKey` guards its own input for the same reason: every day
  // below is derived from these, so one bad row would otherwise blank the
  // surface. Dropped rather than repaired - a key that names no day marks none.
  const days = dayKeys.filter(isValidDayKey);
  if (days.length === 0) return { kind: "empty" };

  // The RPC returns them ascending, so the first is the anchor. Guarded anyway:
  // the anchor is the origin of every index below, and a mis-ordered row would
  // put marks at negative offsets rather than fail visibly.
  let firstKey = days[0];
  for (const key of days) if (key < firstKey) firstKey = key;

  // Today, or a later day the person already holds an entry on: fly
  // east-to-west and you land holding a "tomorrow" entry, which a hard clamp at
  // today would drop off the right-hand end of the axis (#250).
  const lastKey = dayRangeEndKey(days, now);

  const span = dayKeyDiff(firstKey, lastKey);
  if (span < 2) return { kind: "singleDay" };

  const marks = days
    .map((key) => ({ key, index: dayKeyDiff(firstKey, key) }))
    .sort((a, b) => a.index - b.index);

  return {
    kind: "band",
    totalDays: span + 1,
    marks,
    ticks: buildTicks(firstKey, lastKey, lang),
    extent: {
      from: formatExtentDay(firstKey, lang),
      to: formatExtentDay(lastKey, lang),
    },
  };
}

/**
 * Sparse month labels: the left edge always, then each month start with room
 * for its own label.
 *
 * The leftmost names the month AND the year, because it is the only thing that
 * dates the axis - and the year comes back whenever the axis crosses into a new
 * one, so a reader scrolled into the middle of a long record is never left
 * guessing which December they are looking at.
 */
function buildTicks(firstKey: string, lastKey: string, lang: string): RecordTick[] {
  const label = monthLabeller(lang);

  const yearOf = (key: string) => key.slice(0, 4);
  const ticks: RecordTick[] = [{ key: firstKey, index: 0, label: label(firstKey, true) }];
  let placedYear = yearOf(firstKey);

  let year = Number(firstKey.slice(0, 4));
  let month = Number(firstKey.slice(5, 7));
  for (;;) {
    month += 1;
    if (month > 12) {
      month = 1;
      year += 1;
    }
    const key = `${year}-${String(month).padStart(2, "0")}-01`;
    if (key > lastKey) break;

    const index = dayKeyDiff(firstKey, key);
    // Skipped rather than squeezed: a label that will not fit is simply not
    // drawn, which costs nothing because it labels a position, not a region.
    if (index - ticks[ticks.length - 1].index < MIN_TICK_GAP_DAYS) continue;

    ticks.push({ key, index, label: label(key, yearOf(key) !== placedYear) });
    placedYear = yearOf(key);
  }

  return ticks;
}

/**
 * ☠️ **`month: "short"` is a NUMBER in Bulgarian** - CLDR abbreviates март to
 * "03", and `{ month: "short", year: "numeric" }` collapses the pair to
 * "03.2026 г.". That would put digits on the one screen that computes nothing,
 * and read as a figure rather than a date.
 *
 * So the abbreviation is used only where the locale actually has one: a short
 * month carrying a digit falls back to the full name. Locale-agnostic on
 * purpose - a branch on `lang === "bg"` would be wrong again the next time a
 * language is added. Month and year are formatted apart and joined, because
 * asking for both at once is what triggers the numeric pattern.
 */
function monthLabeller(lang: string): (dayKey: string, withYear: boolean) => string {
  const shortFmt = new Intl.DateTimeFormat(lang, { month: "short" });
  const longFmt = new Intl.DateTimeFormat(lang, { month: "long" });
  const yearFmt = new Intl.DateTimeFormat(lang, { year: "numeric" });

  return (dayKey, withYear) => {
    const date = parseLocalNoon(dayKey);
    const short = shortFmt.format(date);
    const month = /[0-9]/.test(short) ? longFmt.format(date) : short;
    return withYear ? `${month} ${yearFmt.format(date)}` : month;
  };
}

/**
 * A day key spelled out for the accessible summary - "March 12, 2026".
 *
 * Long-form and its own function rather than `formatDayKey`, which is fenced to
 * the two date-picker surfaces that need the short "Tue, Sep 1, 2026" shape.
 * This is read out loud, where abbreviations become a string of fragments.
 */
function formatExtentDay(dayKey: string, lang: string): string {
  return new Intl.DateTimeFormat(lang, {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(parseLocalNoon(dayKey));
}
