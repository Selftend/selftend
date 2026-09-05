import type { SteppableToolId } from "@/src/features/routines/derive";
import { DISTINCT_STEPPABLE_TOOLS } from "@/src/features/routines/starter-offer";

// Pure builder for the declinable pre-composed starter routine (spec #37,
// "Onboarding starter routine"; recomposed by #1954, spec #1885 §5.3).
//
// The candidates are the steppable tools the person has RECORDS in - the same set
// the offer's own second-action gate walks (`toolsWithRecords` in starter-offer.ts)
// - and nothing else. It used to map the widget ids kept on the old Home
// dashboard; once onboarding stops seeding that table, a builder still reading it
// would compose `null` for every new account forever, with `verify` green and
// every seeded account working - which is exactly where it would be tested.
//
// Shared by the Routines-page empty-state offer (#45), the once-ever second-action
// card (#1677) and, until the wizard collapses, the onboarding panel (#46) through
// a local adapter there. The offer itself writes nothing; a routine is created only
// on an affirmative "Keep", through the normal repository write path.

/** Research-backed cap (#23): starter routines are 1-3 tiny steps. */
export const STARTER_STEP_CAP = 3;
/** A one-step "routine" is not a second-action bridge - below this, no offer. */
export const STARTER_STEP_MIN = 2;

/**
 * Every tool a starter may compose from, in the ONE order a starter is ever
 * composed in: `DISTINCT_STEPPABLE_TOOLS` minus `habits` - eighteen tools.
 *
 * - `habits` is a valid manual step but excluded from auto-composition (#31,
 *   2026-07-15). `dropAnchor` is absent from the distinct list already: a
 *   drop-anchor log IS a connection log, so it would be the same step twice.
 * - Module exercises ARE eligible (sub-decision 1, ratified on #1894), and the
 *   widening is self-limiting because of this order: the everyday tools come
 *   first, only `cbt`/`activities`/`exposure` precede breathing, grounding and
 *   meditation, and every pure-ACT exercise sits from position 12. With the cap
 *   at three, an exercise composes only for someone with too few everyday-tool
 *   records to fill three slots - the CBT/ACT-centred person the old map never
 *   offered anything to.
 *
 * ☠️ Fixed order, NEVER recency. Ordering by the newest record would make the
 * same surface show a different routine on different visits, the shape
 * `docs/product-principles.md` §12 refuses. It also needs no `position` column
 * anywhere, which `favorites` does not have - and a star is not a signal for a
 * routine in any case: it means "show this on Home", not "I do this".
 */
export const STARTER_CANDIDATE_TOOLS: readonly SteppableToolId[] = DISTINCT_STEPPABLE_TOOLS.filter(
  (tool) => tool !== "habits",
);

/**
 * Compose the starter's steps from the steppable tools the person has records in.
 * Returns the first {@link STARTER_STEP_CAP} candidates in {@link STARTER_CANDIDATE_TOOLS}
 * order - the caller's order is discarded - or `null` when fewer than
 * {@link STARTER_STEP_MIN} candidates have records, in which case no offer is shown.
 */
export function buildStarterSteps(
  toolsWithRecords: readonly SteppableToolId[],
): SteppableToolId[] | null {
  const tools = STARTER_CANDIDATE_TOOLS.filter((tool) => toolsWithRecords.includes(tool)).slice(
    0,
    STARTER_STEP_CAP,
  );
  return tools.length >= STARTER_STEP_MIN ? tools : null;
}
