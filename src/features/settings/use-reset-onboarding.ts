import type { User } from "@supabase/supabase-js";
import { useTranslation } from "react-i18next";

import { useUpdateOnboardingPreferences } from "@/src/features/settings/queries";
import { REPLAY_INTRODUCTION_PREFERENCES } from "@/src/features/settings/onboarding-reset";
import { useToastStore } from "@/src/stores/toast-store";

/**
 * Settings' one explicit onboarding action and its feedback.
 *
 * The `setErrorMessage`/`setSuccessMessage` injection is gone with the R7 banner
 * pair. The outcome was already toasting from here; the banner repeated the same
 * sentence 200px further up the page, and it is not a state that persists - the
 * introduction either replays on the next Home visit or it does not.
 *
 * `showTipsAgain` stood beside it and re-armed `shownButtonTours`. Its only live
 * subject was the home tour's one remaining stop, which #2109 retired along with
 * the tour itself, so a button promising tips would have promised nothing. The
 * union types below are single literals rather than pairs for the same reason -
 * they name what a caller may actually pass, and there is one caller.
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
    successKey: "onboarding.replaySaved",
    errorKey: "onboarding.replayError",
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
    } catch {
      // The thrown message is a backend/internal string, English for every user -
      // translated copy only (i18n rule, #1060). The mutation cache's global onError
      // already reports the failure to Sentry.
      showToast({
        title: t("common:feedback.problem"),
        description: t(errorKey),
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

  return {
    replayIntroduction,
    isPending: updateOnboarding.isPending,
  };
}
