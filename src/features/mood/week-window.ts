import { roundTo1 as round1 } from "@/src/utils/number";
import { addDaysToKey, dayRangeEndKey, mondayKeyOf } from "@/src/utils/date";

/**
 * Calendar weeks for the navigable week block (#736, decided on #697).
 *
 * The overview used to hold **two** definitions of "a week" at once: the strip
 * was `getDailyAverages(logs, 7)` — a trailing window with today always
 * rightmost — while the mood map underneath it was `mondayKeyOf`, Monday-start
 * calendar weeks. That was survivable only because the strip could not move.
 * You cannot page back through trailing windows, and "This week" over a Tue–Mon
 * span is false, so the navigator forces the two to agree: **Monday-start
 * calendar weeks**, matching the map, the heatmap columns and the all-history
 * screen's `thisWeek`/`lastWeek` groups.
 *
 * Monday is not locale-aware, deliberately. `en-US` would conventionally start
 * Sunday, but the map is already hardcoded Monday and two different week
 * boundaries on one screen is a worse defect than one convention reading
 * unidiomatically in some locales.
 */

interface DaySample {
  dayKey: string;
  moodScore: number;
}

interface EmotionSample {
  dayKey: string;
  emotions: string[];
}

export interface WeekDelta {
  current: number | null;
  previous: number | null;
  delta: number | null;
}

export interface EmotionCount {
  id: string;
  count: number;
}

export interface WeekWindow {
  /** Monday of the displayed week. */
  startKey: string;
  /** Sunday of the displayed week. */
  endKey: string;
  /** Monday of the week before it — the delta's comparison window. */
  previousStartKey: string;
  /** Sunday of the week before it. */
  previousEndKey: string;
  /** Zero for the current week, negative going back. Forward is never allowed. */
  offset: number;
}

export interface WeekDay {
  dateKey: string;
  /** Rounded-to-1dp mean of that day's scores, or null when nothing was logged. */
  average: number | null;
  /** Entries on the day. Zero means the cell is not interactive at all. */
  count: number;
  isToday: boolean;
  /**
   * A day that has not happened yet. Calendar weeks introduce these — trailing-7
   * never had them — and they render as **nothing**: no dot, no placeholder. A
   * hollow "no entry" dot on Saturday would show a user four missed days they
   * have not had yet, which is the exact shape the no-shame rule forbids.
   */
  isFuture: boolean;
}

/**
 * The viewer's current civil day.
 *
 * Routed through `dayRangeEndKey` — the helper the heatmap already anchors on —
 * rather than `localDateKey`, which the mood feature may not import: bucketing
 * an *entry* by the viewer's day moves it between days after travel (#250).
 * Which calendar week counts as "this week" is a genuine viewer-frame question,
 * though, so it is asked once here and never near an entry's `dayKey`.
 */
function viewerDayKey(now: Date): string {
  return dayRangeEndKey([], now);
}

/** Monday of the week containing `now`. */
export function currentWeekStartKey(now: Date = new Date()): string {
  return mondayKeyOf(viewerDayKey(now));
}

/**
 * The window `offset` weeks back from the current one. `offset` is clamped at 0:
 * there is nothing to see in a week that has not started.
 */
export function weekWindowForOffset(offset: number, now: Date = new Date()): WeekWindow {
  const safeOffset = Math.min(0, offset);
  const startKey = addDaysToKey(currentWeekStartKey(now), safeOffset * 7);
  return {
    startKey,
    endKey: addDaysToKey(startKey, 6),
    previousStartKey: addDaysToKey(startKey, -7),
    previousEndKey: addDaysToKey(startKey, -1),
    offset: safeOffset,
  };
}

/**
 * How many weeks back the user may page: the week holding their first entry.
 * Returns 0 (no paging) when they have none. Never positive.
 */
export function earliestWeekOffset(firstLogDayKey: string | null, now: Date = new Date()): number {
  if (!firstLogDayKey) return 0;
  const firstWeek = mondayKeyOf(firstLogDayKey);
  const currentWeek = currentWeekStartKey(now);
  if (firstWeek >= currentWeek) return 0;
  // Whole weeks between two Mondays; both are noon-anchored day keys, so plain
  // day arithmetic cannot be shifted by DST.
  let offset = 0;
  let cursor = currentWeek;
  while (cursor > firstWeek) {
    cursor = addDaysToKey(cursor, -7);
    offset -= 1;
  }
  return offset;
}

function inRange(dayKey: string, startKey: string, endKey: string): boolean {
  return dayKey >= startKey && dayKey <= endKey;
}

