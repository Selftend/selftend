import { groundingSlugs } from "@/src/constants/grounding";
import { toLocalDateKey } from "@/src/utils/date";

// Pure client-side routine status derivation - the routines analogue of ACT's
// deriveActProgram/didOnDate engine (spec #37, ticket #40). Status is computed
// over already-fetched tool records plus a local-day key; nothing is persisted
// and no server RPC is involved.

/**
 * Tools a routine step can reference. Each already persists a per-day dated
 * record, which is what step completion is derived from.
 */
export type SteppableToolId =
  | "mood"
  | "journal"
  | "gratitude"
  | "sleep"
  | "cbt"
  | "breathing"
  | "grounding"
  | "meditation"
  | "habits";

export const STEPPABLE_TOOL_IDS: readonly SteppableToolId[] = [
  "mood",
  "journal",
  "gratitude",
  "sleep",
  "cbt",
  "breathing",
  "grounding",
  "meditation",
  "habits",
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
  moodLogs?: readonly { loggedAt: string }[];
  /** Older journal entries predate occurredAt; they bucket by createdAt. */
  journalEntries?: readonly { occurredAt?: string | null; createdAt: string }[];
  gratitudeEntries?: readonly { loggedAt: string }[];
  sleepLogs?: readonly { loggedAt: string }[];
  thoughtRecords?: readonly { createdAt: string }[];
  /**
   * Breathing AND grounding sessions share this table; they are told apart by
   * exerciseName (see stepDoneOnDate). completedAt is a UTC timestamp with no
   * device-offset column, so it buckets via the device's current timezone -
   * the same trade-off ACT's engine already makes.
   */
  mindfulnessSessions?: readonly { exerciseName: string; completedAt: string | null }[];
  meditationSessions?: readonly { completedAt: string | null }[];
  /** HabitLog.loggedOn is already a local civil date key (YYYY-MM-DD). */
  habitLogs?: readonly { loggedOn: string }[];
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

const onDay = <T>(
  items: readonly T[] | undefined,
  pick: (item: T) => string | null | undefined,
  dayKey: string,
): boolean =>
  (items ?? []).some((item) => {
    const ts = pick(item);
    return typeof ts === "string" && ts.length > 0 && toLocalDateKey(ts) === dayKey;
  });

// Grounding is the closed set of technique slugs; every other mindfulness
// session is a breathing session (built-in breathing slugs plus user-defined
// custom exercise ids, which cannot be enumerated statically).
const isGroundingSession = (exerciseName: string): boolean =>
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
    case "mood":
      return onDay(records.moodLogs, (r) => r.loggedAt, dayKey);
    case "journal":
      return onDay(records.journalEntries, (r) => r.occurredAt ?? r.createdAt, dayKey);
    case "gratitude":
      return onDay(records.gratitudeEntries, (r) => r.loggedAt, dayKey);
    case "sleep":
      return onDay(records.sleepLogs, (r) => r.loggedAt, dayKey);
    case "cbt":
      return onDay(records.thoughtRecords, (r) => r.createdAt, dayKey);
    case "breathing":
      return onDay(
        (records.mindfulnessSessions ?? []).filter((s) => !isGroundingSession(s.exerciseName)),
        (s) => s.completedAt,
        dayKey,
      );
    case "grounding":
      return onDay(
        (records.mindfulnessSessions ?? []).filter((s) => isGroundingSession(s.exerciseName)),
        (s) => s.completedAt,
        dayKey,
      );
    case "meditation":
      return onDay(records.meditationSessions, (s) => s.completedAt, dayKey);
    case "habits":
      // loggedOn is already a civil date key - compare directly, no bucketing.
      return (records.habitLogs ?? []).some((l) => l.loggedOn === dayKey);
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
