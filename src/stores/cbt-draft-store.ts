import { create } from "zustand";

import type { ThoughtRecordFormSchema } from "@/src/features/cbt/schemas";

type DraftMode = "create" | "edit";

interface CbtDraftState {
  mode: DraftMode;
  recordId: string | null;
  stepIndex: number;
  values: ThoughtRecordFormSchema | null;
  clearValues: () => void;
  hydrate: (mode: DraftMode, recordId?: string | null) => void;
  nextStep: (maxStepIndex: number) => void;
  previousStep: () => void;
  reset: () => void;
  setValues: (values: ThoughtRecordFormSchema) => void;
  setStepIndex: (stepIndex: number) => void;
}

export const useCbtDraftStore = create<CbtDraftState>((set) => ({
  mode: "create",
  recordId: null,
  stepIndex: 0,
  values: null,
  clearValues: () => set({ values: null }),
  hydrate: (mode, recordId = null) =>
    set((state) => {
      const isSameDraft = state.mode === mode && state.recordId === recordId;

      return {
        mode,
        recordId,
        stepIndex: isSameDraft ? state.stepIndex : 0,
        values: isSameDraft ? state.values : null,
      };
    }),
  nextStep: (maxStepIndex) =>
    set((state) => ({
      stepIndex: Math.min(state.stepIndex + 1, maxStepIndex),
    })),
  previousStep: () =>
    set((state) => ({
      stepIndex: Math.max(state.stepIndex - 1, 0),
    })),
  reset: () =>
    set({
      mode: "create",
      recordId: null,
      stepIndex: 0,
      values: null,
    }),
  setValues: (values) => set({ values }),
  setStepIndex: (stepIndex) => set({ stepIndex }),
}));
