import { z } from "zod";

import { userText } from "@/src/lib/zod-fields";
import { isValidDayKey } from "@/src/utils/date";

// Messages are i18n KEYS (resolved in the "cbt" namespace at render time via t()),
// not literals - so validation errors follow the in-app language, not English only.
export const milestoneSchema = z.object({
  description: userText(2000, { min: 3, message: "goals.validation.milestoneDescription" }),
  // ⚠️ Deliberately unvalidated, because it is deliberately unwired: the
  // milestones step renders only the description, so every value here is null
  // and always has been. See the note beside the field in goals/new.tsx (#1300).
  targetDate: z.string().nullable(),
});

export const goalFormSchema = z.object({
  lifeDomain: z.string().min(1, "goals.validation.lifeDomain"),
  goalType: z.string().min(1, "goals.validation.goalType"),
  title: userText(2000, { min: 3, message: "goals.validation.title" }),
  description: userText(4000),
  // `target_date` is a real Postgres `date`, so anything that isn't a day key
  // fails the whole save with a generic error and no field to point at. The
  // picker cannot produce one, but the form still validates: the column is the
  // only thing that has ever rejected these, and it rejects them too late.
  targetDate: z
    .string()
    .refine(isValidDayKey, { message: "goals.validation.targetDate" })
    .nullable(),
  milestones: z.array(milestoneSchema).min(1, "goals.validation.milestones"),
});

export type GoalFormSchema = z.infer<typeof goalFormSchema>;
