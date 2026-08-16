import { useTranslation } from "react-i18next";

import { signOut } from "@/src/features/auth/api";
import { cancelAllReminders } from "@/src/lib/notifications";
import { captureError, isReportableError } from "@/src/lib/sentry";
import { useToastStore } from "@/src/stores/toast-store";

/**
 * The app's one sign-out handler, shared by the settings row and the header menu
 * (#1053). Deregisters this device's push channel (`cancelAllReminders`) BEFORE
 * `signOut` while the RLS context is still valid, so server-driven reminders stop
 * for a device the user has left.
 *
 * A failure toasts and nothing else. The injected `setErrorMessage` this used to
 * take existed only to write the screen's shared error banner (R7), and that pair
 * is gone: the toast was already firing beside it, so the banner was a second
 * rendering of the same sentence on a page the user is about to leave. The toast
 * is also the only surface left once the header menu has dismissed itself.
 */
export function useSignOut(userId: string | null) {
  const { t } = useTranslation("settings");
  const showToast = useToastStore((state) => state.showToast);

  const handleSignOut = async () => {
    try {
      // Deregister this device's push channel BEFORE sign-out (RLS context still valid)
      // so server-driven reminders stop firing for a device the user has left.
      await cancelAllReminders(userId);
      // `local`: signs the user out of THIS device, not out of their phone as
      // well (#968).
      await signOut("local");
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
        description: t("account.signOutError"),
        tone: "error",
      });
    }
  };

  return handleSignOut;
}
