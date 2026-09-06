import type { User } from "@supabase/supabase-js";

/**
 * Is this session a **guest account** — an auto-created row whose holder has
 * not converted it yet? (`CONTEXT.md` §Accounts.)
 *
 * ☠️☠️ **ABSENCE-DRIVEN, NEVER `is_anonymous`. THAT IS THE WHOLE POINT OF THIS
 * FUNCTION** (#1896). `convertGuestWithPassword` flips the flag server-side,
 * but the live JWT keeps claiming `is_anonymous: true` until the token is next
 * minted (`api.ts` documents the window). Inside it a REGISTERED person carries
 * a true flag *and* an email, so every flag-reading predicate answers "guest"
 * about somebody who has just stopped being one — and each one then withholds
 * or offers the wrong thing for the length of the window.
 *
 * `!email` implies guest **structurally**: every registered identity attaches
 * an email (password, Google, and Apple's private relay), and there is no phone
 * auth. So the answer flips the moment conversion lands, stale flag and all,
 * and it needs no second source of truth.
 *
 * ☠️ **`!user.email`, never `user.email == null`, and never `??` anywhere near
 * it.** A guest's `email` is the empty string `""`, not `undefined`, while the
 * type says `email?: string` — so `??` typechecks, walks straight past `""` and
 * hands back a blank. This function exists to be called by people who have not
 * read that, which is exactly why the check lives in one place now.
 *
 * ⚠️ **A signed-out visitor is NOT a guest.** With no session there is no
 * account to be a guest of, and `user` is `null` exactly when `session` is
 * (`session-provider.tsx` derives one from the other). Callers that render
 * something for guests must not render it for a visitor, and this returning
 * `false` is what keeps that true without a second `session` test.
 *
 * ☠️ **NOT the question `sign-up-form.tsx` asks.** Its `isConversion` means
 * "is this submission an in-place upgrade of an existing anonymous row?", which
 * is about the row's history rather than the session's present state — the flag
 * is the honest signal there, and it deliberately does not use this helper.
 * Sorting those two questions apart is what made #1896 a decision rather than a
 * rename; do not collapse them.
 */
export function isGuestAccount(user: Pick<User, "email"> | null | undefined): boolean {
  if (!user) return false;
  return !user.email;
}
