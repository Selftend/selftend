import { z } from "zod";

export const thoughtRecordFormSchema = z.object({
  situation: z.string(),
  automaticThought: z.string(),
  emotions: z.array(z.string()),
  emotionIntensityBefore: z.number().min(0).max(100).nullable(),
  distortions: z.array(z.string()),
  evidenceFor: z.array(z.string()),
  evidenceAgainst: z.array(z.string()),
  balancedThought: z.string(),
  emotionIntensityAfter: z.number().min(0).max(100).nullable(),
  outcomeNotes: z.string(),
});

export type ThoughtRecordFormSchema = z.infer<typeof thoughtRecordFormSchema>;
