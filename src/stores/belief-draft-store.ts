import { create } from "zustand";

import type { CoreBeliefFormSchema } from "@/src/features/beliefs/schemas";

type DraftMode = "create" | "edit";

interface BeliefDraftState {
  mode: DraftMode;
  beliefId: string | null;
  stepIndex: number;
  values: CoreBeliefFormSchema | null;
  hydrate: (mode: DraftMode, beliefId?: string | null) => void;
  nextStep: (maxStepIndex: number) => void;
  previousStep: () => void;
  reset: () => void;
  setValues: (values: CoreBeliefFormSchema) => void;
  setStepIndex: (stepIndex: number) => void;
}

export const useBeliefDraftStore = create<BeliefDraftState>((set) => ({
  mode: "create",
  beliefId: null,
  stepIndex: 0,
  values: null,
  hydrate: (mode, beliefId = null) =>
    set((state) => {
      const isSameDraft = state.mode === mode && state.beliefId === beliefId;
      return {
        mode,
        beliefId,
        stepIndex: isSameDraft ? state.stepIndex : 0,
        values: isSameDraft ? state.values : null,
      };
    }),
  nextStep: (maxStepIndex) =>
    set((state) => ({ stepIndex: Math.min(state.stepIndex + 1, maxStepIndex) })),
  previousStep: () =>
    set((state) => ({ stepIndex: Math.max(state.stepIndex - 1, 0) })),
  reset: () => set({ mode: "create", beliefId: null, stepIndex: 0, values: null }),
  setValues: (values) => set({ values }),
  setStepIndex: (stepIndex) => set({ stepIndex }),
}));
