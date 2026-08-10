import type { User } from "@supabase/supabase-js";
import { useTranslation } from "react-i18next";

import { useUpdateOnboardingPreferences } from "@/src/features/settings/queries";
import {
  REPLAY_INTRODUCTION_PREFERENCES,
  SHOW_TIPS_AGAIN_PREFERENCES,
} from "@/src/features/settings/onboarding-reset";
import { useToastStore } from "@/src/stores/toast-store";

/**
 * Settings' two explicit onboarding actions and their shared feedback handling.
 *
 * `setErrorMessage`/`setSuccessMessage` are injected from the screen so the
 * feedback stays the single shared banner pair that `useSignOut` also writes to
 * (R7): the reset clears both banners at the start, then sets exactly one.
 */
export function useOnboardingActions(
  user: User | null,
  previousCompletionVia: "finish" | "skip" | null | undefined,
  setErrorMessage: (message: string) => void,
  setSuccessMessage: (message: string) => void,
) {
  const { t } = useTranslation("settings");
  const showToast = useToastStore((state) => state.showToast);
  const updateOnboarding = useUpdateOnboardingPreferences(user?.id ?? null);

  const run = async (
    patch: Parameters<typeof updateOnboarding.mutateAsync>[0],
    successKey: "onboarding.replaySaved" | "onboarding.tipsSaved",
    errorKey: "onboarding.replayError" | "onboarding.tipsError",
  ) => {
    if (!user) {
      return;
    }

    try {
      setErrorMessage("");
      setSuccessMessage("");

      await updateOnboarding.mutateAsync(patch);

      setSuccessMessage(t(successKey));
      showToast({
        title: t("common:feedback.saved"),
        description: t(successKey),
        tone: "success",
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : t(errorKey);
      setErrorMessage(message);
      showToast({
        title: t("problem"),
        description: message,
        tone: "error",
      });
    }
  };

  const replayIntroduction = () =>
    run(
      {
        ...REPLAY_INTRODUCTION_PREFERENCES,
        // Preserve the original completion path as a replay marker. Legacy rows
        // predate this field, so "finish" is their neutral fallback.
        appOnboardingCompletedVia: previousCompletionVia ?? "finish",
      },
      "onboarding.replaySaved",
      "onboarding.replayError",
    );

  const showTipsAgain = () =>
    run(SHOW_TIPS_AGAIN_PREFERENCES, "onboarding.tipsSaved", "onboarding.tipsError");

  return {
    replayIntroduction,
    showTipsAgain,
    isPending: updateOnboarding.isPending,
  };
}
