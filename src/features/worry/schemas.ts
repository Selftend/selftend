import { z } from "zod";

import { trimmedStringList } from "@/src/lib/zod-fields";

export const worryEntryFormSchema = z
  .object({
    worryStatement: z.string().trim().min(3, "Describe the worry.").max(4000),
    worryCategory: z.enum(["hypothetical", "real_problem"]),
    probabilityEstimate: z.number().min(0).max(100).nullable(),
    evidenceFor: trimmedStringList(),
    evidenceAgainst: trimmedStringList(),
    copingStatement: z.string().max(4000),
    actionSteps: trimmedStringList(),
  })
  .superRefine((data, ctx) => {
    if (data.worryCategory === "hypothetical") {
      if (data.copingStatement.trim().length < 3) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["copingStatement"],
          message: "Write a coping statement.",
        });
      }
    } else if (data.actionSteps.length === 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["actionSteps"],
        message: "Add at least one action step.",
      });
    }
  });

export type WorryEntryFormSchema = z.infer<typeof worryEntryFormSchema>;
