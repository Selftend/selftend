import { STEPPABLE_TOOL_IDS, isSteppableToolId } from "@/src/features/routines/derive";
import type { SteppableToolId } from "@/src/features/routines/derive";

/**
 * Which steppable tool ids a routine step may be WRITTEN with today (#2203).
 *
 * ☠️☠️ **The read vocabulary and the write vocabulary are not the same set, and
 * they must not become the same set on the day a new tool is admitted.**
 * `routine_steps.tool_id` is a value one client writes and a DIFFERENT client
 * reads, and those are not the same build: the release workflow deploys the
 * database and the web client the moment a promotion merges
 * (`.github/workflows/release.yml` runs `deploy-web` in parallel with
 * `deploy-android` / `deploy-ios`), while the store builds sit behind Google
 * review and a manual TestFlight promotion for days. For the whole length of
 * that window a row composed on the web is read by a phone still running the
 * PREVIOUS release - a client with no route, no done-predicate and no label
 * for an id it has never heard of.
 *
 * The shipped 0.17.0 client's failure shape, read off `origin/main` rather
 * than guessed:
 *
 * - `tool-routes.ts` `routeForTool` is a bare index into a `Record` keyed by
 *   the ids it knows, so an unknown id yields `undefined`; the continue
 *   sheet's "Do next step" hands that straight to `pushWithOrigin`, whose
 *   first statement dereferences `href.pathname` - an uncaught `TypeError`
 *   thrown from a press handler, which no React error boundary can catch.
 * - `derive.ts` `stepDoneOnDate` switches with no `default`, so an unknown id
 *   returns `undefined` for a declared `boolean`: the step can never be
 *   ticked, the routine can never reach "complete", and the globally mounted
 *   routine FAB stays pinned open counting a step the person cannot finish.
 * - `routines.json` has no `tools.<id>` entry, so the step reads on screen as
 *   the raw key.
 *
 * None of that is patchable after the fact - 0.17.0 is already on people's
 * phones. The only lever left is what the new client and the database ALLOW
 * to be written while it is still out there, which is what this module names.
 *
 * The rule, therefore: a newly admitted tool id lands here first and moves out
 * only once the native build that understands it has actually rolled out.
 * Widening is a two-step release, in this order:
 *
 * 1. ship the client that READS the id - already done for DBT, whose routes,
 *    predicates and labels are all present - leaving it withheld from writing;
 * 2. once that build is live on both stores, drop the id from
 *    {@link WITHHELD_STEP_TOOL_IDS} **and** add it to the database allowlist
 *    in a new migration. `step-tool-rollout.test.ts` fails when those two
 *    disagree, so neither half can ship alone.
 */
export const WITHHELD_STEP_TOOL_IDS: readonly SteppableToolId[] = [
  // The six DBT tools (#1980). Admitted to the read vocabulary by that delta;
  // withheld from writing until the native build carrying `/modules/dbt/*`
  // has rolled out past review.
  "muscleRelaxation",
  "wiseMind",
  "judgement",
  "emotionRecord",
  "oppositeAction",
  "script",
];

/**
 * The steppable ids a routine step may carry today: every steppable tool that
 * is not withheld, in {@link STEPPABLE_TOOL_IDS} order. This is the set the
 * database CHECK constraint mirrors, in
 * `supabase/migrations/20260911000000_routine_step_tool_allowlist.sql`.
 */
export const WRITABLE_STEP_TOOL_IDS: readonly SteppableToolId[] = STEPPABLE_TOOL_IDS.filter(
  (tool) => !(WITHHELD_STEP_TOOL_IDS as readonly string[]).includes(tool),
);

/**
 * Is `value` a steppable tool id a step may be written with right now? Reads
 * stay deliberately permissive - {@link isSteppableToolId} is still the read
 * predicate, so a row written by a later client, or one already in the table
 * from before this guard, renders and completes normally here.
 */
export function isWritableStepToolId(value: string): value is SteppableToolId {
  return isSteppableToolId(value) && !(WITHHELD_STEP_TOOL_IDS as readonly string[]).includes(value);
}
