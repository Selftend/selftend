import { useEffect } from "react";
import { type FieldPath, type FieldValues, type UseFormReturn } from "react-hook-form";
import { type StoreApi, type UseBoundStore } from "zustand";

import { type WizardDraftStore } from "@/src/stores/create-wizard-draft-store";
import { useToastStore } from "@/src/stores/toast-store";

export type WizardStoreHook<TForm> = UseBoundStore<StoreApi<WizardDraftStore<TForm>>>;

interface UseWizardDraftArgs<TForm extends FieldValues, TSaved> {
  store: WizardStoreHook<TForm>;
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
  handleNext: () => Promise<void>;
  handleSave: () => Promise<void>;
  previousStep: () => void;
  goToStep: (index: number) => void;
}

export function useWizardDraft<TForm extends FieldValues, TSaved>({
  store,
  draftMode,
  entityId,
  stepFields,
  form,
  onSave,
  onSaved,
  onError,
  toastLabels,
}: UseWizardDraftArgs<TForm, TSaved>): UseWizardDraftReturn {
  const rawStepIndex = store((state) => state.stepIndex);
  const hydrate = store((state) => state.hydrate);
  const nextStep = store((state) => state.nextStep);
  const previousStep = store((state) => state.previousStep);
  const reset = store((state) => state.reset);
  const setValues = store((state) => state.setValues);
  const setStepIndex = store((state) => state.setStepIndex);
  const showToast = useToastStore((state) => state.showToast);

  useEffect(() => {
    hydrate(draftMode, entityId);
  }, [draftMode, entityId, hydrate]);

  const stepIndex = Math.min(rawStepIndex, stepFields.length - 1);
  const isLastStep = stepIndex === stepFields.length - 1;
  const isPending = form.formState.isSubmitting;

  const handleNext = async () => {
    const fields = stepFields[stepIndex];
    const isValid = await form.trigger(fields as FieldPath<TForm>[]);
    if (isValid) nextStep(stepFields.length - 1);
  };

  const handleSave = form.handleSubmit(async (values) => {
    setValues(values);
    try {
      const saved = await onSave(values);
      reset();
      showToast({ title: toastLabels.saved, tone: "success" });
      onSaved(saved);
    } catch (e) {
      const message = e instanceof Error ? e.message : toastLabels.fallbackError;
      onError?.(message);
      showToast({ title: toastLabels.problem, description: message, tone: "error" });
    }
  });

  return {
    stepIndex,
    isLastStep,
    isPending,
    handleNext: async () => {
      await handleNext();
    },
    handleSave: async () => {
      await handleSave();
    },
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
