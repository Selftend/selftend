import type { MoodLog } from "@/src/features/mood/types";
import { addDaysToKey, dayKeyDiff, dayRangeEndKey, lastNDayKeysEndingAt } from "@/src/utils/date";
import { roundTo1 as round1 } from "@/src/utils/number";

export interface MoodSummary {
  average: number | null;
  count: number;
}

/**
 * Every aggregation here groups on `dayKey` — the civil day captured when the
 * entry was logged, resolved once in the repository — never on `loggedAt`.
 * Windows are walked in day keys for the same reason: bucketing by captured day
 * while measuring the window in elapsed time let a log count toward the 7-day
 * average while sitting outside the 7 columns drawn right above it (#250).
 */
interface MoodSample {
  dayKey: string;
  moodScore: number;
}

function scoresInKeyRange(logs: MoodSample[], startKey: string, endKey: string): number[] {
  return logs
    .filter((log) => log.dayKey >= startKey && log.dayKey <= endKey)
    .map((log) => log.moodScore);
}

export function getMoodSummary(
  logs: MoodSample[] | undefined,
  days: number,
  now: Date = new Date(),
): MoodSummary {
  if (!logs || logs.length === 0) {
    return { average: null, count: 0 };
  }

  const endKey = dayRangeEndKey(
    logs.map((log) => log.dayKey),
    now,
  );
  return summarizeScores(scoresInKeyRange(logs, addDaysToKey(endKey, -(days - 1)), endKey));
}

/** Summary for a single `YYYY-MM-DD` day, used to scope the screen to the date bar. */
export function getDayMoodSummary(logs: MoodSample[] | undefined, dateKey: string): MoodSummary {
  if (!logs || logs.length === 0) {
    return { average: null, count: 0 };
  }

  return summarizeScores(scoresInKeyRange(logs, dateKey, dateKey));
}

// ── New aggregation helpers ────────────────────────────────────────────────

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
  const list = logs ?? [];
  const endKey = dayRangeEndKey(
    list.map((log) => log.dayKey),
    now,
  );

  const buckets = new Map<string, { sum: number; count: number }>();
  for (const log of list) {
    const b = buckets.get(log.dayKey);
    if (b) {
      b.sum += log.moodScore;
      b.count += 1;
    } else {
      buckets.set(log.dayKey, { sum: log.moodScore, count: 1 });
    }
  }

  return lastNDayKeysEndingAt(days, endKey).map((dateKey) => {
    const b = buckets.get(dateKey);
    return { dateKey, average: b ? round1(b.sum / b.count) : null };
  });
}

function averageInDayWindow(
  logs: MoodSample[],
  oldestDaysAgo: number,
  newestDaysAgo: number,
  endKey: string,
): number | null {
  const scores = scoresInKeyRange(
    logs,
    addDaysToKey(endKey, -oldestDaysAgo),
    addDaysToKey(endKey, -newestDaysAgo),
  );
  if (scores.length === 0) return null;
  return round1(scores.reduce((s, v) => s + v, 0) / scores.length);
}

export interface WeekDelta {
  current: number | null;
  previous: number | null;
  delta: number | null;
}

/** This week's average (days 0-6) vs the prior week (days 7-13). */
export function getWeekDelta(logs: MoodSample[] | undefined, now: Date = new Date()): WeekDelta {
  const list = logs ?? [];
  const endKey = dayRangeEndKey(
    list.map((log) => log.dayKey),
    now,
  );
  const current = averageInDayWindow(list, 6, 0, endKey);
  const previous = averageInDayWindow(list, 13, 7, endKey);
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

type HistoryGroupKey = "today" | "yesterday" | "thisWeek" | "older";

interface HistoryGroup {
  key: HistoryGroupKey;
  average: number;
  entries: MoodLog[];
}

const GROUP_ORDER: HistoryGroupKey[] = ["today", "yesterday", "thisWeek", "older"];

function groupKeyFor(dayKey: string, todayKey: string): HistoryGroupKey {
  // A day key ahead of today (logged east, read west) still reads as "today" —
  // it is the user's most recent entry, not a future one.
  const dayDiff = dayKeyDiff(dayKey, todayKey);
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
  const todayKey = dayRangeEndKey([], now);
  const byKey = new Map<HistoryGroupKey, MoodLog[]>();
  for (const log of logs ?? []) {
    const key = groupKeyFor(log.dayKey, todayKey);
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
