import { z } from "zod";

const natSchema = z.object({
  text: z.string(),
  beliefRating: z.number().min(0).max(100).nullable(),
  isHotThought: z.boolean(),
});

export const thoughtRecordFormSchema = z.object({
  situation: z.string(),
  nats: z.array(natSchema),
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
