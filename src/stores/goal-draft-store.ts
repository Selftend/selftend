import type { GoalFormSchema } from "@/src/features/goals/schemas";
import { createWizardDraftStore } from "@/src/stores/create-wizard-draft-store";

export const useGoalDraftStore = createWizardDraftStore<GoalFormSchema>();
