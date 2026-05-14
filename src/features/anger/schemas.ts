import { z } from "zod";

export const angerLogFormSchema = z.object({
  triggerText: z.string().trim().min(3, "Describe what triggered the anger."),
  interpretation: z.string(),
  arousalLevel: z.number().min(1).max(10),
  urge: z.string(),
  behaviorChosen: z.string(),
  consequence: z.string(),
  timeOutTaken: z.boolean(),
  alternativeInterpretation: z.string(),
  outcomeRating: z.number().min(1).max(10).nullable(),
  notes: z.string(),
});

export type AngerLogFormSchema = z.infer<typeof angerLogFormSchema>;
