import { DEFAULT_WIDGET_IDS } from "@/src/features/home/seeding";

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

// Widgets each concern promotes toward the top of the dashboard, in priority order.
// Ids must exist in DEFAULT_WIDGET_IDS (src/features/home/seeding.ts).
const CONCERN_WIDGETS: Record<ConcernKey, readonly string[]> = {
  "anxious-thoughts": ["cbt-open-record", "act-drop-anchor", "breathing-suggested"],
  "low-mood": ["mood-trend", "cbt-open-record", "gratitude-latest"],
  "stress-overwhelm": ["breathing-suggested", "act-drop-anchor", "meditation-pick"],
  sleep: ["sleep-latest", "meditation-pick", "breathing-suggested"],
  habits: ["habits-today", "journal-week"],
  reflection: ["journal-week", "gratitude-latest", "mood-trend"],
};

// Full dashboard order for the picked concerns: check-in first, then the union of
// picked concerns' widgets in pick order, then all remaining defaults.
export function resolveConcernWidgetIds(selected: readonly string[]): string[] {
  const picked = selected.filter(isConcernKey);
  if (picked.length === 0) return [...DEFAULT_WIDGET_IDS];

  const ordered: string[] = ["mood-checkin"];
  for (const concern of picked) {
    for (const widgetId of CONCERN_WIDGETS[concern]) {
      if (!ordered.includes(widgetId)) ordered.push(widgetId);
    }
  }
  for (const widgetId of DEFAULT_WIDGET_IDS) {
    if (!ordered.includes(widgetId)) ordered.push(widgetId);
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
