import { useMutation, useQueryClient } from "@tanstack/react-query";

import type { ConcernKey } from "@/src/features/onboarding/concerns";
import { applyWidgetRecommendations } from "@/src/features/onboarding/repository";
import { preferenceKeys } from "@/src/features/settings/queries";

interface CompleteAppOnboardingInput {
  /** null = user skipped: complete onboarding and keep Home empty. */
  selectedConcerns: ConcernKey[] | null;
  widgetIds: string[];
}

interface ApplyWidgetSuggestionsInput {
  selectedConcerns: ConcernKey[];
  widgetIds: string[];
}

async function invalidateOnboardingData(
  queryClient: ReturnType<typeof useQueryClient>,
  userId: string | null,
) {
  if (!userId) return;
  await queryClient.invalidateQueries({ queryKey: preferenceKeys.detail(userId) });
  await queryClient.invalidateQueries({ queryKey: ["widgets", "list", userId] });
}

export function useCompleteAppOnboarding(userId: string | null) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ selectedConcerns, widgetIds }: CompleteAppOnboardingInput) => {
      await applyWidgetRecommendations({
        widgetIds,
        selectedConcerns,
        completionMode: selectedConcerns === null ? "skip" : "finish",
      });
    },
    onSettled: () => invalidateOnboardingData(queryClient, userId),
  });
}

/**
 * Applies the optional suggestion flow shown on an empty Home screen. Unlike the
 * first-login flow, this deliberately leaves the onboarding completion fields alone.
 */
export function useApplyWidgetSuggestions(userId: string | null) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ selectedConcerns, widgetIds }: ApplyWidgetSuggestionsInput) => {
      await applyWidgetRecommendations({
        widgetIds,
        selectedConcerns,
        completionMode: null,
      });
    },
    onSettled: () => invalidateOnboardingData(queryClient, userId),
  });
}
