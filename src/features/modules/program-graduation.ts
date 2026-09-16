/**
 * Is this person a graduate OF THE RUN THEY ARE IN?
 *
 * ☠️ `*_program_completed_at` is NOT a flag for "currently graduated". Since
 * ADR-0012 it means **the last time this person finished this programme**, and
 * it survives `startProgram`, `abandonProgram` and `replayProgram` on purpose -
 * so `completedAt != null` is no longer the test. A person who graduated and
 * started again still carries the old completion, and the bare null check would
 * show their fresh run as already finished.
 *
 * The test is `completedAt >= startedAt`, and it is exact rather than a
 * heuristic: `advancePhase` at the last phase writes only `completedAt` and
 * never touches `startedAt`, so a replay's fresh `startedAt` retires an older
 * completion by itself.
 *
 * ⚠️ Keep every caller on this function rather than inlining the comparison.
 * The rule is subtle enough that a fourth copy will drift, and the widget's RPC
 * gate already drifted once by reading the raw preference fields instead of the
 * derivation.
 */
export function isGraduated(
  startedAt: string | null | undefined,
  completedAt: string | null | undefined,
): boolean {
  if (!startedAt || !completedAt) return false;
  const started = Date.parse(startedAt);
  const completed = Date.parse(completedAt);
  // An unparseable timestamp yields NaN, and every NaN comparison is false, so
  // a corrupt value reads as "not graduated" rather than silently graduating a
  // run that never finished.
  return completed >= started;
}
