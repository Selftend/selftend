import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect } from "react";
import { useForm, useWatch } from "react-hook-form";
import { useTranslation } from "react-i18next";

import {
  defaultValues,
  sanitizeRecoveryValues,
  toEditableList,
} from "@/src/features/recovery/form-values";
import type { useUpsertRecoveryPlan } from "@/src/features/recovery/queries";
import {
  recoveryPlanFormSchema,
  type RecoveryPlanFormSchema,
} from "@/src/features/recovery/schemas";
import type { RecoveryPlan } from "@/src/features/recovery/types";
import { type StrategyKey } from "@/src/features/cbt/strategies";
import { useStringListField } from "@/src/lib/use-string-list-field";
import { useToastStore } from "@/src/stores/toast-store";

interface UseRecoveryPlanFormArgs {
  recoveryPlan: RecoveryPlan | null | undefined;
  upsertRecoveryMutation: ReturnType<typeof useUpsertRecoveryPlan>;
}

/**
 * Owns the recovery-plan form: `useForm` + zod resolver, the two string-list fields,
 * the hydration effect (reset from a loaded plan), the strategy-note merge helper, and
 * the submit → upsert → toast save handler. Extracted verbatim from the screen; effect
 * deps (`[recoveryPlan, reset]`) and `setValue`/`shouldDirty` options are unchanged.
 */
export function useRecoveryPlanForm({
  recoveryPlan,
  upsertRecoveryMutation,
}: UseRecoveryPlanFormArgs) {
  const { t } = useTranslation("cbt");
  const showToast = useToastStore((state) => state.showToast);

  const form = useForm<RecoveryPlanFormSchema>({
    defaultValues,
    resolver: zodResolver(recoveryPlanFormSchema),
  });
  const {
    control,
    formState: { isSubmitting },
    getValues,
    handleSubmit,
    reset,
    setValue,
  } = form;

  const strategyIntegrationNotes = useWatch({ control, name: "strategyIntegrationNotes" });

  const recoveryKeysField = useStringListField(form, "recoveryKeys", {
    shouldDirty: true,
    keepAtLeastOne: true,
  });
  const maintenanceCommitmentsField = useStringListField(form, "maintenanceCommitments", {
    shouldDirty: true,
    keepAtLeastOne: true,
  });

  useEffect(() => {
    if (!recoveryPlan) return;
    reset({
      recoveryKeys: toEditableList(recoveryPlan.recoveryKeys),
      personalSlogan: recoveryPlan.personalSlogan,
      strategyIntegrationNotes: recoveryPlan.strategyIntegrationNotes,
      maintenanceCommitments: toEditableList(recoveryPlan.maintenanceCommitments),
    });
  }, [recoveryPlan, reset]);

  const updateStrategyNote = (strategyKey: StrategyKey, value: string) => {
    setValue(
      "strategyIntegrationNotes",
      {
        ...strategyIntegrationNotes,
        [strategyKey]: value,
      },
      { shouldDirty: true },
    );
  };

  const handleSaveRecoveryPlan = handleSubmit(async (values) => {
    try {
      await upsertRecoveryMutation.mutateAsync(sanitizeRecoveryValues(values));
      showToast({ title: t("common:feedback.saved"), tone: "success" });
    } catch (error) {
      const message = error instanceof Error ? error.message : t("recovery.saveError");
      showToast({ title: t("common:feedback.problem"), description: message, tone: "error" });
    }
  });

  return {
    control,
    getValues,
    isSubmitting,
    recoveryKeysField,
    maintenanceCommitmentsField,
    strategyIntegrationNotes,
    updateStrategyNote,
    handleSaveRecoveryPlan,
  };
}
