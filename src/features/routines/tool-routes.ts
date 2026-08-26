import type { Href } from "expo-router";

import type { SteppableToolId } from "@/src/features/routines/derive";

/**
 * Where the continue-sheet's "Do next step" CTA sends the user, per steppable
 * tool: the surface where the qualifying dated record is created (the tool's
 * `/new` form) or, for the session tools, the picker that starts a session
 * (sessions persist their record on completion). Breathing's own `/new` route
 * is the custom-exercise EDITOR, not a session, so it routes to the picker.
 *
 * Tools whose qualifying record is logged against an EXISTING entity route to
 * their list instead of `/new`: activities complete from an activity's detail
 * (`/new` merely schedules one), exposure sessions are logged inside a
 * hierarchy, and committed-action progress is an update to an action you
 * already have - the same list-first shape habits uses.
 */
export const TOOL_STEP_ROUTES: Record<SteppableToolId, Href> = {
  mood: "/tools/check-in/new",
  journal: "/tools/journal/new",
  gratitude: "/tools/gratitude-log/new",
  sleep: "/tools/sleep/new",
  cbt: "/modules/cbt/new",
  activities: "/modules/cbt/activities",
  exposure: "/modules/cbt/exposure",
  breathing: "/tools/breathing",
  grounding: "/tools/grounding",
  meditation: "/tools/meditation",
  habits: "/tools/habits",
  defusion: "/modules/act/defusion/new",
  expansion: "/modules/act/expansion/new",
  // The guided urge-surf screen saves the log itself (expansion's sibling).
  urgeSurf: "/modules/act/expansion/urge-surfing",
  connection: "/modules/act/connection/new",
  // Guided screen; saves a ConnectionLog with technique "dropAnchor".
  dropAnchor: "/modules/act/connection/drop-anchor",
  observingSelf: "/modules/act/observing-self/new",
  // The alignment check-in, which saves the dated snapshot on "Save ratings". It sits
  // on the values screen since #1379; the old `/values/bulls-eye` route still resolves,
  // but a routine step should land on the screen the user actually rates from rather
  // than take a redirect hop to get there.
  bullsEye: "/modules/act/values",
  choicePoint: "/modules/act/choice-point/new",
  committedAction: "/modules/act/committed-action",
};

export function routeForTool(toolId: SteppableToolId): Href {
  return TOOL_STEP_ROUTES[toolId];
}
