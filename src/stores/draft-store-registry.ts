// Central registry of every draft store created via createDraftStore /
// createWizardDraftStore. Those stores are module-level singletons that hold
// in-progress form values - including PHI (CBT thought records: situation,
// automatic thoughts, emotions, evidence). They survive sign-out, so the session
// provider must reset them on SIGNED_OUT alongside clearing the QueryClient.
//
// Auto-registration (the factories push each store here) keeps this exhaustive:
// a new draft store is covered without anyone remembering to add it to a list.
import AsyncStorage from "@react-native-async-storage/async-storage";

// Single source of truth for the persisted wizard-draft key namespace: the key
// builder in createWizardDraftStore and the sign-out purge below both use it,
// so they cannot drift apart.
export const WIZARD_DRAFT_STORAGE_PREFIX = "selftend:wizard-draft:";

interface ResettableStore {
  getState: () => { reset: () => void; clearPersisted?: () => void };
}

const draftStores = new Set<ResettableStore>();

export function registerDraftStore(store: ResettableStore): void {
  draftStores.add(store);
}

/**
 * Remove every persisted wizard draft from AsyncStorage BY KEY PREFIX,
 * independent of which store modules the current JS context has evaluated.
 *
 * This is the actual disk guarantee on sign-out: registration happens at
 * module evaluation, so a store whose screen was never visited in THIS page
 * load is not in the registry - but its draft (PHI typed in a previous page
 * load) is still on disk. Proven leak without this: type into a wizard, hard
 * page load elsewhere, sign out, next account on the same browser sees the
 * previous user's draft.
 */
export async function purgePersistedWizardDrafts(): Promise<void> {
  const keys = await AsyncStorage.getAllKeys();
  const draftKeys = keys.filter((key) => key.startsWith(WIZARD_DRAFT_STORAGE_PREFIX));
  if (draftKeys.length > 0) {
    await AsyncStorage.multiRemove(draftKeys);
  }
}

/**
 * Reset every REGISTERED draft store to its empty initial state (in-memory
 * PHI). Disk removal for stores registered in this context happens via their
 * clearPersisted; the registration-independent disk guarantee is
 * purgePersistedWizardDrafts(), which the session provider runs alongside
 * this on SIGNED_OUT.
 */
export function resetAllDraftStores(): void {
  for (const store of draftStores) {
    const state = store.getState();
    state.reset();
    state.clearPersisted?.();
  }
}
