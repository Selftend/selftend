import { z } from "zod";

export const milestoneSchema = z.object({
  description: z.string().trim().min(3, "Describe the milestone."),
  targetDate: z.string().nullable(),
});

export const goalFormSchema = z.object({
  lifeDomain: z.string().min(1, "Choose a life domain."),
  goalType: z.string().min(1, "Choose a goal type."),
  title: z.string().trim().min(3, "Give the goal a short title."),
  description: z.string(),
  targetDate: z.string().nullable(),
  milestones: z.array(milestoneSchema).min(1, "Add at least one milestone."),
});

export type GoalFormSchema = z.infer<typeof goalFormSchema>;
