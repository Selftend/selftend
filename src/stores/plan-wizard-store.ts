import { create } from "zustand";

import type { PlanConcern, PlanRoutine, PlanTool } from "@/src/features/plan/generate-plan";

interface PlanWizardState {
  stepIndex: number;
  concerns: PlanConcern[];
  tools: PlanTool[];
  routine: PlanRoutine | null;
  nextStep: () => void;
  previousStep: () => void;
  setConcerns: (concerns: PlanConcern[]) => void;
  setTools: (tools: PlanTool[]) => void;
  setRoutine: (routine: PlanRoutine) => void;
  reset: () => void;
}

export const usePlanWizardStore = create<PlanWizardState>((set) => ({
  stepIndex: 0,
  concerns: [],
  tools: [],
  routine: null,
  nextStep: () => set((state) => ({ stepIndex: Math.min(state.stepIndex + 1, 3) })),
  previousStep: () => set((state) => ({ stepIndex: Math.max(state.stepIndex - 1, 0) })),
  setConcerns: (concerns) => set({ concerns }),
  setTools: (tools) => set({ tools }),
  setRoutine: (routine) => set({ routine }),
  reset: () => set({ stepIndex: 0, concerns: [], tools: [], routine: null }),
}));
