import { toLocalDateKey } from "@/src/stores/selected-date-store";

export interface MoodSummary {
  average: number | null;
  count: number;
}

interface MoodSample {
  loggedAt: string;
  moodScore: number;
}

export function getMoodSummary(logs: MoodSample[] | undefined, days: number): MoodSummary {
  if (!logs || logs.length === 0) {
    return { average: null, count: 0 };
  }

  const start = new Date();
  start.setHours(0, 0, 0, 0);
  start.setDate(start.getDate() - (days - 1));

  const scores = logs
    .filter((log) => new Date(log.loggedAt).getTime() >= start.getTime())
    .map((log) => log.moodScore);

  if (scores.length === 0) {
    return { average: null, count: 0 };
  }

  const average = scores.reduce((sum, score) => sum + score, 0) / scores.length;
  return { average: Math.round(average * 10) / 10, count: scores.length };
}

/** Summary for a single `YYYY-MM-DD` day, used to scope the screen to the date bar. */
export function getDayMoodSummary(logs: MoodSample[] | undefined, dateKey: string): MoodSummary {
  if (!logs || logs.length === 0) {
    return { average: null, count: 0 };
  }

  const scores = logs
    .filter((log) => toLocalDateKey(log.loggedAt) === dateKey)
    .map((log) => log.moodScore);

  if (scores.length === 0) {
    return { average: null, count: 0 };
  }

  const average = scores.reduce((sum, score) => sum + score, 0) / scores.length;
  return { average: Math.round(average * 10) / 10, count: scores.length };
}
