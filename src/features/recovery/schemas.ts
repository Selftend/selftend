import { z } from "zod";

import { userText } from "@/src/lib/zod-fields";

// Messages are i18n KEYS (resolved in the "cbt" namespace at render time via t()),
// not literals - so validation errors follow the in-app language, not English only.
export const recoveryPlanFormSchema = z.object({
  recoveryKeys: z.array(z.string()),
  personalSlogan: userText(2000),
  strategyIntegrationNotes: z.record(z.string(), userText(4000)),
  maintenanceCommitments: z.array(userText(2000)),
});

export const challengePlanFormSchema = z.object({
  challengeDescription: userText(4000, {
    min: 3,
    message: "recovery.validation.challengeDescription",
  }),
  copingSteps: z.array(userText(2000, { min: 1 })).min(1, "recovery.validation.copingSteps"),
});

export type RecoveryPlanFormSchema = z.infer<typeof recoveryPlanFormSchema>;
