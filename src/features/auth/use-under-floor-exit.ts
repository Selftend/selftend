import { useCallback, useEffect, useRef, useState } from "react";

import { signOut } from "@/src/features/auth/api";
import { readUnderFloorBlock, writeUnderFloorBlock } from "@/src/features/auth/under-floor-block";
import { useDeleteUserAccount } from "@/src/features/settings/queries";
import { captureError, isReportableError } from "@/src/lib/sentry";
import { useSession } from "@/src/providers/session-provider";

/**
 * `awaiting-confirmation` while the erasure is offered and not yet asked for,
 * `working` while it is in flight, `erased` once nothing of this person is
 * left, `failed` when the deletion did not land, and `nothing-to-erase` when
 * there is no account this block may act on.
 *
 * ⚠️ That last state exists so the screen never says *"the account has been
 * removed"* on a path that removed nothing. A returning blocked device has no
 * verdict of its own, and folding it into `erased` would have been the screen
 * asserting an erasure it did not observe.
 *
 * ☠️ `awaiting-confirmation` is the resting state, not a transient one. The
 * deletion is irreversible and the person may simply never press - see
 * `useUnderFloorExit`'s docblock for why that is the right way round.
 */
export type UnderFloorErasureState =
  "awaiting-confirmation" | "working" | "erased" | "failed" | "nothing-to-erase";

/**
 * How far the erasure itself has got - the hook's own state, and the only part
 * of the reported state that is stored. `idle` is "not asked for", which the
 * hook reports as one of the two resting states above depending on whether
 * there is an account it may act on at all.
 */
type ErasureProgress = "idle" | "working" | "erased" | "failed";

/**
 * The under-floor exit (#1765, spec #227 §3): block this device, then erase the
 * account the verdict was rendered for - once the person has said so.
 *
 * **Why there is an account to erase at all.** The gate runs in the shared slot
 * in `ProtectedLayout`, which is *after* the session exists on **all four**
 * entry paths - guest, Google, Apple and email/password - so by the time the
 * verdict is known an auth user has been created, whichever way in was used.
 * The gate mounts below `ProtectedLayout`'s `if (!session) return
 * <AuthLandingScreen />`, so it is structurally unreachable without a session;
 * and password sign-up yields one immediately, because email confirmation is
 * off (`supabase/config.toml` `enable_confirmations = false`, mirroring
 * `mailer_autoconfirm=true` on the hosted projects). §3 describes this as an
 * OAuth-specific deletion; it is not, and the silent guest (#1440) is the path
 * that makes it the common case rather than the exotic one.
 *
 * ⚠️ This said *"three of the four"* until #1919. That was a fossil of spec
 * #227 §3, which had the password gate running BEFORE account creation; #1764
 * moved the gate into the shared slot and gave it all four paths, and the
 * correction never reached the comments. The sentence is load-bearing - a
 * reader uses it to decide whether this exit can be reached with no account to
 * delete - so it is worth being exact about.
 *
 * ☠️☠️ **The erasure acts on the account the VERDICT judged, never on whoever
 * happens to be signed in** (#2195). The device flag holds one expiry timestamp
 * and no identity, and `ProtectedLayout` renders this screen for *any* session
 * while the window holds - so before this hook took `verdictUserId`, the next
 * account signed in on a shared phone inside those 24 hours was the one
 * deleted. Two conditions now gate the call, and both are checked here rather
 * than at the call site so no caller can forget one: the block must be able to
 * name the account it judged, and that account must still be the signed-in one.
 * The second is not belt-and-braces - `delete_user_account()` derives its target
 * from `auth.uid()` and cannot be told whom to delete, so the id is not a
 * parameter to the purge, it is the permission to make the call at all. A
 * device whose block cannot vouch for the current session reports
 * `nothing-to-erase`: it still blocks, it just no longer destroys.
 *
 * ☠️☠️ **Nothing is deleted without an explicit confirmation** (#2193). The
 * destructive call used to run from a mount effect, so one press of the age
 * gate's submit button - a press that names no age and warns of nothing,
 * because the gate is deliberately COPPA-neutral - both produced the verdict
 * and executed the purge. A mistyped birth year is a real civil date, so it
 * falls straight through the calendar check into that path. The erasure is now
 * a separate, named, irreversible action the person takes on this screen.
 *
 * **The block is written on mount; only the deletion waits.** That split is the
 * whole design: the floor is not up for negotiation, so the device is blocked
 * whether or not anyone ever presses anything, and closing the app is not a way
 * past it. What waits for a press is the one step that cannot be undone. A
 * person who never confirms is blocked with an empty account still alive -
 * which is the lesser of the two failures by a wide margin, and the honest
 * trade for making a typo survivable.
 *
 * **The order is still flag-first.** A crash, a kill, or a dead network between
 * the two steps leaves a blocked device with a live empty account. The reverse
 * order would leave a deleted account with no flag, which is a person walking
 * straight back into the gate.
 *
 * ⚠️ The retry across launches that flag-first used to buy is gone with #2195,
 * and that is a deliberate trade rather than an oversight: the flag stores no
 * identity, so a later launch cannot tell whose account it would be finishing
 * off. Retry now lives inside the mount that failed, where the verdict is still
 * in hand. `docs/age-floor.md` records the stranded-empty-row consequence.
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
 *
 * @param verdictUserId The account the under-floor verdict was rendered for, or
 *   `null` when this mount is a device block that judged nobody.
 */
