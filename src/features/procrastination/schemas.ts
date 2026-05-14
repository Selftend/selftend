import { z } from "zod";

export const taskStepSchema = z.object({
  description: z.string().trim().min(3, "Describe the step."),
  estimatedMinutes: z.number().min(0).nullable(),
});

export const procrastinationTaskFormSchema = z.object({
  taskDescription: z.string().trim().min(3, "Name the task."),
  avoidanceReason: z.string(),
  fearThought: z.string(),
  challengedThought: z.string(),
  deadline: z.string().nullable(),
  reward: z.string(),
  steps: z.array(taskStepSchema).min(1, "Add at least one step."),
});

export type ProcrastinationTaskFormSchema = z.infer<typeof procrastinationTaskFormSchema>;
