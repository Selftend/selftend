import { create } from "zustand";

import type { ExposureHierarchyFormSchema } from "@/src/features/exposure/schemas";

interface ExposureDraftState {
  stepIndex: number;
  values: ExposureHierarchyFormSchema | null;
  nextStep: (maxStepIndex: number) => void;
  previousStep: () => void;
  reset: () => void;
  setValues: (values: ExposureHierarchyFormSchema) => void;
  setStepIndex: (stepIndex: number) => void;
}

export const useExposureDraftStore = create<ExposureDraftState>((set) => ({
  stepIndex: 0,
  values: null,
  nextStep: (maxStepIndex) =>
    set((state) => ({ stepIndex: Math.min(state.stepIndex + 1, maxStepIndex) })),
  previousStep: () =>
    set((state) => ({ stepIndex: Math.max(state.stepIndex - 1, 0) })),
  reset: () => set({ stepIndex: 0, values: null }),
  setValues: (values) => set({ values }),
  setStepIndex: (stepIndex) => set({ stepIndex }),
}));
