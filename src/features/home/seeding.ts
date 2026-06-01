// Widgets seeded for a brand-new user. The daily check-in (mood-checkin) is a
// normal, movable, removable widget seeded at the top — no longer pinned.
export const DEFAULT_WIDGET_IDS = [
  "mood-checkin",
  "mood-trend",
  "cbt-open-record",
  "act-values",
  "journal-week",
  "breathing-suggested",
  "mindfulness-anchor",
  "grounding-54321",
  "gratitude-latest",
  "meditation-pick",
  "sleep-last-night",
  "sleep-7-nights",
  "habits-today",
] as const;

// Maps a legacy plan_items.tool_id to the equivalent widget id.
const TOOL_TO_WIDGET_ID: Record<string, string> = {
  mood: "mood-trend",
  journal: "journal-week",
  breathing: "breathing-suggested",
  meditation: "meditation-pick",
  gratitude: "gratitude-latest",
  habits: "habits-today",
  "self-care": "self-care",
  cbt: "cbt-open-record",
  "module-cbt": "cbt-open-record",
  "module-act": "act-values",
};

export function resolveInitialWidgetIds(planItems: { toolId: string; order: number }[]): string[] {
  if (planItems.length === 0) return [...DEFAULT_WIDGET_IDS];

  const ordered = [...planItems].sort((a, b) => a.order - b.order);
  const seen = new Set<string>();
  const result: string[] = [];
  for (const { toolId } of ordered) {
    const widgetId = TOOL_TO_WIDGET_ID[toolId];
    if (!widgetId || seen.has(widgetId)) continue;
    seen.add(widgetId);
    result.push(widgetId);
  }
  return result;
}
