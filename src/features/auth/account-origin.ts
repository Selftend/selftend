import { Platform } from "react-native";

import { isGuestAccount } from "@/src/features/profile/guest";

/**
 * The four doors an account can be minted by (#2306, `docs/measurement.md` §4).
 *
 * Kept in the same order as the column's inline `CHECK`
 * (`20260914000000_account_origin.sql`); the two lists are one list in two
 * places, and `account-origin.test.ts` pins them together.
 */
export const ACCOUNT_ORIGINS = [
  "native_cold_start",
  "web_cta",
  "native_signup",
  "web_signup",
] as const;

export type AccountOrigin = (typeof ACCOUNT_ORIGINS)[number];

/** Only what the derivation reads. Never a `null` user - see below. */
type OriginUser = { email?: string };

/**
 * Which door this account came through, derived on-device (#2306).
 *
 * ☠️☠️ **Derived, because it cannot be written at the mint.**
 * `signInWithOAuth` and `signInWithIdToken` cannot carry custom user metadata,
 * web OAuth loses any in-memory marker across the full-page redirect, and this
 * schema has no `auth.users` trigger and no `handle_new_user()`. Every
 * mint-time scheme leaves at least one of the four doors dark.
 *
 * ☠️ **Sound only at the FIRST gate after the mint**, which is why its one
 * caller is `AgeGate` - the earliest gate, above `ConsentGate` in the shared
 * slot, and the one documented as covering every entry path. A guest who later
 * converts reads here as native + registered, so a gate run after that point
 * would call a `native_cold_start` a `native_signup`. Today nothing runs later;
 * the write-once guard in `recordAgeAttestation` is what keeps that true if
 * something ever does.
 *
 * ⚠️ Guest-ness is `isGuestAccount` - the absence of an email, never
 * `is_anonymous`, which still claims `true` for one token window after a
 * conversion.
 *
 * ⚠️ The parameter is not nullable on purpose. `isGuestAccount(null)` is
 * `false` by design ("no session is nobody, not somebody unregistered"), so a
 * null user would quietly derive a `*_signup`. Callers check for a session
 * first; the type makes them.
 */
export function deriveAccountOrigin(user: OriginUser): AccountOrigin {
  const web = Platform.OS === "web";

  if (isGuestAccount(user)) {
    return web ? "web_cta" : "native_cold_start";
  }

  return web ? "web_signup" : "native_signup";
}
