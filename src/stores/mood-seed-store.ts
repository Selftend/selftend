import { create } from "zustand";

interface MoodSeedState {
  /** The score home's `Right now` card wants the next new check-in to open with. */
  score: number | null;
  seedMoodScore: (score: number) => void;
  /** Read the seed and clear it in one step, so it can never be applied twice. */
  consumeMoodSeed: () => number | null;
}

/**
 * Home's inline mood tap, carried in memory rather than in the URL (#952, #961).
 *
 * The obvious implementation is a route param — `/tools/check-in/new?score=3` — and it
 * is the one home used to use. Expo Router serializes params into the address bar on
 * web, so the user's **mood score** lands in browser history, in any URL the platform
 * logs. Sentry itself is covered since #996 - `scrubBreadcrumb` in `src/lib/sentry.ts`
 * strips the query string off navigation breadcrumbs - but that backstop exists for the
 * launcher paths shipped builds keep minting, and the address bar is not covered by it.
 * Putting health data on a route is still health data leaving the form data path.
 *
 * #739 rejected exactly this shape for the check-in's *emotions* on the same route and
 * built [[thought-record-seed-store]]; it fixed emotions and left the score behind. This
 * is the score's half of that fix.
 *
 * Deliberately NOT persisted. A survivor of an app restart would prefill a check-in from
 * a tap the user abandoned days ago, and `consumeMoodSeed` clears on read for the same
 * reason — navigating back out of the form and in again should start empty.
 *
 * ⚠️ A tap seeds and navigates; it never writes. An accidental brush on a scrollable
 * home would otherwise record health data, and an undo that has to survive a navigation
 * is not an undo.
 */
export const useMoodSeedStore = create<MoodSeedState>((set, get) => ({
  score: null,
  seedMoodScore: (score) => set({ score }),
  consumeMoodSeed: () => {
    const { score } = get();
    if (score !== null) set({ score: null });
    return score;
  },
}));

/** Plain-function entry point, for call sites that are event handlers rather than hooks. */
export function seedMoodScore(score: number) {
  useMoodSeedStore.getState().seedMoodScore(score);
}

/** Plain-function read-and-clear, for the `useState` initializer that consumes it once. */
export function consumeMoodSeed(): number | null {
  return useMoodSeedStore.getState().consumeMoodSeed();
}
