import type { User } from "@supabase/supabase-js";
import { useTranslation } from "react-i18next";

import { signOut } from "@/src/features/auth/api";
import { isGuestAccount } from "@/src/features/auth/guest-account";
import { cancelAllReminders } from "@/src/lib/notifications";
import { captureError, isReportableError } from "@/src/lib/sentry";
import { useToastStore } from "@/src/stores/toast-store";

/**
 * The app's one sign-out handler, shared by the settings row and the header menu
 * (#1053). Deregisters this device's push channel (`cancelAllReminders`) BEFORE
 * `signOut` while the RLS context is still valid, so server-driven reminders stop
 * for a device the user has left.
 *
 * A failure toasts, and reports to Sentry unless it is the expected offline case.
 * The injected `setErrorMessage` this used to take existed only to write the
 * screen's shared error banner (R7), and that pair is gone: the toast was already
 * firing beside it, so the banner was a second rendering of the same sentence on a
 * page the user is about to leave. The toast is also the only surface left once
 * the header menu has dismissed itself.
 *
 * It also tears the toast slot down (#1336). `AppToast` is mounted in the ROOT
 * layout, not the protected one, so it survives sign-out - and now that an error
 * never auto-dismisses, an unread failure raised in one account would otherwise sit
 * there waiting for whoever signs in next.
 *
 * `canSignOut` is the one guest guard both surfaces share (#1442): a guest
 * signing out is silent irreversible data loss - the session token is the only
 * key to their account - so the control must not exist for them. Deciding it
 * here rather than at each surface means the settings row and the header menu
 * cannot drift apart. "Start fresh" for a guest is delete-account; "switch
 * accounts" is sign-in - both stay visible.
 *
 * ☠️ It reads `isGuestAccount`, NOT `is_anonymous`, and the reason above is why
 * (#1896). The stated hazard is "the session token is the only key to their
 * account" - which is a fact about having no second key, not about a flag. A
 * just-converted person HAS one (their email and password), so the control
 * should be theirs the moment conversion lands. Reading the flag withheld it
 * for the length of the stale-JWT window, and because `user-menu.tsx` had
 * already moved its sign-in door onto the email, that user got NEITHER control
 * until the token refreshed. That was the bug; nothing about the guest refusal
 * itself has changed.
 */
export function useSignOut(user: Pick<User, "id" | "email"> | null) {
  const { t } = useTranslation("auth");
  const showToast = useToastStore((state) => state.showToast);
  const clearToasts = useToastStore((state) => state.clearToasts);

  const userId = user?.id ?? null;
  const canSignOut = user !== null && !isGuestAccount(user);

  const handleSignOut = async () => {
    // Enforced here, not just advertised: a future surface that renders a
    // sign-out control without checking `canSignOut` must still be unable to
    // sign a guest out - the flag and the refusal live in the same place.
    if (!canSignOut) return;
    try {
      // Deregister this device's push channel BEFORE sign-out (RLS context still valid)
      // so server-driven reminders stop firing for a device the user has left.
      await cancelAllReminders(userId);
      // `local`: signs the user out of THIS device, not out of their phone as
      // well (#968).
      await signOut("local");
      // Only once sign-out has actually succeeded. Clearing before it - or in a
      // `finally` - would swallow the failure toast raised just below, which is
      // the only surface a failed sign-out has left.
      clearToasts();
    } catch (error) {
      // The thrown message no longer reaches the screen, so without this a failed
      // sign-out would be diagnosable from nothing at all: `signOut` is not a
      // TanStack mutation, so query-client's global reporter never sees it.
      // `isReportableError` keeps the expected offline case out of Sentry, exactly
      // as it does there.
      if (isReportableError(error)) {
        captureError(error);
      }
      showToast({
        // Not `common:feedback.problem` ("Something did not save"): signing out saves
        // nothing, so that sentence described an action the user never took (#1055).
        title: t("common:feedback.wentWrong"),
        // The thrown message used to be preferred over this one whenever it was an
        // `Error` - i.e. nearly always. Those are Supabase/network strings, English
        // for every user, and none of them names a step the user can take: sign-IN
        // maps its known messages to real next steps, sign-out has none to map.
        description: t("signOut.error"),
        tone: "error",
      });
    }
  };

  return { canSignOut, signOut: handleSignOut };
}
