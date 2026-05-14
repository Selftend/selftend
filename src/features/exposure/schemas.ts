import { z } from "zod";

export const exposureItemSchema = z.object({
  description: z.string().trim().min(3, "Describe the exposure step."),
  sudsRating: z.number().min(0).max(100),
});

export const exposureHierarchyFormSchema = z.object({
  title: z.string().trim().min(3, "Give the hierarchy a title."),
  anxietyType: z.string().trim().min(2, "Name the type of anxiety."),
  items: z.array(exposureItemSchema).min(1, "Add at least one step."),
});

export type ExposureHierarchyFormSchema = z.infer<typeof exposureHierarchyFormSchema>;

export const exposureSessionFormSchema = z.object({
  preSuds: z.number().min(0).max(100),
  postSuds: z.number().min(0).max(100),
  durationMinutes: z.number().min(0),
  safetyBehaviorsUsed: z.boolean(),
  safetyBehaviorDescription: z.string(),
  notes: z.string(),
});

export type ExposureSessionFormSchema = z.infer<typeof exposureSessionFormSchema>;
