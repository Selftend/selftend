import { groundingSlugs } from "@/src/constants/grounding";
import { toLocalDateKey } from "@/src/utils/date";

// Pure client-side routine status derivation - the routines analogue of ACT's
// deriveActProgram/didOnDate engine (spec #37, ticket #40). Status is computed
// over already-fetched tool records plus a local-day key; nothing is persisted
// and no server RPC is involved.

/**
 * Tools a routine step can reference. Each already persists a per-day dated
 * record, which is what step completion is derived from (#123 admission rule:
 * any tool with a dated record qualifies - admission is not prescription).
 */
export type SteppableToolId =
  | "mood"
  | "journal"
  | "gratitude"
  | "sleep"
  | "cbt"
  | "activities"
  | "exposure"
  | "breathing"
  | "grounding"
  | "meditation"
  | "habits"
  | "defusion"
  | "expansion"
  | "urgeSurf"
  | "connection"
  | "dropAnchor"
  | "observingSelf"
  | "bullsEye"
  | "choicePoint"
  | "committedAction"
  | "muscleRelaxation"
  | "wiseMind"
  | "judgement"
  | "emotionRecord"
  | "oppositeAction"
  | "script";

export const STEPPABLE_TOOL_IDS: readonly SteppableToolId[] = [
  "mood",
  "journal",
  "gratitude",
  "sleep",
  "cbt",
  "activities",
  "exposure",
  "breathing",
  "grounding",
  "meditation",
  "habits",
  "defusion",
  "expansion",
  "urgeSurf",
  "connection",
  "dropAnchor",
  "observingSelf",
  "bullsEye",
  "choicePoint",
  "committedAction",
  "muscleRelaxation",
  "wiseMind",
  "judgement",
  "emotionRecord",
  "oppositeAction",
  "script",
];

export function isSteppableToolId(value: string): value is SteppableToolId {
  return (STEPPABLE_TOOL_IDS as readonly string[]).includes(value);
}

/**
 * The slices of already-fetched tool data the engine reads. Shapes are the
 * minimal structural subsets of the owning features' types, so the queries
 * layer can pass its records straight through. All slices are optional -
 * absent means "no records fetched", which derives the same as none existing.
 */
export interface RoutineToolRecords {
  /**
   * The four #250 modules carry a captured `dayKey` — the civil day where the
   * entry was logged — so they are compared directly, never re-bucketed. Passing
   * a timestamp here instead would let the routine engine file an entry under a
   * different day than the owning module's own screen does.
   */
  moodLogs?: readonly { dayKey: string }[];
  journalEntries?: readonly { dayKey: string }[];
  gratitudeEntries?: readonly { dayKey: string }[];
  sleepLogs?: readonly { dayKey: string }[];
  /** Thought records captured their civil day in #330 - compare, never re-bucket. */
  thoughtRecords?: readonly { dayKey: string }[];
  /**
   * Breathing AND grounding sessions share this table; they are told apart by
   * exerciseName (see stepDoneOnDate). One captured offset on the shared table
   * gives both tools a dayKey, so neither re-buckets by the viewer's day (#330).
   */
  mindfulnessSessions?: readonly { exerciseName: string; dayKey: string }[];
  /** Meditation captured its civil day in #330 - compare, never re-bucket. */
  meditationSessions?: readonly { dayKey: string }[];
  /** HabitLog.loggedOn is already a local civil date key (YYYY-MM-DD). */
  habitLogs?: readonly { loggedOn: string }[];
  /**
   * Behavioural activation (CBT Activities): only completion counts - an
   * activity can be created/scheduled days before it is done, so the planned day
   * would celebrate planning, not doing. `completedDayKey` is the captured civil
   * day it was DONE on, and is null until then (#330).
   */
  activityLogs?: readonly { completedDayKey: string | null }[];
  /** ExposureSession.completedAt is set at save time (non-null in practice). */
  exposureSessions?: readonly { completedAt: string | null }[];
  defusionLogs?: readonly { createdAt: string }[];
  expansionLogs?: readonly { createdAt: string }[];
  /** Urge surf sessions stamp completedAt on save (guided screen). */
  urgeSurfLogs?: readonly { completedAt: string | null }[];
  /**
   * Connection AND drop-anchor steps read this slice: the guided drop-anchor
   * screen saves a ConnectionLog with technique "dropAnchor" (it has no table
   * of its own). Unlike breathing/grounding - which split their shared table
   * exclusively - dropAnchor is a subset of connection: a drop-anchor log
   * completes BOTH step kinds, because dropping anchor IS connecting.
   */
  connectionLogs?: readonly { technique: string; createdAt: string }[];
  observingSelfSessions?: readonly { createdAt: string }[];
  /** reviewedAt is the check-in's own dated field (createdAt mirrors it). */
  bullsEyeSnapshots?: readonly { reviewedAt: string }[];
  choicePoints?: readonly { createdAt: string }[];
  /**
   * Committed action derives from "any progress update logged today" (#123
   * decision): creating/patching an action bumps its createdAt/updatedAt, and
   * adding or ticking an action step dates the step - any of the four counts.
   */
  committedActions?: readonly { createdAt: string; updatedAt: string }[];
  actionSteps?: readonly { createdAt: string; completedAt: string | null }[];
  /**
   * DBT is born in the captured frame (#1980): every one of these rows
   * carries the civil day its own repository resolved, so all six compare
   * and none is ever re-bucketed here. There is no `onDay` leg in this
   * module - passing a timestamp would let a routine file an entry under a
   * different day than the DBT screen that wrote it.
   *
   * Muscle relaxation is the only DBT session kind, but the slice still
   * carries `sessionSlug` so a second one cannot silently tick this step.
   */
  dbtSessions?: readonly { sessionSlug: string; dayKey: string }[];
  dbtWiseMindCheckins?: readonly { dayKey: string }[];
  dbtJudgements?: readonly { dayKey: string }[];
  dbtEmotionRecords?: readonly { dayKey: string }[];
  /**
   * ☠️ The DONE day, never the created one. A plan written on Monday and
   * carried out on Thursday is Thursday's practice; `doneDayKey` is null
   * while it is open, so an unfinished plan can never match a real day.
   * Writing an opposite action down is not doing it.
   */
  dbtOppositeActionPlans?: readonly { doneDayKey: string | null }[];
  /**
   * ⚠️ The CREATED day, unlike the plan above. A script's own follow-through
   * is a later, separate fact the module tracks; the routine step is about
   * sitting down and writing what you want to say, which is what `dayKey`
   * dates. The two DBT tables differ here because their steps differ.
   */
  dbtScripts?: readonly { dayKey: string }[];
}

