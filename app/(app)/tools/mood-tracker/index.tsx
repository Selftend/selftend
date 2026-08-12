import { Redirect, useLocalSearchParams, type Href } from "expo-router";

import { withSearchParams } from "@/src/lib/legacy-redirect";

/**
 * Permanent compatibility stub for the pre-#732 check-in path.
 *
 * Permanent, not transitional: this project has no OTA channel (no
 * `expo-updates`, no `runtimeVersion`), so every client change ships as a store
 * release with an unbounded tail of users who never update. Bookmarks, the
 * launcher widget's persisted snapshot and reminders scheduled on an old build
 * all keep pointing here forever. Precedent: `app/(app)/tools/act.tsx`, kept
 * since May 2026.
 *
 * The reminder edge function deliberately still mints this path - see the guard
 * test in `test/check-in-route-compat.test.tsx`.
 */
export default function LegacyMoodTrackerRedirect() {
  const params = useLocalSearchParams();

  return <Redirect href={withSearchParams("/tools/check-in", params) as Href} />;
}
