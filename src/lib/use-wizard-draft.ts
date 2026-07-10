import { useEffect, useRef } from "react";
import { type FieldPath, type FieldValues, type UseFormReturn } from "react-hook-form";
import { type StoreApi, type UseBoundStore } from "zustand";

import { useSingleFlight } from "@/src/lib/use-single-flight";
import { WIZARD_DRAFT_TTL_MS, type WizardDraftStore } from "@/src/stores/create-wizard-draft-store";
import { useToastStore } from "@/src/stores/toast-store";

type WizardStoreHook<TForm> = UseBoundStore<StoreApi<WizardDraftStore<TForm>>>;

// One persist write at most ~every 800ms while typing: fast enough that an
// accidental refresh loses a sentence at worst, slow enough that AsyncStorage
// is not hammered on every keystroke.
const DRAFT_CAPTURE_DEBOUNCE_MS = 800;

interface UseWizardDraftArgs<TForm extends FieldValues, TSaved> {
  useDraftStore: WizardStoreHook<TForm>;
  draftMode: "create" | "edit";
  entityId: string | null;
  stepFields: readonly (readonly FieldPath<TForm>[])[];
  form: UseFormReturn<TForm>;
  onSave: (values: TForm) => Promise<TSaved>;
  onSaved: (saved: TSaved) => void;
  onError?: (message: string) => void;
  toastLabels: {
    saved: string;
    problem: string;
    fallbackError: string;
  };
}

interface UseWizardDraftReturn {
  stepIndex: number;
  isLastStep: boolean;
  isPending: boolean;
  /** False until the persisted draft has been read back - gate the form on it. */
  hydrated: boolean;
  handleNext: () => Promise<void>;
  handleSave: () => Promise<void>;
  previousStep: () => void;
  goToStep: (index: number) => void;
}

export function useWizardDraft<TForm extends FieldValues, TSaved>({
  useDraftStore,
  draftMode,
  entityId,
  stepFields,
  form,
  onSave,
  onSaved,
  onError,
  toastLabels,
}: UseWizardDraftArgs<TForm, TSaved>): UseWizardDraftReturn {
  const rawStepIndex = useDraftStore((state) => state.stepIndex);
  const storeHydrated = useDraftStore((state) => state.hydrated);
  const hydrate = useDraftStore((state) => state.hydrate);
  const nextStep = useDraftStore((state) => state.nextStep);
  const previousStep = useDraftStore((state) => state.previousStep);
  const reset = useDraftStore((state) => state.reset);
  const setValues = useDraftStore((state) => state.setValues);
  const setStepIndex = useDraftStore((state) => state.setStepIndex);
  const clearPersisted = useDraftStore((state) => state.clearPersisted);
  const showToast = useToastStore((state) => state.showToast);
  const captureTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    hydrate(draftMode, entityId);
  }, [draftMode, entityId, hydrate]);

  // Capture in-progress values into the (persisted) draft store, debounced -
  // this is what survives a refresh or app kill mid-wizard.
  useEffect(() => {
    const subscription = form.watch(() => {
      if (captureTimerRef.current) clearTimeout(captureTimerRef.current);
      captureTimerRef.current = setTimeout(() => {
        captureTimerRef.current = null;
        setValues(form.getValues());
      }, DRAFT_CAPTURE_DEBOUNCE_MS);
    });

    return () => {
      if (captureTimerRef.current) {
        clearTimeout(captureTimerRef.current);
        captureTimerRef.current = null;
      }
      subscription.unsubscribe();
    };
  }, [form, setValues]);

  // If rehydration finishes AFTER the form mounted (web refresh straight onto a
  // wizard URL: AsyncStorage resolves a beat after first render), the form was
  // initialized with empty defaults even though a draft exists. Restore it once,
  // as long as the user has not started typing into the fresh form and the draft
  // is still within its TTL (the merge guard checks age at rehydrate; this covers
  // a tab left open long enough that the draft expired in between).
  //
  // RHF's formState is a Proxy: a field is only TRACKED (and kept current) if it
  // is read during RENDER. isDirty is destructured here - never inside the effect
  // below - so the restore guard sees a live value, not a permanently-false one.
  const { isDirty, isSubmitting } = form.formState;
  const sawHydrationRef = useRef(storeHydrated);
  useEffect(() => {
    if (sawHydrationRef.current || !storeHydrated) return;
    sawHydrationRef.current = true;
    const state = useDraftStore.getState();
    const fresh = state.updatedAt !== null && Date.now() - state.updatedAt <= WIZARD_DRAFT_TTL_MS;
    if (
      state.mode === draftMode &&
      state.entityId === entityId &&
      state.values &&
      fresh &&
      !isDirty
    ) {
      form.reset(state.values);
    }
  }, [storeHydrated, draftMode, entityId, form, isDirty, useDraftStore]);

  const stepIndex = Math.min(rawStepIndex, stepFields.length - 1);
  const isLastStep = stepIndex === stepFields.length - 1;
  const isPending = isSubmitting;

  const handleNext = async () => {
    const fields = stepFields[stepIndex];
    const isValid = await form.trigger(fields as FieldPath<TForm>[]);
    if (isValid) {
      // Step transitions are natural pause points - persist immediately instead
      // of waiting out the debounce.
      setValues(form.getValues());
      nextStep(stepFields.length - 1);
    }
  };

  const submitForm = form.handleSubmit(
    async (values) => {
      setValues(values);
      try {
        const saved = await onSave(values);
        // The record is saved - the draft (memory AND disk; it holds PHI) must go.
        // Cancel any debounced capture first so it cannot resurrect the draft
        // after the reset.
        if (captureTimerRef.current) {
          clearTimeout(captureTimerRef.current);
          captureTimerRef.current = null;
        }
        reset();
        clearPersisted();
        showToast({ title: toastLabels.saved, tone: "success" });
        onSaved(saved);
      } catch (e) {
        const message = e instanceof Error ? e.message : toastLabels.fallbackError;
        onError?.(message);
        showToast({ title: toastLabels.problem, description: message, tone: "error" });
      }
    },
    (fieldErrors) => {
      // A field on an EARLIER step can be invalid at save time (an overlong paste,
      // a rehydrated draft the schema rejects) - per-step trigger() never re-checks
      // it, and without this handler Save would silently no-op. Jump to the first
      // step that owns an invalid field so its inline message is visible, and
      // raise the problem toast so the jump is explained.
      const failingStep = stepFields.findIndex((fields) =>
        fields.some((field) => field.split(".")[0] in fieldErrors),
      );
      if (failingStep >= 0 && failingStep !== stepIndex) {
        setStepIndex(failingStep);
      }
      showToast({ title: toastLabels.problem, tone: "error" });
    },
  );
  // RHF's handleSubmit does NOT block re-entrant calls (isSubmitting is React state that
  // hasn't re-rendered between two rapid presses), so a double-press on the final wizard
  // step would insert the record twice without this guard.
  const handleSave = useSingleFlight(async () => {
    await submitForm();
  });

  return {
    stepIndex,
    isLastStep,
    isPending,
    hydrated: storeHydrated,
    handleNext,
    handleSave,
    previousStep,
    goToStep: (index) => {
      if (index <= stepIndex) setStepIndex(index);
    },
  };
}

export function selectWizardDraftValues<TForm>(
  draftMode: "create" | "edit",
  entityId: string | null,
) {
  return (state: WizardDraftStore<TForm>): TForm | null =>
    state.mode === draftMode && state.entityId === entityId ? state.values : null;
}
