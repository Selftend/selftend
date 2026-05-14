import { create } from "zustand";

import type { ActivityFormSchema } from "@/src/features/activities/schemas";

interface ActivityDraftState {
  activityId: string | null;
  values: ActivityFormSchema | null;
  hydrate: (activityId?: string | null) => void;
  reset: () => void;
  setValues: (values: ActivityFormSchema) => void;
}

export const useActivityDraftStore = create<ActivityDraftState>((set) => ({
  activityId: null,
  values: null,
  hydrate: (activityId = null) =>
    set((state) => ({
      activityId,
      values: state.activityId === activityId ? state.values : null,
    })),
  reset: () => set({ activityId: null, values: null }),
  setValues: (values) => set({ values }),
}));
