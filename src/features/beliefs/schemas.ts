import { z } from "zod";

export const coreBeliefFormSchema = z.object({
  beliefStatement: z.string().trim().min(3, "Describe the belief.").max(4000),
  triggeringSituations: z.array(z.string().trim().min(1).max(2000)),
  evidenceFor: z.array(z.string().trim().min(1).max(2000)),
  evidenceAgainst: z.array(z.string().trim().min(1).max(2000)),
  alternativeBelief: z.string().trim().min(3, "Write an alternative belief.").max(4000),
  originalBeliefStrength: z.number().min(0).max(100),
  alternativeBeliefStrength: z.number().min(0).max(100),
  reinforcementPlan: z.string().max(4000),
  nextReviewDate: z.string().nullable(),
});

export type CoreBeliefFormSchema = z.infer<typeof coreBeliefFormSchema>;
