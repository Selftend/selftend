import type { RecoveryPlanFormSchema } from "@/src/features/recovery/schemas";

export const defaultValues: RecoveryPlanFormSchema = {
  recoveryKeys: [""],
  personalSlogan: "",
  strategyIntegrationNotes: {},
  maintenanceCommitments: [""],
};

export function toEditableList(values: string[]) {
  return values.length > 0 ? values : [""];
}

export function sanitizeRecoveryValues(values: RecoveryPlanFormSchema) {
  return {
    recoveryKeys: values.recoveryKeys.map((value) => value.trim()).filter(Boolean),
    personalSlogan: values.personalSlogan.trim(),
    strategyIntegrationNotes: Object.fromEntries(
      Object.entries(values.strategyIntegrationNotes)
        .map(([key, value]) => [key, value.trim()] as const)
        .filter(([, value]) => value.length > 0),
    ),
    maintenanceCommitments: values.maintenanceCommitments
      .map((value) => value.trim())
      .filter(Boolean),
  };
}
