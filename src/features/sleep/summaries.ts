import { startOfDayDaysAgo, toLocalDateKey } from "@/src/utils/date";
import { roundTo1 } from "@/src/utils/number";

type DurationLog = { durationMinutes: number; loggedAt: string };
type QualityLog = { quality: number; loggedAt: string };

function withinDays<T extends { loggedAt: string }>(logs: T[], days: number): T[] {
  const cutoff = startOfDayDaysAgo(days).getTime();
  return logs.filter((l) => new Date(l.loggedAt).getTime() >= cutoff);
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
    const jsDay = new Date(l.loggedAt).getDay(); // 0=Sun..6=Sat
    const idx = (jsDay + 6) % 7; // 0=Mon..6=Sun
    sums[idx] += l.durationMinutes;
    counts[idx] += 1;
  }
  return sums.map((sum, i) => (counts[i] === 0 ? null : Math.round(sum / counts[i])));
}

export function loggedOnDate(logs: { loggedAt: string }[], dateKey: string): boolean {
  return logs.some((l) => toLocalDateKey(l.loggedAt) === dateKey);
}
