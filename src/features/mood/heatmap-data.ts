import { addDaysToKey, dayRangeEndKey, mondayKeyOf, parseLocalNoon } from "@/src/utils/date";

/** Points arrive pre-bucketed: `dayKey` is the civil day captured at logging time. */
interface MoodSample {
  dayKey: string;
  moodScore: number;
}

export interface HeatmapDay {
  dateKey: string;
  /** Rounded 1-5 day average, or null for an in-range day with no entry. */
  score: number | null;
}

export interface HeatmapWeek {
  /** Monday-start column, always 7 slots; null = outside first-entry…today. */
  days: (HeatmapDay | null)[];
  /** Short month name above the column, or null for unlabelled columns. */
  monthLabel: string | null;
}

/**
 * GitHub-style weeks-as-columns grid of rounded day-average scores, from the
 * week of the earliest point through the current week. Days before the first
 * entry or after the last day in range are null slots (rendered as nothing —
 * never a shame state); in-range days without an entry carry a null score.
 *
 * The grid is a pure calendar sequence; only membership depends on the captured
 * civil day each point was logged on.
 */
export function buildMoodHeatmapWeeks(
  points: MoodSample[] | undefined,
  lang = "en",
  now = new Date(),
): HeatmapWeek[] {
  if (!points || points.length === 0) {
    return [];
  }

  const buckets = new Map<string, { sum: number; count: number }>();
  let firstKey: string | null = null;
  for (const point of points) {
    if (firstKey === null || point.dayKey < firstKey) firstKey = point.dayKey;
    const bucket = buckets.get(point.dayKey);
    if (bucket) {
      bucket.sum += point.moodScore;
      bucket.count += 1;
    } else {
      buckets.set(point.dayKey, { sum: point.moodScore, count: 1 });
    }
  }

  // Ends at today, or at a later day the user already holds an entry on: fly
  // east-to-west and you land holding a "tomorrow" entry, which a hard clamp at
  // today would erase from the grid entirely (#250).
  const lastKey = dayRangeEndKey(buckets.keys(), now);
  const monthFmt = new Intl.DateTimeFormat(lang, { month: "short" });

  const weeks: HeatmapWeek[] = [];
  let cursorKey = mondayKeyOf(firstKey!);
  const endKey = mondayKeyOf(lastKey);
  while (cursorKey <= endKey) {
    const days: (HeatmapDay | null)[] = [];
    let monthLabel: string | null =
      weeks.length === 0 ? monthFmt.format(parseLocalNoon(firstKey!)) : null;
    for (let i = 0; i < 7; i++) {
      const key = addDaysToKey(cursorKey, i);
      if (key.endsWith("-01") && weeks.length > 0)
        monthLabel = monthFmt.format(parseLocalNoon(key));
      if (key < firstKey! || key > lastKey) {
        days.push(null);
        continue;
      }
      const bucket = buckets.get(key);
      const score =
        bucket === undefined
          ? null
          : Math.min(5, Math.max(1, Math.round(bucket.sum / bucket.count)));
      days.push({ dateKey: key, score });
    }
    weeks.push({ days, monthLabel });
    cursorKey = addDaysToKey(cursorKey, 7);
  }

  return weeks;
}
