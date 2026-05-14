import { z } from "zod";

export const coreBeliefFormSchema = z.object({
  beliefStatement: z.string().trim().min(3, "Describe the belief."),
  triggeringSituations: z.array(z.string().trim().min(1)),
  evidenceFor: z.array(z.string().trim().min(1)),
  evidenceAgainst: z.array(z.string().trim().min(1)),
  alternativeBelief: z.string().trim().min(3, "Write an alternative belief."),
  originalBeliefStrength: z.number().min(0).max(100),
  alternativeBeliefStrength: z.number().min(0).max(100),
  reinforcementPlan: z.string(),
  nextReviewDate: z.string().nullable(),
});

export type CoreBeliefFormSchema = z.infer<typeof coreBeliefFormSchema>;
