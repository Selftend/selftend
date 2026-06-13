import { create } from "zustand";

import { registerDraftStore } from "@/src/stores/draft-store-registry";

type DraftMode = "create" | "edit";

export interface WizardDraftStore<TValues> {
  mode: DraftMode;
  entityId: string | null;
  stepIndex: number;
  values: TValues | null;
  hydrate: (mode: DraftMode, entityId?: string | null) => void;
  nextStep: (maxStepIndex: number) => void;
  previousStep: () => void;
  reset: () => void;
  setValues: (values: TValues) => void;
  setStepIndex: (stepIndex: number) => void;
}

export function createWizardDraftStore<TValues>() {
  const store = create<WizardDraftStore<TValues>>((set) => ({
    mode: "create",
    entityId: null,
    stepIndex: 0,
    values: null,
    hydrate: (mode, entityId = null) =>
      set((state) => {
        const isSameDraft = state.mode === mode && state.entityId === entityId;
        return {
          mode,
          entityId,
          stepIndex: isSameDraft ? state.stepIndex : 0,
          values: isSameDraft ? state.values : null,
        };
      }),
    nextStep: (maxStepIndex) =>
      set((state) => ({ stepIndex: Math.min(state.stepIndex + 1, maxStepIndex) })),
    previousStep: () => set((state) => ({ stepIndex: Math.max(state.stepIndex - 1, 0) })),
    reset: () => set({ mode: "create", entityId: null, stepIndex: 0, values: null }),
    setValues: (values) => set({ values }),
    setStepIndex: (stepIndex) => set({ stepIndex }),
  }));
  // Reset on sign-out clears any resident PHI (see draft-store-registry).
  registerDraftStore(store);
  return store;
}
