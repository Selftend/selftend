import { create } from "zustand";

type DraftMode = "create" | "edit";

interface CbtDraftState {
  mode: DraftMode;
  recordId: string | null;
  stepIndex: number;
  hydrate: (mode: DraftMode, recordId?: string | null) => void;
  nextStep: (maxStepIndex: number) => void;
  previousStep: () => void;
  reset: () => void;
  setStepIndex: (stepIndex: number) => void;
}

export const useCbtDraftStore = create<CbtDraftState>((set) => ({
  mode: "create",
  recordId: null,
  stepIndex: 0,
  hydrate: (mode, recordId = null) =>
    set({
      mode,
      recordId,
      stepIndex: 0,
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
    }),
  setStepIndex: (stepIndex) => set({ stepIndex }),
}));
