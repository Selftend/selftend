import {
  isConcernKey,
  resolveConcernWidgetIds,
  type ConcernKey,
} from "@/src/features/onboarding/concerns";

export const SHARED_TOOL_WIDGET_IDS = [
  "mood-checkin",
  "mood-trend",
  "breathing-suggested",
  "journal-week",
  "grounding-log",
  "gratitude-latest",
  "meditation-pick",
  "sleep-latest",
  "habits-today",
] as const;

export type SharedToolWidgetId = (typeof SHARED_TOOL_WIDGET_IDS)[number];
export type ModuleInterest = "cbt" | "act";
export type GuidancePreference = "guided" | "self-directed";

export interface WidgetRecommendationInput {
  concerns: readonly ConcernKey[];
  moduleInterests: readonly ModuleInterest[];
  guidance: GuidancePreference;
  selectedToolWidgetIds: readonly SharedToolWidgetId[];
}

export interface WidgetRecommendation {
  widgetId: string;
  reason:
    "selected-tool" | "matched-concern" | "optional-tool" | "guided-module" | "module-shortcut";
}

export function suggestSharedToolWidgetIds(concerns: readonly ConcernKey[]): SharedToolWidgetId[] {
  return resolveConcernWidgetIds(concerns.filter(isConcernKey)).filter(
    (widgetId): widgetId is SharedToolWidgetId =>
      (SHARED_TOOL_WIDGET_IDS as readonly string[]).includes(widgetId),
  );
}

function moduleWidgetId(module: ModuleInterest, guidance: GuidancePreference): string {
  if (guidance === "guided") return `${module}-programme`;
  return `${module}-module-shortcut`;
}

export function buildWidgetRecommendations(
  input: WidgetRecommendationInput,
): WidgetRecommendation[] {
  const recommendations: WidgetRecommendation[] = [];
  const seen = new Set<string>();
  const add = (widgetId: string, reason: WidgetRecommendation["reason"]) => {
    if (seen.has(widgetId)) return;
    seen.add(widgetId);
    recommendations.push({ widgetId, reason });
  };

  for (const module of input.moduleInterests) {
    add(
      moduleWidgetId(module, input.guidance),
      input.guidance === "guided" ? "guided-module" : "module-shortcut",
    );
  }

  const concernSuggestions = new Set(suggestSharedToolWidgetIds(input.concerns));
  for (const widgetId of input.selectedToolWidgetIds) {
    add(widgetId, concernSuggestions.has(widgetId) ? "matched-concern" : "selected-tool");
  }

  return recommendations;
}
