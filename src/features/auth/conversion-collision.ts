/**
 * One-shot handoff of an OAuth-conversion collision back into the conversion
 * form (#1445).
 *
 * On web, `linkIdentity` is a full-page PKCE redirect, so a 422
 * `identity_already_exists` surfaces as error params on `/auth-callback` -
 * a whole page away from the form that started the dance. The callback screen
 * records the collision here and lands on `/sign-up`; the conversion form
 * consumes it in a focus effect and renders the inline error + one-tap
 * "Sign in with Google instead".
 *
 * Same rules as `sign-in-prefill.ts`: consume-once, in-memory (never a query
 * param - sign-up must stay singular-safe), read only from effects. The
 * callback → sign-up hop is a client-side `router.replace` inside the app the
 * redirect already reloaded, so the value survives exactly as long as needed;
 * a later cold arrival starts clean.
 *
 * Only "google" is recordable today: Apple conversion links natively via
 * id-token, so its collision throws in-form and never travels.
 */
export type CollisionProvider = "google" | "apple";

let pendingProvider: CollisionProvider | null = null;

export function recordConversionCollision(provider: CollisionProvider) {
  pendingProvider = provider;
}

export function consumeConversionCollision(): CollisionProvider | null {
  const provider = pendingProvider;
  pendingProvider = null;
  return provider;
}