export function useUnderFloorExit(verdictUserId: string | null) {
  const { user } = useSession();
  const currentUserId = user?.id ?? null;
  // The only account this screen may erase, or null. See the docblock: both
  // halves are required, and the equality is the one that matters, because the
  // RPC deletes `auth.uid()` rather than an id we hand it.
  const erasableUserId =
    verdictUserId !== null && verdictUserId === currentUserId ? verdictUserId : null;
  // ⚠️ What is stored is the PROGRESS of the erasure, never the whole reported
  // state. The two resting states are a fact about the session and the verdict,
  // so they are derived in render rather than written by an effect: `react-hooks
  // /set-state-in-effect` forbids the effect, and it is right to - a stored
  // resting state would need re-synchronising on every session change, and the
  // one that matters here is the sign-out that FOLLOWS a successful purge.
  const [progress, setProgress] = useState<ErasureProgress>("idle");
  const deleteAccount = useDeleteUserAccount();
  // Three refs, three different jobs. `blocked` makes the device write
  // once-per-mount. `running` is the re-entrancy guard for a double-tapped
  // confirm. ☠️ Neither is a `useState`: a re-render must not be able to
  // re-arm either one, and `deleteAccount`'s identity changes on every
  // mutation state transition.
  const blocked = useRef(false);
  const running = useRef(false);
  // ⚠️ The screen is normally held up by the block itself, so this hook rarely
  // unmounts mid-flight - but the work below sets state after two awaits, and
  // its sibling `useUnderFloorBlock` guards the same way. One convention, not
  // two.
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  /**
   * Block the device. Unconditional, immediate, and nothing waits on it: this
   * is the half of the exit that is not the person's to decline.
   *
   * ⚠️ But only when the window is not already running. The write RESTARTS it,
   * and this hook mounts on every launch inside it - so an unconditional write
   * would roll the block forward forever for anyone who opens the app daily.
   * That is a ban on a device rather than the speed bump this is meant to be,
   * and punitive in the way AGENTS.md rules out. The window runs from the
   * verdict, not from every glance at the screen the verdict produced.
   */
  const blockDevice = useCallback(async () => {
    const now = new Date();
    if (!(await readUnderFloorBlock(now))) {
      await writeUnderFloorBlock(now);
    }
  }, []);

  useEffect(() => {
    if (blocked.current) return;
    blocked.current = true;
    void blockDevice();
  }, [blockDevice]);

  /**
   * Erase the account, on the person's explicit say-so.
   *
   * ☠️ Never call this from an effect. The whole of #2193 is that this ran on
   * mount, with no press between the age gate's submit and an irreversible
   * server-side purge.
   */
  const eraseAccount = useCallback(() => {
    void (async () => {
      if (running.current) return;
      // Not reachable from the screen, which renders no control in the states
      // where this is null - but the guard is here, next to the call, because
      // this is the line that decides whether an account is destroyed.
      if (erasableUserId === null) return;
      running.current = true;

      const settle = (next: ErasureProgress) => {
        if (mounted.current) setProgress(next);
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
        // ☠️ First, always. See the docblock: this is the step that must
        // survive the app dying in the middle of the next one. The mount
        // effect has normally done it already, in which case this is a no-op -
        // it is repeated here so the ordering is a property of the destructive
        // path itself rather than of an effect that raced it.
        await blockDevice();

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
    })();
  }, [blockDevice, deleteAccount, erasableUserId]);

  // Resting until the person asks for the erasure, and once it has run the
  // progress is the whole answer - including after the sign-out clears the
  // session, which must never turn "erased" back into "there is nobody here".
  const state: UnderFloorErasureState =
    progress !== "idle"
      ? progress
      : erasableUserId === null
        ? "nothing-to-erase"
        : "awaiting-confirmation";

  return { eraseAccount, state };
}
