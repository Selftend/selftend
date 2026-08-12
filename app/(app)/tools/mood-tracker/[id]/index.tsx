import { Redirect, useLocalSearchParams, type Href } from "expo-router";

import { withSearchParams } from "@/src/lib/legacy-redirect";

/**
 * Permanent compatibility stub for the pre-#732 check-in path (see
 * `../index.tsx` for why it never comes out).
 *
 * `id` is omitted from the forwarded query: `useLocalSearchParams()` returns
 * the dynamic path segments alongside the real search params, so without the
 * omission the entry id would arrive as both a path segment and `?id=`.
 */
export default function LegacyMoodEntryRedirect() {
  const params = useLocalSearchParams();
  const id = typeof params.id === "string" ? params.id : null;
  const target = id ? `/tools/check-in/${encodeURIComponent(id)}` : "/tools/check-in";

  return <Redirect href={withSearchParams(target, params, ["id"]) as Href} />;
}
