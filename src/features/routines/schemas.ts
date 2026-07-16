import { z } from "zod";

import { isSteppableToolId } from "@/src/features/routines/derive";
import { ROUTINE_CADENCES } from "@/src/features/routines/types";

// Mirrors the DB guards: routines_guard caps the name at 120 and rejects
// blank; reminder hour/minute CHECKs are 0-23 / 0-59; cadence/custom_days
// CHECKs are routines_data_cadence_valid / _custom_days_valid (custom needs
// 1-7 distinct getDay() values); routine_steps.position must be a
// non-negative integer and tool_id one of the steppable set.
export const ROUTINE_NAME_MAX = 120;

const trimmedRequiredName = z
  .string()
  .max(ROUTINE_NAME_MAX)
  .refine((v) => v.trim().length > 0, { message: "required" });

const cadenceEnum = z.enum(ROUTINE_CADENCES as [string, ...string[]]);

// "custom" without at least one day is unschedulable - reject it like the DB
// CHECK does. Only enforceable when cadence is present in the payload (a
// partial update changing just customDays is validated by the DB constraint).
function customNeedsDays(input: { cadence?: string; customDays?: number[] }) {
  return input.cadence !== "custom" || (input.customDays?.length ?? 0) > 0;
}

const routineFieldsSchema = z.object({
  name: trimmedRequiredName,
  reminderEnabled: z.boolean().optional(),
  reminderHour: z.number().int().min(0).max(23).nullable().optional(),
  reminderMinute: z.number().int().min(0).max(59).nullable().optional(),
  reminderTimezone: z.string().nullable().optional(),
  cadence: cadenceEnum.optional(),
  customDays: z.array(z.number().int().min(0).max(6)).max(7).optional(),
});

export const routineInputSchema = routineFieldsSchema.refine(customNeedsDays, {
  message: "custom cadence needs at least one day",
});

// Rename/reminder/schedule patch: same field rules, everything optional.
export const routineUpdateSchema = routineFieldsSchema
  .partial()
  .refine(customNeedsDays, { message: "custom cadence needs at least one day" });

export const routineStepInputSchema = z.object({
  toolId: z.string().refine(isSteppableToolId, { message: "unknown tool" }),
  position: z.number().int().min(0),
});
