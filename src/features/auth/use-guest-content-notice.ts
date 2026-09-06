import { useQuery } from "@tanstack/react-query";

import { guestHasContent } from "@/src/features/auth/guest-content";
import { isGuestAccount } from "@/src/features/profile/guest";
import { useSession } from "@/src/providers/session-provider";

export const guestContentKeys = {
  detail: (userId: string | null) => ["guest-content", userId] as const,
};

/**
 * Whether `/sign-in` should carry its quiet line about guest data staying
 * behind (#1865).
 *
 * The warn-and-abandon confirm (#1444) is complete and calm, but it fires from
 * inside `guardSignIn` - which wraps the SUBMIT actions - so the first mention
 * that this device's data is not coming along landed after the person had typed
 * an email and a password. `/sign-in` is a screen rather than a menu row, so it
 * can afford the check on mount and say so before the effort (unlike the header
 * menu, where #1863 ruled no foreshadow: a static line there would be false for
 * every empty guest, and a live one would cost this RPC on every open).
 *
 * The two conditions are exactly the confirm's own preconditions, evaluated
 * early - an anonymous session, and content in it - so the line appears when and
 * only when the dialog is going to appear. It is a foreshadow of that dialog,
 * not a second opinion about it.
 *
 * ☠️ **With one deliberate divergence: this fails toward SILENCE, and the guard
 * fails toward the warning.** For the confirm, treating an unreachable
 * `export_user_data` as content costs one tap on a path that was about to fail
 * anyway, and skipping it would be silent data loss. A line that just sits on
 * the screen is a different trade: a false one is a standing claim that this
 * person's work will be left behind, which is a deterrent in front of the
 * account - and `docs/product-principles.md` §12 removes steps toward the
 * practice, never toward the account. So only a definitive `true` shows it;
 * loading, error and `false` all render nothing. Nothing is weakened by that,
 * because the confirm still runs at submit with its own polarity intact - this
 * line can under-promise, never over-promise.
 *
 * ⚠️ `staleTime` is left at 0 on purpose: a guest can create content between two
 * visits to this screen, so the answer is re-asked on arrival rather than cached
 * across the session. The query is disabled outright for registered users, so
 * they never pay for it.
 */
export function useGuestContentNotice(): boolean {
  const { user } = useSession();
  // ☠️ `isGuestAccount`, not the flag (#1896). This surface was missed when the
  // predicate was extracted, and it is the one where a false positive costs the
  // most: the line is a standing claim that this person's work will be left
  // behind, and inside the stale-flag window it made that claim to somebody who
  // had JUST converted - whose work is now reachable by email and password, and
  // is going nowhere. A deterrent in front of the account is exactly what
  // `docs/product-principles.md` §12 removes steps toward.
  const isGuest = isGuestAccount(user);

  const { data } = useQuery({
    queryKey: guestContentKeys.detail(user?.id ?? null),
    queryFn: guestHasContent,
    enabled: isGuest,
  });

  // `data === true`, not `Boolean(data)`: `undefined` is both "still checking"
  // and "the check threw", and both are silence here.
  return isGuest && data === true;
}
