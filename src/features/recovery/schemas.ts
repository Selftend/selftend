import { z } from "zod";

export const recoveryPlanFormSchema = z.object({
  recoveryKeys: z.array(z.string()),
  personalSlogan: z.string(),
  strategyIntegrationNotes: z.record(z.string(), z.string()),
  maintenanceCommitments: z.array(z.string()),
});

export const challengePlanFormSchema = z.object({
  challengeDescription: z.string().trim().min(3, "Describe the challenge."),
  copingSteps: z.array(z.string().trim().min(1)).min(1, "Add at least one coping step."),
});

export type RecoveryPlanFormSchema = z.infer<typeof recoveryPlanFormSchema>;
export type ChallengePlanFormSchema = z.infer<typeof challengePlanFormSchema>;
