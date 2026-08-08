/**
 * Query-string forwarding for the permanent `<Redirect>` stubs left behind by a
 * route rename (#732, decided on #704).
 *
 * Expo Router cannot do this for us. Verified against expo-router 57.0.7, BOTH
 * of its redirect mechanisms drop the search params:
 *
 *   - `getRedirectModule` builds the target from `usePathname()`, which is
 *     documented as returning the path "without search parameters".
 *   - `mergeVariablesWithPath` (behind the config-plugin `redirects` prop)
 *     substitutes `[id]`-style variables but never re-appends the leftovers.
 *
 * That matters because the launcher widget deep-links into
 * `/tools/mood-tracker/new?score=N`, and a widget snapshot persisted by an
 * already-shipped build keeps minting the old path forever - this project has
 * no OTA channel, so there is no build in which every client is current. Losing
 * the query would land the user on a blank form with nothing preselected.
 *
 * Hand-rolled rather than `URLSearchParams`: React Native's built-in
 * `URLSearchParams.toString()` joins pairs without percent-encoding them, so a
 * value with `&`, `=` or a space would come back out wrong.
 */
export type SearchParamValue = string | string[] | undefined;

/**
 * Re-attaches `params` to `path` as a query string.
 *
 * `omit` exists for dynamic routes: `useLocalSearchParams()` returns the path
 * segments alongside the real query, so `[id]` would otherwise be forwarded as
 * both a path segment and `?id=...`.
 */
export function withSearchParams(
  path: string,
  params: Record<string, SearchParamValue>,
  omit: readonly string[] = [],
): string {
  const pairs: string[] = [];

  for (const [key, value] of Object.entries(params)) {
    if (omit.includes(key) || value === undefined) continue;

    for (const entry of Array.isArray(value) ? value : [value]) {
      if (typeof entry !== "string") continue;
      pairs.push(`${encodeURIComponent(key)}=${encodeURIComponent(entry)}`);
    }
  }

  return pairs.length > 0 ? `${path}?${pairs.join("&")}` : path;
}
