import { z } from "zod";

// Messages are i18n KEYS (resolved in the "cbt" namespace at render time via t()),
// not literals - so validation errors follow the in-app language, not English only.
export const milestoneSchema = z.object({
  description: z.string().trim().min(3, "goals.validation.milestoneDescription"),
  targetDate: z.string().nullable(),
});

export const goalFormSchema = z.object({
  lifeDomain: z.string().min(1, "goals.validation.lifeDomain"),
  goalType: z.string().min(1, "goals.validation.goalType"),
  title: z.string().trim().min(3, "goals.validation.title"),
  description: z.string(),
  targetDate: z.string().nullable(),
  milestones: z.array(milestoneSchema).min(1, "goals.validation.milestones"),
});

export type GoalFormSchema = z.infer<typeof goalFormSchema>;
