import { create } from "zustand";

import type { ProcrastinationTaskFormSchema } from "@/src/features/procrastination/schemas";

interface ProcrastinationDraftState {
  stepIndex: number;
  values: ProcrastinationTaskFormSchema | null;
  nextStep: (maxStepIndex: number) => void;
  previousStep: () => void;
  reset: () => void;
  setValues: (values: ProcrastinationTaskFormSchema) => void;
  setStepIndex: (stepIndex: number) => void;
}

export const useProcrastinationDraftStore = create<ProcrastinationDraftState>((set) => ({
  stepIndex: 0,
  values: null,
  nextStep: (maxStepIndex) =>
    set((state) => ({ stepIndex: Math.min(state.stepIndex + 1, maxStepIndex) })),
  previousStep: () => set((state) => ({ stepIndex: Math.max(state.stepIndex - 1, 0) })),
  reset: () => set({ stepIndex: 0, values: null }),
  setValues: (values) => set({ values }),
  setStepIndex: (stepIndex) => set({ stepIndex }),
}));
