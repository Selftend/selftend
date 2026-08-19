import { useState } from "react";
import type { UseFormGetValues } from "react-hook-form";
import { useTranslation } from "react-i18next";

import {
  addCopingStep as addCopingStepToDraft,
  removeCopingStep as removeCopingStepFromDraft,
  updateCopingStep as updateCopingStepInDraft,
  type ChallengeDraft,
} from "@/src/features/recovery/challenge-draft";
import { sanitizeRecoveryValues, toEditableList } from "@/src/features/recovery/form-values";
import type {
  useDeleteChallengePlan,
  useSaveChallengePlan,
  useUpsertRecoveryPlan,
} from "@/src/features/recovery/queries";
import {
  challengePlanFormSchema,
  type RecoveryPlanFormSchema,
} from "@/src/features/recovery/schemas";
import type { ChallengePlan } from "@/src/features/recovery/types";
import { useSingleFlight } from "@/src/lib/use-single-flight";
import { useToastStore } from "@/src/stores/toast-store";

interface UseChallengeEditorArgs {
  getValues: UseFormGetValues<RecoveryPlanFormSchema>;
  upsertRecoveryMutation: ReturnType<typeof useUpsertRecoveryPlan>;
  saveChallengeMutation: ReturnType<typeof useSaveChallengePlan>;
  deleteChallengeMutation: ReturnType<typeof useDeleteChallengePlan>;
}

/**
 * Owns the challenge-plan draft state machine: seeding a draft from a plan, starting a
 * blank draft, editing description + coping steps (via the pure draft transforms), the
 * single-flight save (validate → upsert recovery plan for its id → save challenge →
 * clear draft), and delete. Moved verbatim from the screen; the single-flight ordering
 * is preserved exactly.
 */
export function useChallengeEditor({
  getValues,
  upsertRecoveryMutation,
  saveChallengeMutation,
  deleteChallengeMutation,
}: UseChallengeEditorArgs) {
  const { t } = useTranslation("cbt");
  const showToast = useToastStore((state) => state.showToast);

  const [challengeDraft, setChallengeDraft] = useState<ChallengeDraft | null>(null);

  const startEditingChallenge = (plan: ChallengePlan) => {
    setChallengeDraft({
      id: plan.id,
      challengeDescription: plan.challengeDescription,
      copingSteps: toEditableList(plan.copingSteps),
    });
  };

  const startNewChallenge = () => {
    setChallengeDraft({ challengeDescription: "", copingSteps: [""] });
  };

  const cancelChallenge = () => {
    setChallengeDraft(null);
  };

  const updateChallengeDescription = (value: string) => {
    setChallengeDraft((draft) => (draft ? { ...draft, challengeDescription: value } : draft));
  };

  // Create-capable (a new challenge draft has no id yet -> INSERT), so a rapid
  // double-press must not save the challenge plan twice.
  const handleSaveChallenge = useSingleFlight(async () => {
    if (!challengeDraft) return;

    const parsed = challengePlanFormSchema.safeParse({
      challengeDescription: challengeDraft.challengeDescription,
      copingSteps: challengeDraft.copingSteps.filter((step) => step.trim().length > 0),
    });

    if (!parsed.success) {
      showToast({
        title: t("common:feedback.problem"),
        description: t("recovery.saveError"),
        tone: "error",
      });
      return;
    }

    try {
      const plan = await upsertRecoveryMutation.mutateAsync(sanitizeRecoveryValues(getValues()));
      await saveChallengeMutation.mutateAsync({
        recoveryPlanId: plan.id,
        input: parsed.data,
        challengePlanId: challengeDraft.id,
      });
      setChallengeDraft(null);
      showToast({ title: t("common:feedback.saved"), tone: "success" });
    } catch {
      // The thrown message is a backend/internal string, English for every user -
      // translated copy only (i18n rule, #1060). The mutation cache's global onError
      // already reports the failure to Sentry.
      showToast({
        title: t("common:feedback.problem"),
        description: t("recovery.saveError"),
        tone: "error",
      });
    }
  });

  const handleDeleteChallenge = async (challengePlanId: string) => {
    try {
      await deleteChallengeMutation.mutateAsync(challengePlanId);
      if (challengeDraft?.id === challengePlanId) {
        setChallengeDraft(null);
      }
      showToast({ title: t("common:feedback.saved"), tone: "success" });
    } catch {
      // The thrown message is a backend/internal string, English for every user -
      // translated copy only (i18n rule, #1060). The mutation cache's global onError
      // already reports the failure to Sentry.
      showToast({
        title: t("common:feedback.problem"),
        description: t("recovery.saveError"),
        tone: "error",
      });
    }
  };

  const updateCopingStep = (index: number, value: string) => {
    setChallengeDraft((draft) => (draft ? updateCopingStepInDraft(draft, index, value) : draft));
  };

  const addCopingStep = () => {
    setChallengeDraft((draft) => (draft ? addCopingStepToDraft(draft) : draft));
  };

  const removeCopingStep = (index: number) => {
    setChallengeDraft((draft) => (draft ? removeCopingStepFromDraft(draft, index) : draft));
  };

  return {
    challengeDraft,
    startEditingChallenge,
    startNewChallenge,
    cancelChallenge,
    updateChallengeDescription,
    handleSaveChallenge,
    handleDeleteChallenge,
    updateCopingStep,
    addCopingStep,
    removeCopingStep,
  };
}
