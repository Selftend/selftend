/**
 * One-shot handoff of an email address into the sign-in form (#1443).
 *
 * The conversion collision's "Sign in instead" link must land on sign-in with
 * the typed email prefilled. It deliberately does NOT travel as a `?email=`
 * query param: sign-in is `dangerouslySingular` (#1027 - fewer live instances
 * holding credentials), `getSingularId` reads path segments only, and
 * `nav-singular.test.ts` rightly forbids a singular screen from keying off
 * search params - a reused instance would keep showing the first address. An
 * in-memory handoff consumed in a focus effect reaches a reused instance too,
 * and keeps the email out of the URL bar and browser history.
 *
 * Consume-once, like `useEscapeOrigin`'s store: a later plain visit to
 * sign-in must not resurrect a stale address. A web reload loses it - that is
 * a cold arrival, same as the Origin rule (O7). Read only from effects, never
 * during render (the React Compiler may memoize render-time module reads).
 */
let pendingEmail: string | null = null;

export function recordSignInPrefill(email: string) {
  pendingEmail = email;
}

export function consumeSignInPrefill(): string | null {
  const email = pendingEmail;
  pendingEmail = null;
  return email;
}
