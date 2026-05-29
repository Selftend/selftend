import { z } from "zod";

export const HABIT_NAME_MAX = 120;
const HABIT_IDENTITY_MAX = 200;
export const HABIT_CUE_MAX = 240;
const HABIT_STACK_MAX = 120;
const HABIT_PAIRING_MAX = 240;
const HABIT_TWO_MINUTE_MAX = 200;
const HABIT_REWARD_MAX = 200;
export const HABIT_NOTE_MAX = 500;

const HABIT_KINDS = ["build", "break"] as const;
const HABIT_CADENCES = ["daily", "weekdays", "custom"] as const;
export const HABIT_COLORS = ["primary", "be", "act", "amber", "emerald", "violet", "rose"] as const;

const trimmedRequired = z
  .string()
  .max(HABIT_NAME_MAX)
  .refine((v) => v.trim().length > 0, { message: "required" });

export const habitInputSchema = z.object({
  name: trimmedRequired,
  kind: z.enum(HABIT_KINDS),
  identity: z.string().max(HABIT_IDENTITY_MAX),
  cuePlan: z.string().max(HABIT_CUE_MAX),
  stackAfter: z.string().max(HABIT_STACK_MAX),
  cravingPairing: z.string().max(HABIT_PAIRING_MAX),
  twoMinuteVersion: z.string().max(HABIT_TWO_MINUTE_MAX),
  rewardNote: z.string().max(HABIT_REWARD_MAX),
  cadence: z.enum(HABIT_CADENCES),
  customDays: z.array(z.number().int().min(0).max(6)).max(7),
  color: z.enum(HABIT_COLORS),
});

export const habitLogNoteSchema = z.object({
  note: z.string().max(HABIT_NOTE_MAX),
});
