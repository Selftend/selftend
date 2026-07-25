import { localDateKey, toLocalDateKey } from "@/src/stores/selected-date-store";
import { parseLocalNoon, startOfDayDaysAgo } from "@/src/utils/date";
import { roundTo1 } from "@/src/utils/number";

interface MoodChartPoint {
  day: string;
  score: number;
  offset: number;
}

interface MoodSample {
  loggedAt: string;
  moodScore: number;
}

const DAY_MS = 24 * 60 * 60 * 1000;

// Locale-aware, day-distinct label (e.g. "24 May") so the x-axis is correct in every
// locale and a multi-week window never reuses the same weekday name for two different days.
function formatDayLabel(value: Date, lang: string) {
  return new Intl.DateTimeFormat(lang, { day: "numeric", month: "short" }).format(value);
}

function bucketByLocalDay(logs: MoodSample[]) {
  const buckets = new Map<string, { sum: number; count: number }>();
  for (const log of logs) {
    const logged = new Date(log.loggedAt);
    const localDay = new Date(logged.getFullYear(), logged.getMonth(), logged.getDate());
    const key = localDateKey(localDay);
    const bucket = buckets.get(key);
    if (bucket) {
      bucket.sum += log.moodScore;
      bucket.count += 1;
    } else {
      buckets.set(key, { sum: log.moodScore, count: 1 });
    }
  }
  return buckets;
}

/**
 * Daily local-day averages across an explicit inclusive range of local date keys
 * (`YYYY-MM-DD`). Only days inside the range emit points; offsets spread over the
 * full range so gaps render honestly at any range length.
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

  // Noon-anchored day stepping so a DST shift inside the range can't skew the count.
  const start = parseLocalNoon(startKey);
  const end = parseLocalNoon(endKey);
  const dayCount = Math.round((end.getTime() - start.getTime()) / DAY_MS) + 1;
  if (dayCount <= 0) {
    return [];
  }

  const buckets = bucketByLocalDay(logs);

  const points: MoodChartPoint[] = [];
  for (let dayIndex = 0; dayIndex < dayCount; dayIndex++) {
    const day = new Date(start);
    day.setDate(start.getDate() + dayIndex);
    const bucket = buckets.get(localDateKey(day));
    if (!bucket) continue;
    points.push({
      day: formatDayLabel(day, lang),
      score: roundTo1(bucket.sum / bucket.count),
      offset: dayCount > 1 ? dayIndex / (dayCount - 1) : 0,
    });
  }

  return points;
}

/** Daily averages for the trailing `days`-day window ending today. */
export function buildMoodChartData(
  logs: MoodSample[] | undefined,
  days: number,
  lang = "en",
): MoodChartPoint[] {
  if (days <= 0) {
    return [];
  }
  const startKey = localDateKey(startOfDayDaysAgo(days));
  const endKey = localDateKey(new Date());
  return buildMoodChartDataForRange(logs, startKey, endKey, lang);
}

export function lastNLocalDateKeys(days: number, now = new Date()): string[] {
  const dates: string[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    dates.push(localDateKey(d));
  }
  return dates;
}

export function dailyIntegerAverages(
  logs: { loggedAt: string; moodScore: number }[],
  dateKeys: string[],
): (number | null)[] {
  return dateKeys.map((date) => {
    const logsOnDay = logs.filter((l) => toLocalDateKey(l.loggedAt) === date);
    return logsOnDay.length > 0
      ? Math.round(logsOnDay.reduce((sum, l) => sum + l.moodScore, 0) / logsOnDay.length)
      : null;
  });
}
