type UserLike = { email?: string } | null | undefined;

/**
 * Whether this session belongs to a **guest** - an account with no registered
 * identity attached to it. `CONTEXT.md` §Accounts defines the term; this is the
 * one place the app answers it.
 *
 * ☠️ **The email, never `is_anonymous`** (#1896). `convertGuestWithPassword`
 * flips the flag server-side, but the live JWT keeps claiming
 * `is_anonymous: true` until the token is minted again (see
 * `src/features/auth/api.ts`). Inside that window a registered person carries a
 * true flag AND an email, so every predicate spelled on the flag alone treats
 * them as a guest: it hid Sign Out from them, kept the "create an account" card
 * in front of them, and suppressed the verify-email banner they needed.
 * `!email` is right inside that window and identical to the flag outside it.
 *
 * The email is the honest signal because it is **structural**: every registered
 * identity attaches one - password, Google, Apple's private relay - and there is
 * no phone auth.
 *
 * ☠️ **A user of `null` is not a guest.** No session is nobody, not somebody
 * unregistered, and callers branch on the two differently - `canSignOut` must
 * refuse both, while the sign-in redirect must let a guest through and send a
 * signed-out visitor to the form. Returning `false` here keeps that decision at
 * the call site instead of hiding it.
 *
 * ⚠️ **`||`, never `??`, anywhere this value is used.** A guest's `email` is
 * `""` and the type is `email?: string`, so `??` typechecks and walks straight
 * past the empty string. See `src/components/app/user-menu.tsx`.
 */
export function isGuestAccount(user: UserLike): boolean {
  return Boolean(user) && !user?.email;
}
