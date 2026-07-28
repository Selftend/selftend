import { addDaysToKey, dayRangeEndKey, parseLocalNoon } from "@/src/utils/date";
import { roundTo1 } from "@/src/utils/number";

type DurationLog = { durationMinutes: number; dayKey: string };
type QualityLog = { quality: number; dayKey: string };

// Walked in day keys, matching how sleep logs are bucketed everywhere else: a
// window measured in elapsed time disagrees with captured-day buckets exactly
// when the user has travelled (#250). The end extends past today if a later day
// was captured, so a night logged east of here still counts.
function withinDays<T extends { dayKey: string }>(logs: T[], days: number, now = new Date()): T[] {
  const endKey = dayRangeEndKey(
    logs.map((l) => l.dayKey),
    now,
  );
  const startKey = addDaysToKey(endKey, -(days - 1));
  return logs.filter((l) => l.dayKey >= startKey && l.dayKey <= endKey);
}

export function averageDurationMinutes(logs: DurationLog[], days: number): number | null {
  const window = withinDays(logs, days);
  if (window.length === 0) return null;
  return Math.round(window.reduce((sum, l) => sum + l.durationMinutes, 0) / window.length);
}

export function averageQuality(logs: QualityLog[], days: number): number | null {
  const window = withinDays(logs, days);
  if (window.length === 0) return null;
  return roundTo1(window.reduce((sum, l) => sum + l.quality, 0) / window.length);
}

// Newest `count` logs, returned oldest->newest so charts read left-to-right.
export function recentNights<T extends { loggedAt: string }>(logs: T[], count: number): T[] {
  return [...logs]
    .sort((a, b) => (a.loggedAt < b.loggedAt ? 1 : -1))
    .slice(0, count)
    .reverse();
}

export function extremes(
  logs: DurationLog[],
  days?: number,
): { longest: number | null; shortest: number | null } {
  const window = days === undefined ? logs : withinDays(logs, days);
  if (window.length === 0) return { longest: null, shortest: null };
  let longest = window[0].durationMinutes;
  let shortest = window[0].durationMinutes;
  for (const l of window) {
    if (l.durationMinutes > longest) longest = l.durationMinutes;
    if (l.durationMinutes < shortest) shortest = l.durationMinutes;
  }
  return { longest, shortest };
}

// counts[0..4] correspond to quality 1..5.
export function qualityDistribution(logs: QualityLog[], days?: number): number[] {
  const window = days === undefined ? logs : withinDays(logs, days);
  const counts = [0, 0, 0, 0, 0];
  for (const l of window) {
    if (l.quality >= 1 && l.quality <= 5) counts[l.quality - 1] += 1;
  }
  return counts;
}

// index 0..6 => Monday..Sunday average duration (null when that weekday has no logs).
export function weekdayAverages(logs: DurationLog[]): (number | null)[] {
  const sums = Array<number>(7).fill(0);
  const counts = Array<number>(7).fill(0);
  for (const l of logs) {
    // The weekday of the day it was captured on, not of the viewer's reading of
    // that instant - otherwise travel silently moves a night into another column.
    const jsDay = parseLocalNoon(l.dayKey).getDay(); // 0=Sun..6=Sat
    const idx = (jsDay + 6) % 7; // 0=Mon..6=Sun
    sums[idx] += l.durationMinutes;
    counts[idx] += 1;
  }
  return sums.map((sum, i) => (counts[i] === 0 ? null : Math.round(sum / counts[i])));
}

export function loggedOnDate(logs: { dayKey: string }[], dateKey: string): boolean {
  return logs.some((l) => l.dayKey === dateKey);
}
