export const CONCERN_KEYS = [
  "anxious-thoughts",
  "low-mood",
  "stress-overwhelm",
  "sleep",
  "habits",
  "reflection",
] as const;

export type ConcernKey = (typeof CONCERN_KEYS)[number];

export function isConcernKey(value: unknown): value is ConcernKey {
  return typeof value === "string" && (CONCERN_KEYS as readonly string[]).includes(value);
}

// Shared, standalone tools each concern can suggest. Module-specific exercises are
// deliberately excluded; CBT/ACT are recommended separately as modules/programs.
const CONCERN_WIDGETS: Record<ConcernKey, readonly string[]> = {
  "anxious-thoughts": ["mood-checkin", "breathing-suggested", "journal-week"],
  "low-mood": ["mood-checkin", "gratitude-latest", "habits-today"],
  "stress-overwhelm": ["mood-checkin", "breathing-suggested", "meditation-pick"],
  sleep: ["sleep-latest", "meditation-pick", "breathing-suggested"],
  habits: ["habits-today", "journal-week"],
  reflection: ["journal-week", "gratitude-latest", "mood-checkin"],
};

// Suggested shared tools for picked concerns. Nothing is added when no concern is
// selected, and no unrelated defaults are appended.
export function resolveConcernWidgetIds(selected: readonly string[]): string[] {
  const picked = selected.filter(isConcernKey);
  if (picked.length === 0) return [];

  const ordered: string[] = [];
  for (const concern of picked) {
    for (const widgetId of CONCERN_WIDGETS[concern]) {
      if (!ordered.includes(widgetId)) ordered.push(widgetId);
    }
  }
  return ordered;
}

// Where the home "Start here" card sends the user, per (first-picked) concern.
export const START_HERE_TARGETS: Record<ConcernKey, string> = {
  "anxious-thoughts": "/modules/cbt/new",
  "low-mood": "/modules/cbt",
  "stress-overwhelm": "/modules/act/connection/drop-anchor",
  sleep: "/tools/sleep",
  habits: "/tools/habits",
  reflection: "/tools/journal",
};
