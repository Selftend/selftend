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
/** Every legal stored value, including the three that are no longer offered. */
export const HABIT_COLORS = [
  "primary",
  "be",
  "act",
  "amber",
  "emerald",
  "violet",
  "rose",
  "ink",
  "aqua",
] as const;

/**
 * The six colours a habit may be *given*, in the order they are offered and auto-assigned
 * (#764, decided on #715).
 *
 * Six rather than the shipped seven, and the reason is measured rather than aesthetic: the
 * old set held two pairs under ΔE76 6.5 for **normal** vision — `act`/`mist` at 6.5 and
 * `primary`/`iris` at 4.5. Two habits a user cannot tell apart is a categorical palette
 * that has stopped being categorical.
 *
 * The order matters too. Reading in tint terms it is `act → clay → ink → aqua → be → iris`;
 * the design's own order put the `ink`/`iris` pair — ΔE 0.4 apart under protanopia — at
 * positions 4 and 5, which is exactly where a two-habit user's second colour lands.
 *
 * `primary` is excluded on top of that for a structural reason: it is the one colour that
 * **moves with the theme** (`global.css` calls the eight hues "the pinned encoding
 * palette"), so it cannot be a stable categorical member — a user's habits would recolour
 * when they changed theme. `amber` and `emerald` resolve to `think` and `mist`, the two
 * halves of the failing pairs.
 *
 * ⚠️ The stored strings stay as they are. `rose` resolves to the `clay` tint and `violet`
 * to `iris`; renaming them would be a migration for no user-visible gain.
 */
export const HABIT_COLOR_CHOICES = ["act", "rose", "ink", "aqua", "be", "violet"] as const;

/** Colours that are legal in storage but never offered to a new habit. */
export const RETIRED_HABIT_COLORS = HABIT_COLORS.filter(
  (color) => !(HABIT_COLOR_CHOICES as readonly string[]).includes(color),
);

/**
 * The colour a new habit gets: the first offered one nothing else is using.
 *
 * Falls back to the head of the list once every colour is taken, rather than refusing or
 * leaving the field blank — six colours is a palette, not a quota.
 */
export function nextHabitColor(taken: readonly string[]): HabitColor {
  return (HABIT_COLOR_CHOICES.find((color) => !taken.includes(color)) ??
    HABIT_COLOR_CHOICES[0]) as HabitColor;
}

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
