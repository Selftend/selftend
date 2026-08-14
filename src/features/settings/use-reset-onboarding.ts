import type { User } from "@supabase/supabase-js";
import { useTranslation } from "react-i18next";

import { useUpdateOnboardingPreferences } from "@/src/features/settings/queries";
import {
  REPLAY_INTRODUCTION_PREFERENCES,
  SHOW_TIPS_AGAIN_PREFERENCES,
} from "@/src/features/settings/onboarding-reset";
import { useToastStore } from "@/src/stores/toast-store";

/**
 * Settings' two explicit onboarding actions and their feedback.
 *
 * The `setErrorMessage`/`setSuccessMessage` injection is gone with the R7 banner
 * pair. Both outcomes were already toasting from here; the banners repeated the
 * same sentence 200px further up the page, and neither outcome is a state that
 * persists - the introduction either replays on the next Home visit or it does not.
 */
export function useOnboardingActions(
  user: User | null,
  previousCompletionVia: "finish" | "skip" | null | undefined,
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
      await updateOnboarding.mutateAsync(patch);

      showToast({
        title: t("common:feedback.saved"),
        description: t(successKey),
        tone: "success",
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : t(errorKey);
      showToast({
        title: t("common:feedback.problem"),
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
