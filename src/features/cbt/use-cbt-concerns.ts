import {
  type CbtConcern,
  isCbtConcern,
  recommendedStrategiesFor,
} from "@/src/features/cbt/concerns";
import { mergeUserPreferences } from "@/src/features/modules/types";
import { useUpdateUserPreferences, useUserPreferences } from "@/src/features/settings/queries";

export function useCbtConcerns(userId: string | null) {
  const { data: preferences } = useUserPreferences(userId);
  const updatePreferences = useUpdateUserPreferences(userId);

  const concerns = (preferences?.selectedConcerns ?? []).filter(isCbtConcern);
  const hasCompletedWizard = preferences?.cbtWizardCompleted ?? false;

  const saveConcerns = (next: CbtConcern[]) =>
    updatePreferences.mutateAsync(
      mergeUserPreferences(preferences, {
        selectedConcerns: next,
        activeStrategies: recommendedStrategiesFor(next),
        cbtWizardCompleted: true,
      }),
    );

  return {
    concerns,
    recommendedStrategies: recommendedStrategiesFor(concerns),
    hasCompletedWizard,
    saveConcerns,
    isPending: updatePreferences.isPending,
  };
}
