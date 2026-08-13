import {
  isConcernKey,
  resolveConcernWidgetIds,
  type ConcernKey,
} from "@/src/features/onboarding/concerns";

export const SHARED_TOOL_WIDGET_IDS = [
  "mood-checkin",
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
  selectedToolWidgetIds: readonly SharedToolWidgetId[];
}

export interface WidgetRecommendation {
  widgetId: string;
  reason: "selected-tool" | "matched-concern" | "optional-tool" | "module";
}

export function suggestSharedToolWidgetIds(concerns: readonly ConcernKey[]): SharedToolWidgetId[] {
  return resolveConcernWidgetIds(concerns.filter(isConcernKey)).filter(
    (widgetId): widgetId is SharedToolWidgetId =>
      (SHARED_TOOL_WIDGET_IDS as readonly string[]).includes(widgetId),
  );
}

/**
 * A picked module resolves to its programme id, and to nothing else.
 *
 * This used to branch on the onboarding `guidance` answer, handing a
 * self-directed user `${module}-module-shortcut` instead. #973 retired both
 * shortcut ids - a shortcut was a card that carried a module's name and a
 * button to its home, which is what the module's own row does now - so the
 * branch had one arm left and the answer had nothing to select. The wizard
 * still asks the question and still holds the answer; it no longer decides
 * which widget you get.
 */
function moduleWidgetId(module: ModuleInterest): string {
  return `${module}-programme`;
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
    add(moduleWidgetId(module), "module");
  }

  const concernSuggestions = new Set(suggestSharedToolWidgetIds(input.concerns));
  for (const widgetId of input.selectedToolWidgetIds) {
    add(widgetId, concernSuggestions.has(widgetId) ? "matched-concern" : "selected-tool");
  }

  return recommendations;
}
