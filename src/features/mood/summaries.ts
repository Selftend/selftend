import { addDaysToKey, dayRangeEndKey } from "@/src/utils/date";
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

/** Counts at each of the five levels, index 0 = score 1 (#737, decided on #701). */
export type MoodDistribution = [number, number, number, number, number];

/**
 * How many check-ins landed at each level, over whatever window the caller
 * already fetched.
 *
 * A pure reduction, not a query: the distribution shares the trend's range and
 * therefore the trend's `scorePoints` array (#700), so it costs one pass over
 * data already on screen. Scores outside 1-5 are ignored rather than clamped -
 * a bad row should not inflate a real level's count.
 */
export function getMoodDistribution(points: { moodScore: number }[] | undefined): MoodDistribution {
  const counts: MoodDistribution = [0, 0, 0, 0, 0];
  for (const point of points ?? []) {
    const level = point.moodScore;
    if (Number.isInteger(level) && level >= 1 && level <= 5) counts[level - 1] += 1;
  }
  return counts;
}

// `getDailyAverages`, `getWeekDelta` and `getTopEmotions` lived here until #736.
// All three measured a TRAILING window anchored on the newest day key, which is
// what the week strip needed while it could not move. A navigator cannot page
// trailing windows, so their calendar-week replacements live in `week-window.ts`
// and read from a per-week query rather than the 200-row history cache. They had
// no other consumer, so nothing else had to move with them.
//
// `groupLogsByDate` lived here until #735. It grouped the overview's inline
// history into today/yesterday/thisWeek/older buckets with per-group averages;
// that list is gone, and the all-history screen groups its own rows in
// `history-groups.ts` - which splits the tail into calendar months rather than
// one unbounded `older`, and carries no averages (#705).
