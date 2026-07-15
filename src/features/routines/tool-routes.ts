import type { Href } from "expo-router";

import type { SteppableToolId } from "@/src/features/routines/derive";

/**
 * Where the continue-sheet's "Do next step" CTA sends the user, per steppable
 * tool: the surface where the qualifying dated record is created (the tool's
 * `/new` form) or, for the session tools, the picker that starts a session
 * (sessions persist their record on completion). Breathing's own `/new` route
 * is the custom-exercise EDITOR, not a session, so it routes to the picker.
 */
export const TOOL_STEP_ROUTES: Record<SteppableToolId, Href> = {
  mood: "/tools/mood-tracker/new",
  journal: "/tools/journal/new",
  gratitude: "/tools/gratitude-log/new",
  sleep: "/tools/sleep/new",
  cbt: "/modules/cbt/new",
  breathing: "/tools/breathing",
  grounding: "/tools/grounding",
  meditation: "/tools/meditation",
  habits: "/tools/habits",
};

export function routeForTool(toolId: SteppableToolId): Href {
  return TOOL_STEP_ROUTES[toolId];
}
