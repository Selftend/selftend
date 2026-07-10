import { z } from "zod";

import { userText } from "@/src/lib/zod-fields";

// Messages are i18n KEYS (resolved in the "cbt" namespace at render time via t()),
// not literals - so validation errors follow the in-app language, not English only.
export const taskStepSchema = z.object({
  description: userText(2000, { min: 3, message: "tasks.validation.stepDescription" }),
  estimatedMinutes: z.number().min(0).nullable(),
});

export const procrastinationTaskFormSchema = z.object({
  taskDescription: userText(4000, { min: 3, message: "tasks.validation.taskDescription" }),
  avoidanceReason: userText(4000),
  fearThought: userText(4000),
  challengedThought: userText(4000),
  deadline: z.string().nullable(),
  reward: userText(2000),
  steps: z.array(taskStepSchema).min(1, "tasks.validation.steps"),
});

export type ProcrastinationTaskFormSchema = z.infer<typeof procrastinationTaskFormSchema>;
