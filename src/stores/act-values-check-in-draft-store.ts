import type { ACTLifeDomain } from "@/src/features/act/types";
import { createDraftStore } from "@/src/stores/create-draft-store";

/** The four in-progress alignment ratings of the values check-in. */
export type ActValuesCheckInDraft = Record<ACTLifeDomain, number | null>;

/**
 * The values check-in's unsaved ratings.
 *
 * ☠️ This exists because of the navigation guard, not for convenience. The check-in
 * used to live on its own route, which was left plain (never `dangerouslySingular`)
 * precisely because it held unsaved ratings: re-entering it remounted it and the user
 * got a clean slate rather than someone's half-finished check-in. Folded onto
 * `/modules/act/values`, it inherits that route's single-instance marking - correct
 * for a list screen, and it means the ratings now live across a reuse. Holding them
 * here rather than in `useState` makes that survival deliberate: the user's own
 * numbers come back, and `createDraftStore` registers with the draft-store registry so
 * sign-out clears them along with every other resident draft (they are health data).
 *
 * One draft, so it never needs an entity id: `hydrate()` targets the null draft.
 */
export const useActValuesCheckInDraftStore = createDraftStore<ActValuesCheckInDraft>();
