import { useTranslation } from "react-i18next";

import { signOut } from "@/src/features/auth/api";
import { cancelAllReminders } from "@/src/lib/notifications";
import { useToastStore } from "@/src/stores/toast-store";

/**
 * Sign-out handler, extracted verbatim from the screen. Deregisters this
 * device's push channel (`cancelAllReminders`) BEFORE `signOut` while the RLS
 * context is still valid, so server-driven reminders stop for a device the user
 * has left.
 *
 * `setErrorMessage` is injected from the screen so the failure banner remains the
 * single shared `errorMessage` banner that `useResetOnboarding` also writes to
 * (R7). Extracting a private error state here would produce two banners.
 */
export function useSignOut(userId: string | null, setErrorMessage: (message: string) => void) {
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
      setErrorMessage(message);
      showToast({
        title: t("problem"),
        description: message,
        tone: "error",
      });
    }
  };

  return handleSignOut;
}
