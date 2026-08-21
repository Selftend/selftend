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
  // fails the whole save with a generic error and no field to point at — the
  // column is the only thing that has ever rejected these, and it rejects them
  // too late to name the field.
  //
  // Not merely defensive: the picker cannot emit a bad key, but the picker is
  // not the only way a value reaches this form. The wizard rehydrates a
  // persisted draft straight into `defaultValues`
  // (`create-wizard-draft-store.ts`), so a draft written by an older build — or
  // edited on disk — arrives having never passed through `DateField`.
  targetDate: z
    .string()
    .refine(isValidDayKey, { message: "goals.validation.targetDate" })
    .nullable(),
  milestones: z.array(milestoneSchema).min(1, "goals.validation.milestones"),
});

export type GoalFormSchema = z.infer<typeof goalFormSchema>;
