import { useMutation, useQueryClient } from "@tanstack/react-query";

import { resolveConcernWidgetIds, type ConcernKey } from "@/src/features/onboarding/concerns";
import { updateWidgetPositions } from "@/src/features/home/widget-repository";
import { preferenceKeys } from "@/src/features/settings/queries";
import { updateOnboardingPreferences } from "@/src/features/settings/repository";

interface CompleteAppOnboardingInput {
  /** null = user skipped: complete onboarding without touching concerns or widgets. */
  selectedConcerns: ConcernKey[] | null;
}

export function useCompleteAppOnboarding(userId: string | null) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ selectedConcerns }: CompleteAppOnboardingInput) => {
      await updateOnboardingPreferences(userId!, {
        appOnboardingCompleted: true,
        ...(selectedConcerns !== null ? { selectedConcerns } : {}),
      });
      if (selectedConcerns !== null && selectedConcerns.length > 0) {
        await updateWidgetPositions(userId!, resolveConcernWidgetIds(selectedConcerns));
      }
    },
    onSettled: async () => {
      if (!userId) return;
      await queryClient.invalidateQueries({ queryKey: preferenceKeys.detail(userId) });
      await queryClient.invalidateQueries({ queryKey: ["widgets", "list", userId] });
    },
  });
}