export type RoutineStatus = "not_started" | "in_progress" | "complete";

export interface RoutineStepDayView {
  toolId: SteppableToolId;
  done: boolean;
}

export interface RoutineDayView {
  status: RoutineStatus;
  steps: RoutineStepDayView[];
  doneCount: number;
  totalCount: number;
  /** First not-done step in routine order (order is advisory), else null. */
  nextStep: RoutineStepDayView | null;
}

/**
 * For tools with no captured occurrence day: bucket a UTC timestamp through the
 * viewer's current timezone. Correct only while the tool stores no offset - the
 * modules still waiting on #330. Never use this for a module that already
 * carries `dayKey`, or the engine will re-bucket an entry the owning module has
 * already placed, and the two surfaces will disagree about which day it was.
 */
const onDay = <T>(
  items: readonly T[] | undefined,
  pick: (item: T) => string | null | undefined,
  dayKey: string,
): boolean =>
  (items ?? []).some((item) => {
    const ts = pick(item);
    return typeof ts === "string" && ts.length > 0 && toLocalDateKey(ts) === dayKey;
  });

/** For tools that captured the civil day at logging time - compare, never convert. */
const onCapturedDay = (items: readonly { dayKey: string }[] | undefined, dayKey: string): boolean =>
  (items ?? []).some((item) => item.dayKey === dayKey);

// Grounding is the closed set of technique slugs; every other mindfulness
// session is a breathing session (built-in breathing slugs plus user-defined
// custom exercise ids, which cannot be enumerated statically). Exported so the
// starter-offer's distinct-tool count splits the shared table by the same rule.
export const isGroundingSession = (exerciseName: string): boolean =>
  (groundingSlugs as readonly string[]).includes(exerciseName);

/**
 * didOnDate-style predicate: did the user complete `toolId`'s dated action on
 * the local day `dayKey`, given the fetched records?
 */
