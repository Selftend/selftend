import { z } from "zod";

import { trimmedStringList, userText } from "@/src/lib/zod-fields";

// Messages are i18n KEYS (resolved in the "cbt" namespace at render time via t()),
// not literals - so validation errors follow the in-app language, not English only.
export const worryEntryFormSchema = z
  .object({
    worryStatement: userText(4000, { min: 3, message: "worry.validation.worryStatement" }),
    worryCategory: z.enum(["hypothetical", "real_problem"]),
    probabilityEstimate: z.number().min(0).max(100).nullable(),
    evidenceFor: trimmedStringList(),
    evidenceAgainst: trimmedStringList(),
    copingStatement: userText(4000),
    actionSteps: trimmedStringList(),
  })
  .superRefine((data, ctx) => {
    if (data.worryCategory === "hypothetical") {
      if (data.copingStatement.trim().length < 3) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["copingStatement"],
          message: "worry.validation.copingStatement",
        });
      }
    } else if (data.actionSteps.length === 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["actionSteps"],
        message: "worry.validation.actionSteps",
      });
    }
  });

export type WorryEntryFormSchema = z.infer<typeof worryEntryFormSchema>;
