import { z } from "zod";

export const thoughtRecordFormSchema = z.object({
  situation: z.string().trim().min(12, "Describe the moment in a little more detail."),
  automaticThought: z.string().trim().min(8, "Capture the first thought that showed up."),
  emotions: z.array(z.string()).min(1, "Choose at least one emotion."),
  distortions: z.array(z.string()).min(1, "Choose at least one thinking pattern."),
  balancedThought: z.string().trim().min(12, "Write a calmer, more balanced response."),
});

export type ThoughtRecordFormSchema = z.infer<typeof thoughtRecordFormSchema>;
