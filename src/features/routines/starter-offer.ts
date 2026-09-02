import {
  isGroundingSession,
  STEPPABLE_TOOL_IDS,
  type RoutineToolRecords,
  type SteppableToolId,
} from "@/src/features/routines/derive";

// Pure eligibility helpers for the once-ever starter-routine offer at the
// second action (#1677, decided in #1663). The glossary names a routine "the
// second-action bridge"; this module derives whether the person has reached
// that moment - records in a second distinct tool - from already-fetched
// records, storing nothing (#952). The only persisted state is the
// `starterRoutineOffered` shown-flag the host card writes on show.

/** The glossary's second action: the offer needs records in two distinct tools. */
export const SECOND_ACTION_MIN = 2;

/**
 * The distinct-tool universe: every steppable tool except `dropAnchor`.
 * Drop-anchor logs are a subset of connection logs (dropping anchor IS
 * connecting - see RoutineToolRecords), so counting both would turn one saved
 * log into two "distinct tools" and fire the offer at the first action.
 */
const DISTINCT_TOOLS: readonly SteppableToolId[] = STEPPABLE_TOOL_IDS.filter(
  (tool) => tool !== "dropAnchor",
);

// Readiness gate: `RoutineToolRecords` cannot tell "still loading" from "no
// records" (absent slices derive as none existing), but the offer decision
// must not read a half-loaded shape - an in-flight fetch would undercount and
// silently drop an eligible save. A slice that errors stays undefined, which
// calmly resolves to "no offer" rather than a wrong one.
const REQUIRED_SLICES: readonly (keyof RoutineToolRecords)[] = [
  "moodLogs",
  "journalEntries",
  "gratitudeEntries",
  "sleepLogs",
  "thoughtRecords",
  "mindfulnessSessions",
  "meditationSessions",
  "habitLogs",
  "activityLogs",
  "exposureSessions",
  "defusionLogs",
  "expansionLogs",
  "urgeSurfLogs",
  "connectionLogs",
  "observingSelfSessions",
  "bullsEyeSnapshots",
  "choicePoints",
  "committedActions",
  "actionSteps",
];

/** True once every slice the distinct-tool count reads has been fetched. */
export function areOfferRecordsReady(records: RoutineToolRecords): boolean {
  return REQUIRED_SLICES.every((slice) => records[slice] !== undefined);
}

// Existence twin of derive's stepDoneOnDate: the same slice mapping and the
// same splits, minus the day filter. Kept beside the count instead of in
// derive.ts because "has any record ever" is an offer-eligibility question,
// not a routine-status one.
function toolHasAnyRecord(toolId: SteppableToolId, records: RoutineToolRecords): boolean {
  switch (toolId) {
    case "mood":
      return (records.moodLogs ?? []).length > 0;
    case "journal":
      return (records.journalEntries ?? []).length > 0;
    case "gratitude":
      return (records.gratitudeEntries ?? []).length > 0;
    case "sleep":
      return (records.sleepLogs ?? []).length > 0;
    case "cbt":
      return (records.thoughtRecords ?? []).length > 0;
    case "breathing":
      return (records.mindfulnessSessions ?? []).some((s) => !isGroundingSession(s.exerciseName));
    case "grounding":
      return (records.mindfulnessSessions ?? []).some((s) => isGroundingSession(s.exerciseName));
    case "meditation":
      return (records.meditationSessions ?? []).length > 0;
    case "habits":
      // useRoutineToolRecords fetches habit logs over the 7-day strip window,
      // so an older-only habit history reads as recordless here. That biases
      // the count DOWN - the offer can only arrive later, never wrongly.
      return (records.habitLogs ?? []).length > 0;
    case "activities":
      // Completion only, matching stepDoneOnDate: a scheduled-but-never-done
      // activity is planning, not a second action.
      return (records.activityLogs ?? []).some((a) => a.completedDayKey !== null);
    case "exposure":
      return (records.exposureSessions ?? []).some((s) => s.completedAt !== null);
    case "defusion":
      return (records.defusionLogs ?? []).length > 0;
    case "expansion":
      return (records.expansionLogs ?? []).length > 0;
    case "urgeSurf":
      return (records.urgeSurfLogs ?? []).some((s) => s.completedAt !== null);
    case "connection":
      // ALL connection logs count, technique "dropAnchor" included - the
      // subset relation is why dropAnchor is absent from DISTINCT_TOOLS.
      return (records.connectionLogs ?? []).length > 0;
    case "dropAnchor":
      return (records.connectionLogs ?? []).some((r) => r.technique === "dropAnchor");
    case "observingSelf":
      return (records.observingSelfSessions ?? []).length > 0;
    case "bullsEye":
      return (records.bullsEyeSnapshots ?? []).length > 0;
    case "choicePoint":
      return (records.choicePoints ?? []).length > 0;
    case "committedAction":
      return (records.committedActions ?? []).length > 0 || (records.actionSteps ?? []).length > 0;
  }
}

/**
 * How many distinct tools have at least one record. Compared against
 * {@link SECOND_ACTION_MIN} by the host card: at two, the person has taken
 * their second action and the starter offer's moment has arrived.
 */
export function countToolsWithRecords(records: RoutineToolRecords): number {
  return DISTINCT_TOOLS.filter((tool) => toolHasAnyRecord(tool, records)).length;
}
