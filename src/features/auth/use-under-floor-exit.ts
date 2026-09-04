import { useCallback, useEffect, useRef, useState } from "react";

import { signOut } from "@/src/features/auth/api";
import { readUnderFloorBlock, writeUnderFloorBlock } from "@/src/features/auth/under-floor-block";
import { useDeleteUserAccount } from "@/src/features/settings/queries";
import { captureError, isReportableError } from "@/src/lib/sentry";

/**
 * `working` while the erasure is in flight, `erased` once nothing of this
 * person is left, `failed` when the deletion did not land, and
 * `nothing-to-erase` when there was no session to act on.
 *
 * ⚠️ That fourth state exists so the screen never says *"the account has been
 * removed"* on a path that removed nothing. A returning blocked device has no
 * session, and folding it into `erased` would have been the screen asserting an
 * erasure it did not observe.
 */
export type UnderFloorErasureState = "working" | "erased" | "failed" | "nothing-to-erase";

/**
 * The under-floor exit (#1765, spec #227 §3): block this device, then erase the
 * account that already exists.
 *
 * **Why there is an account to erase at all.** The gate runs in the shared slot
 * in `ProtectedLayout`, below the branch that answers a missing session with
 * the auth landing - so by the time a verdict is known an auth user exists, on
 * **all four** entry paths. §3 describes this as an OAuth-specific deletion; it
 * is not, and the silent guest (#1440) is the path that makes it the common
 * case rather than the exotic one.
 *
 * ⚠️ This said "three of the four - guest, Google, Apple" until #1919, which
 * was a fossil of §3's design where the password path gated *before* the
 * account was created. #1764 moved the gate into `ProtectedLayout`, and that is
 * what gave it the fourth path. `protected-layout.test.tsx` now pins it: a
 * visitor with no session is never asked, so the exit always has something to
 * delete.
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
  // ⚠️ The screen is normally held up by the block itself, so this hook rarely
  // unmounts mid-flight - but `run` sets state after two awaits, and its
  // sibling `useUnderFloorBlock` guards the same way. One convention, not two.
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  const run = useCallback(async () => {
    if (running.current) return;
    running.current = true;

    const settle = (next: UnderFloorErasureState) => {
      if (mounted.current) setState(next);
    };

    /** One report path for both failures, so neither can quietly lose its. */
    const report = (error: unknown) => {
      // Keeps the expected offline case out of Sentry, exactly as `useSignOut`
      // does with the same helper.
      if (isReportableError(error)) {
        captureError(error);
      }
    };

    try {
      settle("working");
      // ☠️ First, always. See the docblock: this is the step that must survive
      // the app dying in the middle of the next one.
      //
      // ⚠️ But only when the window is not already running. The write RESTARTS
      // it, and this hook mounts on every launch inside it - so an
      // unconditional write would roll the block forward forever for anyone who
      // opens the app daily. That is a ban on a device rather than the speed
      // bump this is meant to be, and punitive in the way AGENTS.md rules out.
      // The window runs from the verdict, not from every glance at the screen
      // the verdict produced.
      const now = new Date();
      if (!(await readUnderFloorBlock(now))) {
        await writeUnderFloorBlock(now);
      }

      // No session on this path (a web sign-up that never minted one, or a
      // returning device whose token is already gone): there is nothing to
      // erase, and the block above is the whole exit. Its own state rather than
      // `erased`, so the screen never claims a removal it did not observe.
      if (!userId) {
        settle("nothing-to-erase");
        return;
      }

      try {
        await deleteAccount.mutateAsync();
      } catch (error) {
        report(error);
        settle("failed");
        return;
      }

      try {
        await signOut("global");
      } catch (error) {
        report(error);
      }

      settle("erased");
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
