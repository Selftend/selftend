interface MoodChartPoint {
  day: string;
  score: number;
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

function localDateKey(value: Date) {
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, "0");
  const day = String(value.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function buildMoodChartData(logs: MoodSample[] | undefined, days: number): MoodChartPoint[] {
  if (!logs || logs.length === 0 || days <= 0) {
    return [];
  }

  const start = new Date();
  start.setHours(0, 0, 0, 0);
  start.setDate(start.getDate() - (days - 1));

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
  for (let offset = 0; offset < days; offset++) {
    const day = new Date(start);
    day.setDate(start.getDate() + offset);
    const bucket = buckets.get(localDateKey(day));
    if (!bucket) continue;
    points.push({
      day: formatDayLabel(day),
      score: Math.round((bucket.sum / bucket.count) * 10) / 10,
    });
  }

  return points;
}
