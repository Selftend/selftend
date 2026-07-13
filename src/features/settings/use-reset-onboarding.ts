import type { User } from "@supabase/supabase-js";
import { useTranslation } from "react-i18next";

import { useUpdateOnboardingPreferences } from "@/src/features/settings/queries";
import { RESET_ONBOARDING_PREFERENCES } from "@/src/features/settings/onboarding-reset";
import { useToastStore } from "@/src/stores/toast-store";

/**
 * Onboarding-reset handler, extracted verbatim from the screen. Applies the
 * frozen `RESET_ONBOARDING_PREFERENCES` patch and surfaces feedback.
 *
 * `setErrorMessage`/`setSuccessMessage` are injected from the screen so the
 * feedback stays the single shared banner pair that `useSignOut` also writes to
 * (R7): the reset clears both banners at the start, then sets exactly one.
 */
export function useResetOnboarding(
  user: User | null,
  previousCompletionVia: "finish" | "skip" | null | undefined,
  setErrorMessage: (message: string) => void,
  setSuccessMessage: (message: string) => void,
) {
  const { t } = useTranslation("settings");
  const showToast = useToastStore((state) => state.showToast);
  const resetOnboardingMutation = useUpdateOnboardingPreferences(user?.id ?? null);

  const reset = async () => {
    if (!user) {
      return;
    }

    try {
      setErrorMessage("");
      setSuccessMessage("");

      await resetOnboardingMutation.mutateAsync({
        ...RESET_ONBOARDING_PREFERENCES,
        // This distinguishes a Settings replay from a genuinely new account. Preserve the
        // original completion mode when available; legacy rows predate this field, so use
        // "finish" only as their replay marker.
        appOnboardingCompletedVia: previousCompletionVia ?? "finish",
      });

      setSuccessMessage(t("onboarding.resetSaved"));
      showToast({
        title: t("common:feedback.saved"),
        description: t("onboarding.resetSaved"),
        tone: "success",
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : t("onboarding.resetError");
      setErrorMessage(message);
      showToast({
        title: t("problem"),
        description: message,
        tone: "error",
      });
    }
  };

  return { reset, isPending: resetOnboardingMutation.isPending };
}
