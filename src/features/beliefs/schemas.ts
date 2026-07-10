import { z } from "zod";

import { trimmedStringList, userText } from "@/src/lib/zod-fields";

// Messages are i18n KEYS (resolved in the "cbt" namespace at render time via t()),
// not literals - so validation errors follow the in-app language, not English only.
export const coreBeliefFormSchema = z.object({
  beliefStatement: userText(4000, { min: 3, message: "beliefs.validation.beliefStatement" }),
  triggeringSituations: trimmedStringList(),
  evidenceFor: trimmedStringList(),
  evidenceAgainst: trimmedStringList(),
  alternativeBelief: userText(4000, { min: 3, message: "beliefs.validation.alternativeBelief" }),
  originalBeliefStrength: z.number().min(0).max(100),
  alternativeBeliefStrength: z.number().min(0).max(100),
  reinforcementPlan: userText(4000),
  nextReviewDate: z.string().nullable(),
});

export type CoreBeliefFormSchema = z.infer<typeof coreBeliefFormSchema>;
