import {
  addDaysToKey,
  dayKeyDiff,
  dayRangeEndKey,
  lastNDayKeysEndingAt,
  parseLocalNoon,
} from "@/src/utils/date";
import { roundTo1 } from "@/src/utils/number";

interface MoodChartPoint {
  day: string;
  score: number;
  offset: number;
}

/** Points arrive pre-bucketed: `dayKey` is the civil day captured at logging time. */
interface MoodSample {
  dayKey: string;
  moodScore: number;
}

// Locale-aware, day-distinct label (e.g. "24 May") so the x-axis is correct in every
// locale and a multi-week window never reuses the same weekday name for two different days.
function formatDayLabel(dateKey: string, lang: string) {
  return new Intl.DateTimeFormat(lang, { day: "numeric", month: "short" }).format(
    parseLocalNoon(dateKey),
  );
}

function bucketByDayKey(logs: MoodSample[]) {
  const buckets = new Map<string, { sum: number; count: number }>();
  for (const log of logs) {
    const bucket = buckets.get(log.dayKey);
    if (bucket) {
      bucket.sum += log.moodScore;
      bucket.count += 1;
    } else {
      buckets.set(log.dayKey, { sum: log.moodScore, count: 1 });
    }
  }
  return buckets;
}

/**
 * Daily averages across an explicit inclusive range of civil date keys
 * (`YYYY-MM-DD`). Only days inside the range emit points; offsets spread over the
 * full range so gaps render honestly at any range length.
 *
 * The range walk doubles as the client-side filter for the fetch window, which is
 * padded by a day on each side so no captured day near an edge can be missed.
 */
export function buildMoodChartDataForRange(
  logs: MoodSample[] | undefined,
  startKey: string,
  endKey: string,
  lang = "en",
): MoodChartPoint[] {
  if (!logs || logs.length === 0) {
    return [];
  }

  const dayCount = dayKeyDiff(startKey, endKey) + 1;
  if (dayCount <= 0) {
    return [];
  }

  const buckets = bucketByDayKey(logs);

  const points: MoodChartPoint[] = [];
  for (let dayIndex = 0; dayIndex < dayCount; dayIndex++) {
    const dateKey = addDaysToKey(startKey, dayIndex);
    const bucket = buckets.get(dateKey);
    if (!bucket) continue;
    points.push({
      day: formatDayLabel(dateKey, lang),
      score: roundTo1(bucket.sum / bucket.count),
      offset: dayCount > 1 ? dayIndex / (dayCount - 1) : 0,
    });
  }

  return points;
}

/**
 * The `days` most recent civil date keys, oldest first. Ends at today, or at a
 * later day the user already holds an entry on.
 */
export function lastNMoodDayKeys(
  logs: MoodSample[] | undefined,
  days: number,
  now = new Date(),
): string[] {
  return lastNDayKeysEndingAt(
    days,
    dayRangeEndKey(
      (logs ?? []).map((log) => log.dayKey),
      now,
    ),
  );
}

/** Rounded whole-number day averages for each of `dateKeys`; null where the day has no logs. */
export function dailyIntegerAverages(logs: MoodSample[], dateKeys: string[]): (number | null)[] {
  const buckets = bucketByDayKey(logs);
  return dateKeys.map((dateKey) => {
    const bucket = buckets.get(dateKey);
    return bucket === undefined ? null : Math.round(bucket.sum / bucket.count);
  });
}
