import type { GratitudeEntry } from "@/src/features/gratitude/types";
import { localDateKey } from "@/src/stores/selected-date-store";

interface GratitudeFrequencyBucket {
  id: string;
  label: string;
  count: number;
}

export interface GratitudeTheme {
  word: string;
  count: number;
}

const THEME_STOP_WORDS = new Set([
  "about",
  "after",
  "again",
  "also",
  "and",
  "are",
  "because",
  "but",
  "for",
  "from",
  "have",
  "that",
  "the",
  "this",
  "today",
  "was",
  "were",
  "with",
  "you",
  "your",
  "беше",
  "във",
  "днес",
  "един",
  "една",
  "едно",
  "за",
  "и",
  "като",
  "което",
  "която",
  "които",
  "на",
  "не",
  "от",
  "съм",
  "че",
]);

function parseDate(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function startOfDay(value: Date) {
  const date = new Date(value);
  date.setHours(0, 0, 0, 0);
  return date;
}

function addDays(value: Date, days: number) {
  const date = new Date(value);
  date.setDate(date.getDate() + days);
  return date;
}

function bucketId(value: Date) {
  return localDateKey(value);
}

export function getGratitudeFrequencyBuckets(
  entries: GratitudeEntry[],
  now = new Date(),
  bucketCount = 8,
): GratitudeFrequencyBucket[] {
  const lastStart = startOfDay(now);
  const starts = Array.from({ length: bucketCount }, (_, index) =>
    addDays(lastStart, index - bucketCount + 1),
  );

  const counts = new Map(starts.map((start) => [bucketId(start), 0]));
  const firstStart = starts[0] ?? lastStart;

  entries.forEach((entry) => {
    const loggedAt = parseDate(entry.loggedAt);
    if (!loggedAt || loggedAt < firstStart || loggedAt > addDays(lastStart, 1)) return;
    const key = bucketId(startOfDay(loggedAt));
    if (counts.has(key)) {
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }
  });

  return starts.map((start) => ({
    id: bucketId(start),
    label: start.toLocaleDateString(undefined, { month: "short", day: "numeric" }),
    count: counts.get(bucketId(start)) ?? 0,
  }));
}

function entryThemeText(entry: GratitudeEntry) {
  return [
    ...entry.items,
    ...entry.lifeItems,
    ...entry.events,
    entry.goodMoment,
    entry.missIfGone,
    entry.hiddenGood,
  ].join(" ");
}

export function getGratitudeThemes(entries: GratitudeEntry[], limit = 8): GratitudeTheme[] {
  const counts = new Map<string, number>();

  entries.forEach((entry) => {
    const words =
      entryThemeText(entry)
        .toLocaleLowerCase()
        .match(/[a-zа-я0-9]+/gi) ?? [];
    words.forEach((word) => {
      if (word.length <= 2 || THEME_STOP_WORDS.has(word)) return;
      counts.set(word, (counts.get(word) ?? 0) + 1);
    });
  });

  return [...counts.entries()]
    .map(([word, count]) => ({ word, count }))
    .sort((a, b) => b.count - a.count || a.word.localeCompare(b.word))
    .slice(0, limit);
}

export function getFavoriteGratitudeEntries(entries: GratitudeEntry[]) {
  return entries
    .filter((entry) => entry.starred)
    .sort((a, b) => {
      const aTime = parseDate(a.loggedAt)?.getTime() ?? 0;
      const bTime = parseDate(b.loggedAt)?.getTime() ?? 0;
      return bTime - aTime;
    });
}
