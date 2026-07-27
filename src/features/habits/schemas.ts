import { z } from "zod";

import type { HabitColor } from "@/src/features/habits/types";

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

/**
 * Coerce a stored `color` to a known alias, falling back to `primary`.
 *
 * `20260532_habits.sql` only constrains the column to a 1-32 character string,
 * and `mapHabit` casts rows without runtime validation, so a row written by an
 * older build - or by hand - can hold anything. Since #278 the chip palette is
 * a plain Record keyed by these aliases, so an unknown key reads as
 * `undefined` and the first `chip.fill` dereference crashes the list, detail
 * and editor screens. The switch this replaced fell back to `primary`;
 * normalizing at the repository boundary restores that for every consumer at
 * once, including ones added later.
 */
export function toHabitColor(value: unknown): HabitColor {
  return HABIT_COLORS.includes(value as HabitColor) ? (value as HabitColor) : "primary";
}

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
