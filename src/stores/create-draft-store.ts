import { create } from "zustand";

import { registerDraftStore } from "@/src/stores/draft-store-registry";

interface DraftStore<TValues> {
  entityId: string | null;
  values: TValues | null;
  hydrate: (entityId?: string | null) => void;
  reset: () => void;
  setValues: (values: TValues) => void;
}

export function createDraftStore<TValues>() {
  const store = create<DraftStore<TValues>>((set) => ({
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
  // Reset on sign-out clears any resident PHI (see draft-store-registry).
  registerDraftStore(store);
  return store;
}