export function stepDoneOnDate(
  toolId: SteppableToolId,
  records: RoutineToolRecords,
  dayKey: string,
): boolean {
  switch (toolId) {
    // The four #250 modules carry a captured dayKey - compare directly, no
    // bucketing, so the routine engine agrees with the module's own screen.
    case "mood":
      return onCapturedDay(records.moodLogs, dayKey);
    case "journal":
      return onCapturedDay(records.journalEntries, dayKey);
    case "gratitude":
      return onCapturedDay(records.gratitudeEntries, dayKey);
    case "sleep":
      return onCapturedDay(records.sleepLogs, dayKey);
    case "cbt":
      return onCapturedDay(records.thoughtRecords, dayKey);
    // Breathing and grounding share mindfulness_sessions and so share its captured
    // dayKey; only the exercise_name split differs (#330).
    case "breathing":
      return onCapturedDay(
        (records.mindfulnessSessions ?? []).filter((s) => !isGroundingSession(s.exerciseName)),
        dayKey,
      );
    case "grounding":
      return onCapturedDay(
        (records.mindfulnessSessions ?? []).filter((s) => isGroundingSession(s.exerciseName)),
        dayKey,
      );
    case "meditation":
      // Meditation joined the captured-day group in #330 - same rule as above.
      return onCapturedDay(records.meditationSessions, dayKey);
    case "habits":
      // loggedOn is already a civil date key - compare directly, no bucketing.
      return (records.habitLogs ?? []).some((l) => l.loggedOn === dayKey);
    case "activities":
      // Completion only: a scheduled-but-not-done activity stays open, so its null
      // completedDayKey can never match a real day key. Captured day - compare,
      // never re-bucket, or the engine and the activities screen disagree (#330).
      return (records.activityLogs ?? []).some((a) => a.completedDayKey === dayKey);
    case "exposure":
      return onDay(records.exposureSessions, (s) => s.completedAt, dayKey);
    case "defusion":
      return onDay(records.defusionLogs, (r) => r.createdAt, dayKey);
    case "expansion":
      return onDay(records.expansionLogs, (r) => r.createdAt, dayKey);
    case "urgeSurf":
      return onDay(records.urgeSurfLogs, (r) => r.completedAt, dayKey);
    case "connection":
      // ALL connection logs count, including technique "dropAnchor" - see the
      // RoutineToolRecords comment (dropAnchor is a subset, not a split).
      return onDay(records.connectionLogs, (r) => r.createdAt, dayKey);
    case "dropAnchor":
      return onDay(
        (records.connectionLogs ?? []).filter((r) => r.technique === "dropAnchor"),
        (r) => r.createdAt,
        dayKey,
      );
    case "observingSelf":
      return onDay(records.observingSelfSessions, (r) => r.createdAt, dayKey);
    case "bullsEye":
      return onDay(records.bullsEyeSnapshots, (r) => r.reviewedAt, dayKey);
    case "choicePoint":
      return onDay(records.choicePoints, (r) => r.createdAt, dayKey);
    case "committedAction":
      // "Any progress update logged today = done today" (#123): a new or
      // patched action, a new step, or a step ticked complete all qualify.
      return (
        onDay(records.committedActions, (a) => a.createdAt, dayKey) ||
        onDay(records.committedActions, (a) => a.updatedAt, dayKey) ||
        onDay(records.actionSteps, (s) => s.createdAt, dayKey) ||
        onDay(records.actionSteps, (s) => s.completedAt, dayKey)
      );
    // DBT (#1980). Every leg is `onCapturedDay`: the module captured an
    // offset on every dated column from its first migration, so none of
    // these re-buckets by the viewer's timezone.
    case "muscleRelaxation":
      return onCapturedDay(
        (records.dbtSessions ?? []).filter((s) => s.sessionSlug === "muscle-relaxation"),
        dayKey,
      );
    case "wiseMind":
      return onCapturedDay(records.dbtWiseMindCheckins, dayKey);
    case "judgement":
      return onCapturedDay(records.dbtJudgements, dayKey);
    case "emotionRecord":
      return onCapturedDay(records.dbtEmotionRecords, dayKey);
    case "oppositeAction":
      // Done day only - see the slice comment. A null doneDayKey never
      // matches, so an open plan leaves the step open.
      return (records.dbtOppositeActionPlans ?? []).some((p) => p.doneDayKey === dayKey);
    case "script":
      return onCapturedDay(records.dbtScripts, dayKey);
  }
}

/**
 * Derive a routine's day status from its ordered steps and the fetched
 * records. No "failed" state and no streaks by design; an empty routine is
 * "not_started" (a hollow routine must not celebrate as complete).
 */
export function deriveRoutine(
  steps: readonly { toolId: SteppableToolId }[],
  records: RoutineToolRecords,
  dayKey: string,
): RoutineDayView {
  const stepViews = steps.map((step) => ({
    toolId: step.toolId,
    done: stepDoneOnDate(step.toolId, records, dayKey),
  }));
  const doneCount = stepViews.filter((s) => s.done).length;
  const totalCount = stepViews.length;

  const status: RoutineStatus =
    totalCount === 0 || doneCount === 0
      ? "not_started"
      : doneCount === totalCount
        ? "complete"
        : "in_progress";

  return {
    status,
    steps: stepViews,
    doneCount,
    totalCount,
    nextStep: stepViews.find((s) => !s.done) ?? null,
  };
}

export interface RoutineStripDay {
  dayKey: string;
  complete: boolean;
}

/**
 * The multi-day view behind the last-7-days strip (spec #37, ticket #49): one
 * entry per requested local day key, `complete` only when that day's derived
 * status is "complete". Each day is an independent fact - deliberately no
 * streaks, no run lengths, no "broken" state.
 */
export function deriveRoutineStrip(
  steps: readonly { toolId: SteppableToolId }[],
  records: RoutineToolRecords,
  dayKeys: readonly string[],
): RoutineStripDay[] {
  return dayKeys.map((dayKey) => ({
    dayKey,
    complete: deriveRoutine(steps, records, dayKey).status === "complete",
  }));
}
