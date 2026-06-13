// Central registry of every draft store created via createDraftStore /
// createWizardDraftStore. Those stores are module-level singletons that hold
// in-progress form values — including PHI (CBT thought records: situation,
// automatic thoughts, emotions, evidence). They survive sign-out, so the session
// provider must reset them on SIGNED_OUT alongside clearing the QueryClient.
//
// Auto-registration (the factories push each store here) keeps this exhaustive:
// a new draft store is covered without anyone remembering to add it to a list.

interface ResettableStore {
  getState: () => { reset: () => void };
}

const draftStores = new Set<ResettableStore>();

export function registerDraftStore(store: ResettableStore): void {
  draftStores.add(store);
}

/** Reset every registered draft store to its empty initial state. */
export function resetAllDraftStores(): void {
  for (const store of draftStores) {
    store.getState().reset();
  }
}