/**
 * The seven cells of the displayed week, Monday first.
 *
 * `todayKey` is resolved with `dayRangeEndKey`, not from the clock alone: flying
 * east-to-west leaves you holding an entry keyed "tomorrow", and treating that
 * day as *future* would hide a real entry the user just logged (#250).
 */
export function buildWeekDays(
  logs: DaySample[] | undefined,
  window: WeekWindow,
  now: Date = new Date(),
): WeekDay[] {
  const list = logs ?? [];
  const todayKey = dayRangeEndKey(
    list.map((log) => log.dayKey),
    now,
  );

  const buckets = new Map<string, { sum: number; count: number }>();
  for (const log of list) {
    if (!inRange(log.dayKey, window.startKey, window.endKey)) continue;
    const bucket = buckets.get(log.dayKey);
    if (bucket) {
      bucket.sum += log.moodScore;
      bucket.count += 1;
    } else {
      buckets.set(log.dayKey, { sum: log.moodScore, count: 1 });
    }
  }

  const days: WeekDay[] = [];
  for (let i = 0; i < 7; i++) {
    const dateKey = addDaysToKey(window.startKey, i);
    const bucket = buckets.get(dateKey);
    days.push({
      dateKey,
      average: bucket ? round1(bucket.sum / bucket.count) : null,
      count: bucket?.count ?? 0,
      isToday: dateKey === todayKey,
      isFuture: dateKey > todayKey,
    });
  }
  return days;
}

function averageInRange(logs: DaySample[], startKey: string, endKey: string): number | null {
  let sum = 0;
  let count = 0;
  for (const log of logs) {
    if (!inRange(log.dayKey, startKey, endKey)) continue;
    sum += log.moodScore;
    count += 1;
  }
  return count === 0 ? null : round1(sum / count);
}

/**
 * The displayed week's average against the week before it.
 *
 * Both halves come from the same fetch, which is why the query spans fourteen
 * days rather than seven: the delta has to stay correct at *every* offset, not
 * only the current week.
 */
export function getWeekDeltaForWindow(
  logs: DaySample[] | undefined,
  window: WeekWindow,
): WeekDelta {
  const list = logs ?? [];
  const current = averageInRange(list, window.startKey, window.endKey);
  const previous = averageInRange(list, window.previousStartKey, window.previousEndKey);
  return {
    current,
    previous,
    delta: current !== null && previous !== null ? round1(current - previous) : null,
  };
}

/**
 * Emotion ids by frequency over the **displayed week only**, ties broken by id.
 *
 * The shipped `getTopEmotions` took a trailing-7 window anchored on the newest
 * day key (#729, fixing #705). A navigable block cannot use that: the window has
 * to follow the week the user is actually looking at, or paging back to March
 * would still render this week's chips under a March heading — #705 again,
 * wearing a different hat.
 */
export function getTopEmotionsForWindow(
  logs: EmotionSample[] | undefined,
  window: WeekWindow,
  limit = 3,
): EmotionCount[] {
  const counts = new Map<string, number>();
  for (const log of logs ?? []) {
    if (!inRange(log.dayKey, window.startKey, window.endKey)) continue;
    for (const id of log.emotions ?? []) {
      counts.set(id, (counts.get(id) ?? 0) + 1);
    }
  }
  return [...counts.entries()]
    .map(([id, count]) => ({ id, count }))
    .sort((a, b) => b.count - a.count || a.id.localeCompare(b.id))
    .slice(0, limit);
}

/** Entries logged on one civil day, newest first — the day panel's rows. */
export function logsOnDay<T extends { dayKey: string; loggedAt: string }>(
  logs: T[] | undefined,
  dateKey: string,
): T[] {
  return (logs ?? [])
    .filter((log) => log.dayKey === dateKey)
    .sort((a, b) => b.loggedAt.localeCompare(a.loggedAt));
}

/**
 * Check-ins in the current calendar week — the header's "this week" stat.
 *
 * It counted a trailing 7 days while the block below it counted a calendar week,
 * so the same two words meant two different spans on one screen. That is the
 * contradiction this ticket exists to remove, so the stat moves with the block.
 */
export function countLogsInCurrentWeek(
  logs: DaySample[] | undefined,
  now: Date = new Date(),
): number {
  const startKey = currentWeekStartKey(now);
  const endKey = addDaysToKey(startKey, 6);
  let count = 0;
  for (const log of logs ?? []) if (inRange(log.dayKey, startKey, endKey)) count += 1;
  return count;
}
