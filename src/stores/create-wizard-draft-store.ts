import AsyncStorage from "@react-native-async-storage/async-storage";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

import { registerDraftStore, WIZARD_DRAFT_STORAGE_PREFIX } from "@/src/stores/draft-store-registry";

type DraftMode = "create" | "edit";

// Bump when the persisted shape changes incompatibly; zustand's persist drops
// stored state whose version differs (no migrate function on purpose - a lost
// draft beats a wrongly-migrated one).
//
// Bumping is a BLUNT instrument: this constant is shared by every wizard, so a
// bump discards in-flight drafts in every flow, not just the one whose shape
// changed. #1376 added a field to the thought record form and reached for a bump
// first; making that field `.nullish()` in the CBT schema kept the fix local and
// left this at 1. Prefer tolerating the older shape in the flow's own schema.
//
// Exported so tests can write fixtures at the CURRENT version. A fixture that
// hardcodes a number silently stops testing what it claims the moment this is
// bumped: zustand discards a version-mismatched blob before any of the TTL or
// shape guards below ever run, so the test would pass for the wrong reason.
export const WIZARD_DRAFT_PERSIST_VERSION = 1;

// Drafts older than this are dropped on rehydrate. A day-old half-filled wizard
// is more likely stale intent than a work-in-progress, and the guard doubles as
// a cap on how long unfinished PHI lingers on disk.
export const WIZARD_DRAFT_TTL_MS = 24 * 60 * 60 * 1000;

export interface WizardDraftStore<TValues> {
  mode: DraftMode;
  entityId: string | null;
  stepIndex: number;
  values: TValues | null;
  /** Last time values/stepIndex changed - drives the rehydrate TTL. */
  updatedAt: number | null;
  /** True once the persisted draft (if any) has been read back from storage. */
  hydrated: boolean;
  hydrate: (mode: DraftMode, entityId?: string | null) => void;
  nextStep: (maxStepIndex: number) => void;
  previousStep: () => void;
  reset: () => void;
  setValues: (values: TValues) => void;
  setStepIndex: (stepIndex: number) => void;
  /** Remove the persisted copy from disk (memory state is untouched). */
  clearPersisted: () => void;
}

interface PersistedWizardDraft<TValues> {
  mode: DraftMode;
  entityId: string | null;
  stepIndex: number;
  values: TValues | null;
  updatedAt: number | null;
}

// The rehydrate merge-guard: only accept a persisted draft that is fresh and
// still LOOKS like a draft. `values` reaches zodResolver as form defaultValues,
// so a shape from an older app version must be dropped here rather than crash
// the wizard. (Field-level shape checks belong to each flow's schema; this
// guard only rejects structurally impossible payloads.)
function isUsablePersistedDraft<TValues>(
  persisted: unknown,
): persisted is PersistedWizardDraft<TValues> {
  if (!persisted || typeof persisted !== "object" || Array.isArray(persisted)) return false;
  const draft = persisted as Partial<PersistedWizardDraft<TValues>>;
  if (draft.mode !== "create" && draft.mode !== "edit") return false;
  if (draft.entityId !== null && typeof draft.entityId !== "string") return false;
  if (typeof draft.stepIndex !== "number" || !Number.isFinite(draft.stepIndex)) return false;
  // An EMPTY envelope (no values captured yet - every wizard mount persists one
  // via hydrate()) is valid and has no PHI and nothing to expire. Rejecting it
  // would schedule the merge's disk-clear below, which could race and wipe the
  // very next real draft write.
  if (draft.values === null || draft.values === undefined) {
    return draft.updatedAt === null || typeof draft.updatedAt === "number";
  }
  if (typeof draft.values !== "object" || Array.isArray(draft.values)) return false;
  if (typeof draft.updatedAt !== "number") return false;
  return Date.now() - draft.updatedAt <= WIZARD_DRAFT_TTL_MS;
}

