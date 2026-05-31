import { create } from "zustand";

interface DraftStore<TValues> {
  entityId: string | null;
  values: TValues | null;
  hydrate: (entityId?: string | null) => void;
  reset: () => void;
  setValues: (values: TValues) => void;
}

export function createDraftStore<TValues>() {
  return create<DraftStore<TValues>>((set) => ({
    entityId: null,
    values: null,
    hydrate: (entityId = null) =>
      set((state) => ({
        entityId,
        values: state.entityId === entityId ? state.values : null,
      })),
    reset: () => set({ entityId: null, values: null }),
    setValues: (values) => set({ values }),
  }));
}
