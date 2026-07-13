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
  "module-act": "act-drop-anchor",
};

export function resolveInitialWidgetIds(planItems: { toolId: string; order: number }[]): string[] {
  if (planItems.length === 0) return [];

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
