import { useTranslation } from "react-i18next";

import { signOut } from "@/src/features/auth/api";
import { cancelAllReminders } from "@/src/lib/notifications";
import { useToastStore } from "@/src/stores/toast-store";

/**
 * Sign-out handler. Deregisters this device's push channel
 * (`cancelAllReminders`) BEFORE `signOut` while the RLS context is still valid,
 * so server-driven reminders stop for a device the user has left.
 *
 * A failure toasts and nothing else. The injected `setErrorMessage` this used to
 * take existed only to write the screen's shared error banner (R7), and that pair
 * is gone: the toast was already firing beside it, so the banner was a second
 * rendering of the same sentence on a page the user is about to leave.
 */
export function useSignOut(userId: string | null) {
  const { t } = useTranslation("settings");
  const showToast = useToastStore((state) => state.showToast);

  const handleSignOut = async () => {
    try {
      // Deregister this device's push channel BEFORE sign-out (RLS context still valid)
      // so server-driven reminders stop firing for a device the user has left.
      await cancelAllReminders(userId);
      await signOut();
    } catch (error) {
      const message = error instanceof Error ? error.message : t("account.signOutError");
      showToast({
        title: t("common:feedback.problem"),
        description: message,
        tone: "error",
      });
    }
  };

  return handleSignOut;
}
