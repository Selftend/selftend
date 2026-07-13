import type { ConcernKey } from "@/src/features/onboarding/concerns";
import { requireSupabase } from "@/src/lib/supabase";

export type OnboardingCompletionMode = "finish" | "skip" | null;

export async function applyWidgetRecommendations({
  widgetIds,
  selectedConcerns,
  completionMode,
}: {
  widgetIds: string[];
  selectedConcerns: ConcernKey[] | null;
  completionMode: OnboardingCompletionMode;
}) {
  const client = requireSupabase();
  const { error } = await client.rpc("apply_widget_recommendations", {
    p_widget_ids: widgetIds,
    p_selected_concerns: selectedConcerns,
    p_completion_mode: completionMode,
  });
  if (error) throw error;
}
