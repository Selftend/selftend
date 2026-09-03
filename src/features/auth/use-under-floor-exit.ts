import { useCallback, useEffect, useRef, useState } from "react";

import { signOut } from "@/src/features/auth/api";
import { writeUnderFloorBlock } from "@/src/features/auth/under-floor-block";
import { useDeleteUserAccount } from "@/src/features/settings/queries";
import { captureError, isReportableError } from "@/src/lib/sentry";

/**
 * `working` while the erasure is in flight, `erased` once nothing of this
 * person is left, `failed` when the deletion did not land.
 */
export type UnderFloorErasureState = "working" | "erased" | "failed";

/**
 * The under-floor exit (#1765, spec #227 §3): block this device, then erase the
 * account that already exists.
 *
 * **Why there is an account to erase at all.** The gate runs in the shared slot
 * in `ProtectedLayout`, which is *after* the session exists on three of the
 * four entry paths - guest, Google, Apple - so by the time the verdict is
 * known an auth user has been created. §3 describes this as an OAuth-specific
 * deletion; it is not, and the silent guest (#1440) is the path that makes it
 * the common case rather than the exotic one.
 *
 * **The server-side capability §3 asks for already exists, and it is not an
 * edge function.** `delete_user_account()` is `security definer`, runs as the
 * function owner, and delegates to `purge_user_account(uuid)` - which is
 * revoked from `public`, `anon` AND `authenticated`, so only the owner and
 * `service_role` can call it (`20260826000000_account_purge_helper.sql`). The
 * client holds no service-role key and cannot name a target: the RPC derives
 * one from `auth.uid()`, so the only account it can erase is the caller's own.
 * A second, edge-function copy of this would be a second definition of what
 * deletion removes, and that file warns in its own words against exactly that.
 *
 * **The order is the guarantee, and it is deliberately flag-first.** A crash,
 * a kill, or a dead network between the two steps leaves a blocked device with
 * a live empty account - recoverable, because the next launch lands back here
 * and retries. The reverse order would leave a deleted account with no flag,
 * which is a person walking straight back into the gate.
 *
 * **A failed deletion does not sign out.** `delete_user_account()` reads
 * `auth.uid()`, so the token is the only thing that can finish the job; ending
 * the session would strand the account for good. The person stays blocked
 * either way - the exit screen is what the block renders - so nothing
 * half-deleted reaches the app while the retry is outstanding.
 *
 * **A failed sign-out is not a failed erasure.** The purge is what "nothing has
 * been kept" rests on and it landed; a token left behind names a user row that
 * no longer exists, so it authenticates nothing. It is reported, not surfaced.
 */
export function useUnderFloorExit(userId: string | null) {
  const [state, setState] = useState<UnderFloorErasureState>("working");
  const deleteAccount = useDeleteUserAccount();
  // Two refs, two different jobs. `attempted` makes the automatic run
  // once-per-mount and survives the re-render that a settled state and a fresh
  // mutation object both cause - ☠️ a `running`-only guard would re-fire the
  // whole sequence every time `deleteAccount`'s identity changed. `running`
  // is the re-entrancy guard for a double-tapped retry.
  const attempted = useRef(false);
  const running = useRef(false);

  const run = useCallback(async () => {
    if (running.current) return;
    running.current = true;

    try {
      setState("working");
      // ☠️ First, always. See the docblock: this is the step that must survive
      // the app dying in the middle of the next one.
      await writeUnderFloorBlock(new Date());

      // No session on this path (a web sign-up that never minted one, or a
      // returning device whose token is already gone): there is nothing to
      // erase, and the block above is the whole exit.
      if (!userId) {
        setState("erased");
        return;
      }

      try {
        await deleteAccount.mutateAsync();
      } catch (error) {
        if (isReportableError(error)) {
          captureError(error);
        }
        setState("failed");
        return;
      }

      try {
        await signOut("global");
      } catch (error) {
        if (isReportableError(error)) {
          captureError(error);
        }
      }

      setState("erased");
    } finally {
      running.current = false;
    }
  }, [deleteAccount, userId]);

  useEffect(() => {
    if (attempted.current) return;
    attempted.current = true;
    void run();
  }, [run]);

  const retry = useCallback(() => {
    void run();
  }, [run]);

  return { retry, state };
}
