export type SessionStatus = "loading" | "ready";

/**
 * Where the session provider starts before its first `getSession` answer.
 *
 * - No Supabase client: nothing to wait for, so `"ready"`.
 * - A client, in a browser: `"loading"` until the stored session resolves,
 *   so a signed-in visitor is never shown the signed-out tree and a gated
 *   screen never bounces them to the landing page.
 * - A client, and no `window`: the static export (#2293). `expo export`
 *   renders every route in Node, where there is no browser and can be no
 *   session; seeding `"ready"` there is what makes `/` prerender as the
 *   landing page instead of the loading spinner. Effects never run in that
 *   render, so nothing is fetched and no guest is minted at export.
 */
export function seedSessionStatus({
  hasClient,
  hasWindow,
}: {
  hasClient: boolean;
  hasWindow: boolean;
}): SessionStatus {
  return hasClient && hasWindow ? "loading" : "ready";
}
