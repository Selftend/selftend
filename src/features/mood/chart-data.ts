import { localDateKey, toLocalDateKey } from "@/src/stores/selected-date-store";
import { startOfDayDaysAgo } from "@/src/utils/date";

interface MoodChartPoint {
  day: string;
  score: number;
  offset: number;
}

interface MoodSample {
  loggedAt: string;
  moodScore: number;
}

// Locale-aware, day-distinct label (e.g. "24 May") so the x-axis is correct in every
// locale and a multi-week window never reuses the same weekday name for two different days.
function formatDayLabel(value: Date) {
  return new Intl.DateTimeFormat(undefined, { day: "numeric", month: "short" }).format(value);
}

export function buildMoodChartData(logs: MoodSample[] | undefined, days: number): MoodChartPoint[] {
  if (!logs || logs.length === 0 || days <= 0) {
    return [];
  }

  const start = startOfDayDaysAgo(days);

  const buckets = new Map<string, { sum: number; count: number }>();

  for (const log of logs) {
    const logged = new Date(log.loggedAt);
    if (logged.getTime() < start.getTime()) continue;

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

  const points: MoodChartPoint[] = [];
  for (let dayIndex = 0; dayIndex < days; dayIndex++) {
    const day = new Date(start);
    day.setDate(start.getDate() + dayIndex);
    const bucket = buckets.get(localDateKey(day));
    if (!bucket) continue;
    points.push({
      day: formatDayLabel(day),
      score: Math.round((bucket.sum / bucket.count) * 10) / 10,
      offset: days > 1 ? dayIndex / (days - 1) : 0,
    });
  }

  return points;
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
