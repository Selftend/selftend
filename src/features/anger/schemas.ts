import { z } from "zod";

import { userText } from "@/src/lib/zod-fields";

// Messages are i18n KEYS (resolved in the "cbt" namespace at render time via t()),
// not literals - so validation errors follow the in-app language, not English only.
export const angerLogFormSchema = z.object({
  triggerText: userText(4000, { min: 3, message: "anger.validation.triggerText" }),
  interpretation: userText(4000),
  arousalLevel: z.number().min(1).max(10),
  urge: userText(4000),
  behaviorChosen: userText(4000),
  consequence: userText(4000),
  timeOutTaken: z.boolean(),
  alternativeInterpretation: userText(4000),
  outcomeRating: z.number().min(1).max(10).nullable(),
  notes: userText(4000),
});

export type AngerLogFormSchema = z.infer<typeof angerLogFormSchema>;
