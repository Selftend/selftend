import { useCallback, useEffect, useRef } from "react";
import type { StoreApi, UseBoundStore } from "zustand";

import { WIZARD_DRAFT_TTL_MS, type WizardDraftStore } from "@/src/stores/create-wizard-draft-store";

type WizardStoreHook<TValues> = UseBoundStore<StoreApi<WizardDraftStore<TValues>>>;
const DRAFT_CAPTURE_DEBOUNCE_MS = 800;

/** Draft persistence for state-driven wizards that do not use React Hook Form. */
export function useStateWizardDraft<TValues>({
  useDraftStore,
  values,
  stepIndex,
  restore,
}: {
  useDraftStore: WizardStoreHook<TValues>;
  values: TValues;
  stepIndex: number;
  restore: (values: TValues, stepIndex: number) => void;
}) {
  const hydrated = useDraftStore((state) => state.hydrated);
  const hydrate = useDraftStore((state) => state.hydrate);
  const setValues = useDraftStore((state) => state.setValues);
  const setStepIndex = useDraftStore((state) => state.setStepIndex);
  const reset = useDraftStore((state) => state.reset);
  const clearPersisted = useDraftStore((state) => state.clearPersisted);
  const restoredRef = useRef(false);

  useEffect(() => hydrate("create", null), [hydrate]);

  useEffect(() => {
    if (!hydrated || restoredRef.current) return;
    restoredRef.current = true;
    const draft = useDraftStore.getState();
    const fresh = draft.updatedAt !== null && Date.now() - draft.updatedAt <= WIZARD_DRAFT_TTL_MS;
    if (draft.values && fresh) restore(draft.values, draft.stepIndex);
  }, [hydrated, restore, useDraftStore]);

  useEffect(() => {
    if (!hydrated || !restoredRef.current) return;
    const timeout = setTimeout(() => setValues(values), DRAFT_CAPTURE_DEBOUNCE_MS);
    return () => clearTimeout(timeout);
  }, [hydrated, setValues, values]);

  useEffect(() => {
    if (hydrated && restoredRef.current) setStepIndex(stepIndex);
  }, [hydrated, setStepIndex, stepIndex]);

  const clearDraft = useCallback(() => {
    reset();
    clearPersisted();
  }, [clearPersisted, reset]);

  return { hydrated, clearDraft };
}
