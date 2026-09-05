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
 * The steppable half of the distinct-tool universe: every steppable tool
 * except `dropAnchor`. Drop-anchor logs are a subset of connection logs
 * (dropping anchor IS connecting - see RoutineToolRecords), so counting both
 * would turn one saved log into two "distinct tools" and fire the offer at
 * the first action.
 *
 * Exported because the starter composes from it too (#1954): `STARTER_CANDIDATE_TOOLS`
 * is this list minus `habits`, so the gate and the composition read ONE set and
 * can no longer disagree the way the widget map let them.
 */
export const DISTINCT_STEPPABLE_TOOLS: readonly SteppableToolId[] = STEPPABLE_TOOL_IDS.filter(
  (tool) => tool !== "dropAnchor",
);

/**
 * Records of the three prompting tools a routine cannot admit - worry, anger
 * and self-care. Their saves request the reminder prompt like every other
 * tool's, so they are in-app actions in the glossary's sense, and they count
 * toward the second action (#1677, decided 2026-09-02): the offer is about
 * the person having acted twice, and the routine it offers is composed from
 * the STEPPABLE tools' records (#1954), never from these three - a routine
 * cannot hold them as steps. Existence is all the count reads,
 * so the element type is left open. The three lists are row-capped (worry and
 * anger at 500, self-care at its newest 14), never date-windowed, so any
 * record at all makes its list non-empty - unlike habits, nothing here can
 * undercount. Reading whole lists for an existence question is heavier than
 * needed, but bounded: the fetch runs once, for no-routine users only, on
 * the cache the list screens already share.
 */
export type OfferOnlyRecords = {
  worryEntries?: readonly unknown[];
  angerLogs?: readonly unknown[];
  selfCareLogs?: readonly unknown[];
};

// Same exhaustive-map shape as REQUIRED_SLICE_MAP below: a slice added to
// OfferOnlyRecords later is a compile error here, not a hole in the gate.
const OFFER_ONLY_SLICE_MAP: Record<keyof OfferOnlyRecords, true> = {
  worryEntries: true,
  angerLogs: true,
  selfCareLogs: true,
};

const OFFER_ONLY_SLICES = Object.keys(OFFER_ONLY_SLICE_MAP) as (keyof OfferOnlyRecords)[];

// Readiness gate: `RoutineToolRecords` cannot tell "still loading" from "no
// records" (absent slices derive as none existing), but the offer decision
// must not read a half-loaded shape - an in-flight fetch would undercount and
// silently drop an eligible save. A slice that errors stays undefined, which
// calmly resolves to "no offer" rather than a wrong one.
// A full Record over the slice keys, so a slice added to RoutineToolRecords
// later is a compile error here rather than a silent hole in the gate.
const REQUIRED_SLICE_MAP: Record<keyof RoutineToolRecords, true> = {
  moodLogs: true,
  journalEntries: true,
  gratitudeEntries: true,
  sleepLogs: true,
  thoughtRecords: true,
  mindfulnessSessions: true,
  meditationSessions: true,
  habitLogs: true,
  activityLogs: true,
  exposureSessions: true,
  defusionLogs: true,
  expansionLogs: true,
  urgeSurfLogs: true,
  connectionLogs: true,
  observingSelfSessions: true,
  bullsEyeSnapshots: true,
  choicePoints: true,
  committedActions: true,
  actionSteps: true,
};

const REQUIRED_SLICES = Object.keys(REQUIRED_SLICE_MAP) as (keyof RoutineToolRecords)[];

/**
 * True once every steppable-tool slice has been fetched - the readiness the
 * starter composition needs on its own (#1954): `/routines`' empty state fetches
 * the full steppable list and composes from it, with no offer-only slices in play.
 */
export function areToolRecordsReady(records: RoutineToolRecords): boolean {
  return REQUIRED_SLICES.every((slice) => records[slice] !== undefined);
}

/** True once every slice the distinct-tool count reads has been fetched. */
export function areOfferRecordsReady(
  records: RoutineToolRecords,
  offerOnly: OfferOnlyRecords,
): boolean {
  return (
    areToolRecordsReady(records) &&
    OFFER_ONLY_SLICES.every((slice) => offerOnly[slice] !== undefined)
  );
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
 * The distinct steppable tools with at least one record, in
 * {@link DISTINCT_STEPPABLE_TOOLS} order. This is the starter's input (#1954):
 * `buildStarterSteps(toolsWithRecords(records))`. The order here is the fixed
 * array's, never the records' recency, so the same person composes the same
 * routine on every visit.
 */
export function toolsWithRecords(records: RoutineToolRecords): SteppableToolId[] {
  return DISTINCT_STEPPABLE_TOOLS.filter((tool) => toolHasAnyRecord(tool, records));
}

/**
 * How many distinct tools have at least one record - steppable tools and the
 * three offer-only ones alike. Compared against {@link SECOND_ACTION_MIN} by
 * the host card: at two, the person has taken their second action and the
 * starter offer's moment has arrived.
 *
 * ⚠️ A SUPERSET of what the starter composes from, which is why a successful
 * composition already implies this gate (`SECOND_ACTION_MIN` = `STARTER_STEP_MIN`
 * = 2) - but not the other way round: the three offer-only tools, and `habits`,
 * count here and can never be steps, so the count can pass while the starter
 * composes `null`. Both callers check both.
 */
export function countToolsWithRecords(
  records: RoutineToolRecords,
  offerOnly: OfferOnlyRecords,
): number {
  const steppable = toolsWithRecords(records).length;
  const offerOnlyCount = OFFER_ONLY_SLICES.filter(
    (slice) => (offerOnly[slice] ?? []).length > 0,
  ).length;
  return steppable + offerOnlyCount;
}
