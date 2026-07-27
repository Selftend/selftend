import type { GratitudeEntry } from "@/src/features/gratitude/types";
import { dayRangeEndKey, lastNDayKeysEndingAt, parseLocalNoon } from "@/src/utils/date";

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

export function getGratitudeFrequencyBuckets(
  entries: GratitudeEntry[],
  now = new Date(),
  bucketCount = 8,
): GratitudeFrequencyBucket[] {
  // Buckets are civil days, counted by the day each entry was captured on, and
  // the range ends at today or at a later captured day so an entry logged east
  // of the viewer still lands in the strip (#250).
  const endKey = dayRangeEndKey(
    entries.map((entry) => entry.dayKey),
    now,
  );
  const dayKeys = lastNDayKeysEndingAt(bucketCount, endKey);

  const counts = new Map(dayKeys.map((key) => [key, 0]));
  for (const entry of entries) {
    const current = counts.get(entry.dayKey);
    if (current !== undefined) counts.set(entry.dayKey, current + 1);
  }

  return dayKeys.map((key) => ({
    id: key,
    label: parseLocalNoon(key).toLocaleDateString(undefined, { month: "short", day: "numeric" }),
    count: counts.get(key) ?? 0,
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
