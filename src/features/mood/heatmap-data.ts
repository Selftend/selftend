import { localDateKey } from "@/src/stores/selected-date-store";

interface MoodSample {
  loggedAt: string;
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

/** Local midnight of the Monday on or before the given date. */
function mondayOf(date: Date): Date {
  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
  return d;
}

/**
 * GitHub-style weeks-as-columns grid of rounded day-average scores, from the
 * week of the earliest point through the current week. Days before the first
 * entry or after today are null slots (rendered as nothing — never a shame
 * state); in-range days without an entry carry a null score.
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
  let earliest: Date | null = null;
  for (const point of points) {
    const logged = new Date(point.loggedAt);
    const localDay = new Date(logged.getFullYear(), logged.getMonth(), logged.getDate());
    if (earliest === null || localDay.getTime() < earliest.getTime()) earliest = localDay;
    const key = localDateKey(localDay);
    const bucket = buckets.get(key);
    if (bucket) {
      bucket.sum += point.moodScore;
      bucket.count += 1;
    } else {
      buckets.set(key, { sum: point.moodScore, count: 1 });
    }
  }

  const firstKey = localDateKey(earliest!);
  const todayKey = localDateKey(now);
  const monthFmt = new Intl.DateTimeFormat(lang, { month: "short" });

  const weeks: HeatmapWeek[] = [];
  const cursor = mondayOf(earliest!);
  const end = mondayOf(now);
  while (cursor.getTime() <= end.getTime()) {
    const days: (HeatmapDay | null)[] = [];
    let monthLabel: string | null = weeks.length === 0 ? monthFmt.format(earliest!) : null;
    for (let i = 0; i < 7; i++) {
      const day = new Date(cursor);
      day.setDate(cursor.getDate() + i);
      const key = localDateKey(day);
      if (day.getDate() === 1 && weeks.length > 0) monthLabel = monthFmt.format(day);
      if (key < firstKey || key > todayKey) {
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
    cursor.setDate(cursor.getDate() + 7);
  }

  return weeks;
}
