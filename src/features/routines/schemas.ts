import { z } from "zod";

import { isSteppableToolId } from "@/src/features/routines/derive";

// Mirrors the DB guards: routines_guard caps the name at 120 and rejects
// blank; reminder hour/minute CHECKs are 0-23 / 0-59; routine_steps.position
// must be a non-negative integer and tool_id one of the steppable set.
export const ROUTINE_NAME_MAX = 120;

const trimmedRequiredName = z
  .string()
  .max(ROUTINE_NAME_MAX)
  .refine((v) => v.trim().length > 0, { message: "required" });

export const routineInputSchema = z.object({
  name: trimmedRequiredName,
  reminderEnabled: z.boolean().optional(),
  reminderHour: z.number().int().min(0).max(23).nullable().optional(),
  reminderMinute: z.number().int().min(0).max(59).nullable().optional(),
  reminderTimezone: z.string().nullable().optional(),
});

// Rename/reminder patch: same field rules, everything optional.
export const routineUpdateSchema = routineInputSchema.partial();

export const routineStepInputSchema = z.object({
  toolId: z.string().refine(isSteppableToolId, { message: "unknown tool" }),
  position: z.number().int().min(0),
});
