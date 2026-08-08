import { Redirect, useLocalSearchParams, type Href } from "expo-router";

import { withSearchParams } from "@/src/lib/legacy-redirect";

/**
 * Permanent compatibility stub for the pre-#732 check-in path (see
 * `./index.tsx` for why it never comes out).
 *
 * This is the one stub with a live query string behind it: the launcher widget
 * deep-links `?score=N`, and a snapshot persisted by an already-shipped build
 * keeps minting this path. Expo Router drops search params on both of its own
 * redirect mechanisms, so `withSearchParams` re-appends them by hand.
 */
export default function LegacyNewMoodEntryRedirect() {
  const params = useLocalSearchParams();

  return <Redirect href={withSearchParams("/tools/check-in/new", params) as Href} />;
}
