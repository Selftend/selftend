/**
 * Does a stored `policy_version_accepted` satisfy the policy this build ships?
 *
 * The consent gate used to answer that with `stored !== policyVersion`, which
 * treats "accepted something NEWER" the same as "accepted nothing" - and that
 * is a reachable state, not a hypothetical (#2217). Selftend's clients deploy
 * independently: the web build is live within the release run, Android waits on
 * Play review and iOS on a manual TestFlight promotion. Whenever the row is
 * ahead of the running build, a strict inequality raises the full-screen wall
 * at every cold start, and the accept it collects is a write the database's
 * high-water trigger (20260911000000_policy_version_monotonic.sql) declines -
 * so the wall never clears. Strict equality is the half that turns a rollout
 * skew into a loop.
 *
 * ⚠️ This does NOT weaken the gate, and the distinction is the whole point.
 * Someone whose stored version is OLDER than this build's - or NULL, or
 * unrankable - has not accepted the disclosure this build shows, and is still
 * asked. The only case that changes is the one where they have accepted MORE
 * than this build knows about, which is not a reason to ask again.
 *
 * ☠️ Ordering is the leading `YYYY-MM-DD` and nothing else. Every version the
 * app has published is `YYYY-MM-DD-slug`, and `policy-content.test.ts` pins the
 * shape by asserting `policyVersion.startsWith(policyLastUpdated + "-")`. The
 * slug carries no ordering - two versions dated the same day ('2026-05-06' and
 * '2026-05-06-web-push' are the one such pair) would be ranked alphabetically
 * by a whole-string compare, inventing an order that does not exist - so a
 * same-date value that is not identical counts as NOT accepted and the person
 * is asked. Asking is the safe direction here; the database guard takes the
 * other one and lets the write through.
 *
 * The trigger and this function are two halves of one rule and must agree on
 * where the ordering comes from. Change one and change the other.
 */
const POLICY_VERSION_DATE = /^(\d{4}-\d{2}-\d{2})/;

/** The orderable part of a policy version, or null when there is not one. */
export function policyVersionDate(version: string | null | undefined): string | null {
  if (!version) return null;
  return POLICY_VERSION_DATE.exec(version)?.[1] ?? null;
}

/**
 * True when `accepted` records agreement to `current` or to a LATER policy.
 *
 * Fails closed: null, an older date, an unrankable value, and a different
 * version published on the same date all read as "not accepted", so the gate
 * still fires.
 */
export function hasAcceptedPolicy(accepted: string | null | undefined, current: string): boolean {
  if (!accepted) return false;
  if (accepted === current) return true;

  const acceptedDate = policyVersionDate(accepted);
  const currentDate = policyVersionDate(current);
  if (!acceptedDate || !currentDate) return false;

  return acceptedDate > currentDate;
}
