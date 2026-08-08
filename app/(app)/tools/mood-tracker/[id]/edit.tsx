import { Redirect, useLocalSearchParams, type Href } from "expo-router";

import { withSearchParams } from "@/src/lib/legacy-redirect";

/**
 * Permanent compatibility stub for the pre-#732 check-in path (see
 * `../index.tsx` for why it never comes out).
 *
 * A missing `id` falls back to the check-in home rather than `/edit` on a
 * pathless entry, which would render the editor with nothing to edit.
 */
export default function LegacyEditMoodEntryRedirect() {
  const params = useLocalSearchParams();
  const id = typeof params.id === "string" ? params.id : null;
  const target = id ? `/tools/check-in/${encodeURIComponent(id)}/edit` : "/tools/check-in";

  return <Redirect href={withSearchParams(target, params, ["id"]) as Href} />;
}
