import type { SteppableToolId } from "@/src/features/routines/derive";

// Pure builder for the declinable pre-composed starter routine (spec #37,
// "Onboarding starter routine"). Candidates are the tool widgets the user kept
// on Home, mapped to their steppable dated-log tools. Callers pass the kept
// widget ids in stored position order - the order the concern-widget
// resolution seeded them in - so the starter's step order follows it.
//
// Shared by the Routines-page empty-state offer (#45) and the onboarding
// panel (#46). The offer itself writes nothing; a routine is created only on
// an affirmative "Keep", through the normal repository write path.

/** Research-backed cap (#23): starter routines are 1-3 tiny steps. */
export const STARTER_STEP_CAP = 3;
/** A one-step "routine" is not a second-action bridge - below this, no offer. */
export const STARTER_STEP_MIN = 2;

// Home tool widgets → the steppable dated-log tool each one exercises. Only
// the shared tool widgets the concern resolution can suggest are mapped.
// `habits-today` is intentionally absent: Habits is a valid manual step but is
// excluded from starter auto-composition (#31 decision, 2026-07-15).
const WIDGET_STEP_TOOLS: Readonly<Record<string, SteppableToolId>> = {
  "mood-checkin": "mood",
  "mood-trend": "mood",
  "journal-week": "journal",
  "gratitude-latest": "gratitude",
  "sleep-latest": "sleep",
  "breathing-suggested": "breathing",
  "grounding-log": "grounding",
  "meditation-pick": "meditation",
};

/**
 * Compose the starter routine's steps from the user's kept widget ids
 * (position-ordered). Returns the deduplicated tool list capped at
 * {@link STARTER_STEP_CAP}, or `null` when fewer than {@link STARTER_STEP_MIN}
 * candidates exist - in which case no offer is shown at all.
 */
export function buildStarterSteps(keptWidgetIds: readonly string[]): SteppableToolId[] | null {
  const tools: SteppableToolId[] = [];
  for (const widgetId of keptWidgetIds) {
    const tool = WIDGET_STEP_TOOLS[widgetId];
    if (!tool || tools.includes(tool)) continue;
    tools.push(tool);
    if (tools.length === STARTER_STEP_CAP) break;
  }
  return tools.length >= STARTER_STEP_MIN ? tools : null;
}