/**
 * Wizard draft store, persisted to AsyncStorage so an accidental refresh or
 * app kill mid-wizard does not lose several steps of writing.
 *
 * - AsyncStorage, deliberately NOT SecureStore: drafts hold whole form value
 *   objects and routinely exceed SecureStore's ~2KB per-entry limit. The
 *   trade-off matches the persisted query cache (same storage, same PHI class);
 *   sign-out wipes both (see draft-store-registry).
 * - Multiple tabs (web): last-write-wins. No storage-event sync between tabs -
 *   two tabs editing the same wizard is rare enough that reconciling live is
 *   not worth the complexity; whichever tab wrote last leaves the draft.
 * - ONE draft per flow (accepted trade-off): the store holds a single
 *   mode+entityId draft, so opening the same wizard in edit mode wipes an
 *   unfinished create draft (and vice versa) via hydrate(). Cheap to hit only
 *   by deliberately interleaving flows; per-entity draft keys can revisit this
 *   if it ever bites.
 */
export function createWizardDraftStore<TValues>(flowKey: string) {
  const store = create<WizardDraftStore<TValues>>()(
    persist(
      // Every action body uses braces on purpose: with the persist middleware,
      // `set` returns the async storage write's promise, and an action that
      // leaked it (`() => set(...)`) would turn innocent `act(() => action())`
      // test calls into unawaited async act scopes (and invite stray `await`s).
      (set) => ({
        mode: "create" as DraftMode,
        entityId: null,
        stepIndex: 0,
        values: null,
        updatedAt: null,
        hydrated: false,
        hydrate: (mode, entityId = null) => {
          set((state) => {
            const isSameDraft = state.mode === mode && state.entityId === entityId;
            return {
              mode,
              entityId,
              stepIndex: isSameDraft ? state.stepIndex : 0,
              values: isSameDraft ? state.values : null,
            };
          });
        },
        nextStep: (maxStepIndex) => {
          set((state) => ({
            stepIndex: Math.min(state.stepIndex + 1, maxStepIndex),
            updatedAt: Date.now(),
          }));
        },
        previousStep: () => {
          set((state) => ({ stepIndex: Math.max(state.stepIndex - 1, 0) }));
        },
        reset: () => {
          set({ mode: "create", entityId: null, stepIndex: 0, values: null, updatedAt: null });
        },
        setValues: (values) => {
          set({ values, updatedAt: Date.now() });
        },
        setStepIndex: (stepIndex) => {
          set({ stepIndex, updatedAt: Date.now() });
        },
        clearPersisted: () => {
          void store.persist.clearStorage();
        },
      }),
      {
        name: `${WIZARD_DRAFT_STORAGE_PREFIX}${flowKey}`,
        version: WIZARD_DRAFT_PERSIST_VERSION,
        storage: createJSONStorage(() => AsyncStorage),
        partialize: (state): PersistedWizardDraft<TValues> => ({
          mode: state.mode,
          entityId: state.entityId,
          stepIndex: state.stepIndex,
          values: state.values,
          updatedAt: state.updatedAt,
        }),
        merge: (persisted, current) => {
          if (isUsablePersistedDraft<TValues>(persisted)) {
            return { ...current, ...persisted };
          }
          if (persisted) {
            // The rejected draft (expired / shape-mismatched) holds PHI - remove
            // the disk copy now rather than leaving it until the next overwrite.
            // Deferred a tick so this cannot run during store construction.
            setTimeout(() => {
              void store.persist.clearStorage();
            }, 0);
          }
          return current;
        },
        onRehydrateStorage: () => () => {
          // Runs after rehydration settles (or fails) - either way the store's
          // answer is now authoritative, so consumers may mount their forms.
          store.setState({ hydrated: true });
        },
      },
    ),
  );
  // Reset on sign-out clears any resident PHI - including the persisted copy
  // on disk (see draft-store-registry).
  registerDraftStore(store);
  return store;
}
