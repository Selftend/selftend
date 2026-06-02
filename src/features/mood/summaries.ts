import { toLocalDateKey, localDateKey } from "@/src/stores/selected-date-store";
import type { MoodLog } from "@/src/features/mood/types";
import { calendarDayDiff, startOfDayDaysAgo } from "@/src/utils/date";

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

  const start = startOfDayDaysAgo(days);

  const scores = logs
    .filter((log) => new Date(log.loggedAt).getTime() >= start.getTime())
    .map((log) => log.moodScore);

  return summarizeScores(scores);
}

/** Summary for a single `YYYY-MM-DD` day, used to scope the screen to the date bar. */
export function getDayMoodSummary(logs: MoodSample[] | undefined, dateKey: string): MoodSummary {
  if (!logs || logs.length === 0) {
    return { average: null, count: 0 };
  }

  const scores = logs
    .filter((log) => toLocalDateKey(log.loggedAt) === dateKey)
    .map((log) => log.moodScore);

  return summarizeScores(scores);
}

// ── New aggregation helpers ────────────────────────────────────────────────

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

function summarizeScores(scores: number[]): MoodSummary {
  if (scores.length === 0) {
    return { average: null, count: 0 };
  }
  const average = scores.reduce((sum, score) => sum + score, 0) / scores.length;
  return { average: round1(average), count: scores.length };
}

export interface DayAverage {
  dateKey: string;
  average: number | null;
}

/** Per-day averages for the last `days` days (oldest→newest), including days with no logs (`null`). */
export function getDailyAverages(
  logs: MoodSample[] | undefined,
  days = 7,
  now: Date = new Date(),
): DayAverage[] {
  const start = startOfDayDaysAgo(days, now);

  const buckets = new Map<string, { sum: number; count: number }>();
  for (const log of logs ?? []) {
    const logged = new Date(log.loggedAt);
    if (logged.getTime() < start.getTime()) continue;
    const key = localDateKey(logged);
    const b = buckets.get(key);
    if (b) {
      b.sum += log.moodScore;
      b.count += 1;
    } else {
      buckets.set(key, { sum: log.moodScore, count: 1 });
    }
  }

  const out: DayAverage[] = [];
  for (let i = 0; i < days; i++) {
    const day = new Date(start);
    day.setDate(start.getDate() + i);
    const b = buckets.get(localDateKey(day));
    out.push({ dateKey: localDateKey(day), average: b ? round1(b.sum / b.count) : null });
  }
  return out;
}

function averageInDayWindow(
  logs: MoodSample[],
  oldestDaysAgo: number,
  newestDaysAgo: number,
  now: Date,
): number | null {
  const start = new Date(now);
  start.setHours(0, 0, 0, 0);
  start.setDate(start.getDate() - oldestDaysAgo);
  const end = new Date(now);
  end.setHours(23, 59, 59, 999);
  end.setDate(end.getDate() - newestDaysAgo);

  const scores = logs
    .filter((l) => {
      const t = new Date(l.loggedAt).getTime();
      return t >= start.getTime() && t <= end.getTime();
    })
    .map((l) => l.moodScore);
  if (scores.length === 0) return null;
  return round1(scores.reduce((s, v) => s + v, 0) / scores.length);
}

export interface WeekDelta {
  current: number | null;
  previous: number | null;
  delta: number | null;
}

/** This week's average (days 0–6) vs the prior week (days 7–13). */
export function getWeekDelta(logs: MoodSample[] | undefined, now: Date = new Date()): WeekDelta {
  const list = logs ?? [];
  const current = averageInDayWindow(list, 6, 0, now);
  const previous = averageInDayWindow(list, 13, 7, now);
  const delta = current !== null && previous !== null ? round1(current - previous) : null;
  return { current, previous, delta };
}

interface EmotionSample {
  emotions: string[];
}

export interface EmotionCount {
  id: string;
  count: number;
}

/** Emotion ids by frequency (desc), ties broken by id (asc). Returns at most `limit`. */
export function getTopEmotions(logs: EmotionSample[] | undefined, limit = 3): EmotionCount[] {
  const counts = new Map<string, number>();
  for (const log of logs ?? []) {
    for (const id of log.emotions ?? []) {
      counts.set(id, (counts.get(id) ?? 0) + 1);
    }
  }
  return [...counts.entries()]
    .map(([id, count]) => ({ id, count }))
    .sort((a, b) => b.count - a.count || a.id.localeCompare(b.id))
    .slice(0, limit);
}

export type HistoryGroupKey = "today" | "yesterday" | "thisWeek" | "older";

export interface HistoryGroup {
  key: HistoryGroupKey;
  average: number;
  entries: MoodLog[];
}

const GROUP_ORDER: HistoryGroupKey[] = ["today", "yesterday", "thisWeek", "older"];

function groupKeyFor(loggedAt: string, now: Date): HistoryGroupKey {
  const dayDiff = calendarDayDiff(new Date(loggedAt), now);
  if (dayDiff <= 0) return "today";
  if (dayDiff === 1) return "yesterday";
  if (dayDiff <= 6) return "thisWeek";
  return "older";
}

/** Groups logs (assumed newest-first) into ordered date buckets with per-group averages. */
export function groupLogsByDate(
  logs: MoodLog[] | undefined,
  now: Date = new Date(),
): HistoryGroup[] {
  const byKey = new Map<HistoryGroupKey, MoodLog[]>();
  for (const log of logs ?? []) {
    const key = groupKeyFor(log.loggedAt, now);
    const arr = byKey.get(key);
    if (arr) arr.push(log);
    else byKey.set(key, [log]);
  }
  return GROUP_ORDER.flatMap((key) => {
    const entries = byKey.get(key);
    if (!entries || entries.length === 0) return [];
    const average = round1(entries.reduce((s, e) => s + e.moodScore, 0) / entries.length);
    return [{ key, average, entries }];
  });
}
