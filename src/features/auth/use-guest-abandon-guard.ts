import { useState } from "react";

import { guestHasContent } from "@/src/features/auth/guest-content";
import { useSession } from "@/src/providers/session-provider";

type SignInAction = () => void | Promise<void>;

/**
 * Warn-and-abandon (#1444, spec §6): a guest signing in to an existing
 * account leaves this device's guest data behind, so the sign-in action is
 * intercepted with one calm confirm - `GuestAbandonDialog` renders it - that
 * offers an in-place export before proceeding. It warns; it never blocks.
 *
 * `guardSignIn` passes registered users (and the no-session case) straight
 * through, and an empty guest too: auto-created rows and consent/onboarding
 * state do not count as content (see `guest-content.ts` for the boundary).
 *
 * The content check fails TOWARD the warning: if `export_user_data` cannot be
 * reached, the guest is treated as holding content. Sign-in needs the network
 * anyway, so the false warning costs one tap on a path that was about to fail
 * - while skipping the warning on a flaky connection would be silent data
 * loss for exactly the user least able to notice it.
 */
export function useGuestAbandonGuard() {
  const { user } = useSession();
  const [pendingAction, setPendingAction] = useState<SignInAction | null>(null);
  const [isChecking, setIsChecking] = useState(false);
  const [isProceeding, setIsProceeding] = useState(false);

  const guardSignIn = async (action: SignInAction) => {
    if (!user?.is_anonymous) {
      await action();
      return;
    }
    setIsChecking(true);
    let hasContent = true;
    try {
      hasContent = await guestHasContent();
    } catch {
      // Fail toward warning - see the docblock.
    } finally {
      setIsChecking(false);
    }
    if (!hasContent) {
      await action();
      return;
    }
    // Functional form: a bare `setPendingAction(action)` would CALL the
    // action as a state updater instead of storing it.
    setPendingAction(() => action);
  };

  const proceed = async () => {
    if (!pendingAction) return;
    setIsProceeding(true);
    try {
      await pendingAction();
    } finally {
      // On success the sign-in navigates away and the dialog unmounts with
      // the screen; on failure this closes the dialog so the form's own
      // error line (already set by the action) is readable behind it.
      setIsProceeding(false);
      setPendingAction(null);
    }
  };

  const cancel = () => setPendingAction(null);

  return {
    guardSignIn,
    /** True while the content check runs - disable the sign-in controls. */
    isChecking,
    isProceeding,
    warningVisible: pendingAction !== null,
    proceed,
    cancel,
  };
}
