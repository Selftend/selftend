import { create } from "zustand";

import type { GoalFormSchema } from "@/src/features/goals/schemas";

type DraftMode = "create" | "edit";

interface GoalDraftState {
  mode: DraftMode;
  goalId: string | null;
  stepIndex: number;
  values: GoalFormSchema | null;
  hydrate: (mode: DraftMode, goalId?: string | null) => void;
  nextStep: (maxStepIndex: number) => void;
  previousStep: () => void;
  reset: () => void;
  setValues: (values: GoalFormSchema) => void;
  setStepIndex: (stepIndex: number) => void;
}

export const useGoalDraftStore = create<GoalDraftState>((set) => ({
  mode: "create",
  goalId: null,
  stepIndex: 0,
  values: null,
  hydrate: (mode, goalId = null) =>
    set((state) => {
      const isSameDraft = state.mode === mode && state.goalId === goalId;
      return {
        mode,
        goalId,
        stepIndex: isSameDraft ? state.stepIndex : 0,
        values: isSameDraft ? state.values : null,
      };
    }),
  nextStep: (maxStepIndex) =>
    set((state) => ({ stepIndex: Math.min(state.stepIndex + 1, maxStepIndex) })),
  previousStep: () => set((state) => ({ stepIndex: Math.max(state.stepIndex - 1, 0) })),
  reset: () => set({ mode: "create", goalId: null, stepIndex: 0, values: null }),
  setValues: (values) => set({ values }),
  setStepIndex: (stepIndex) => set({ stepIndex }),
}));
