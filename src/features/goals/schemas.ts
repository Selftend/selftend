import { z } from "zod";

import { userText } from "@/src/lib/zod-fields";

// Messages are i18n KEYS (resolved in the "cbt" namespace at render time via t()),
// not literals - so validation errors follow the in-app language, not English only.
export const milestoneSchema = z.object({
  description: userText(2000, { min: 3, message: "goals.validation.milestoneDescription" }),
  targetDate: z.string().nullable(),
});

export const goalFormSchema = z.object({
  lifeDomain: z.string().min(1, "goals.validation.lifeDomain"),
  goalType: z.string().min(1, "goals.validation.goalType"),
  title: userText(2000, { min: 3, message: "goals.validation.title" }),
  description: userText(4000),
  targetDate: z.string().nullable(),
  milestones: z.array(milestoneSchema).min(1, "goals.validation.milestones"),
});

export type GoalFormSchema = z.infer<typeof goalFormSchema>;
