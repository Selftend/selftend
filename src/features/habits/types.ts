export type HabitKind = "build" | "break";

export type HabitCadence = "daily" | "weekdays" | "custom";

/**
 * Every value the `color` column may legally hold.
 *
 * Not every one of these is *offered* — see `HABIT_COLOR_CHOICES` in `schemas.ts`.
 * `primary`, `amber` and `emerald` are grandfathered: they load and render for a habit
 * that already holds one, and are never handed to a new habit (#764, decided on #715).
 *
 * `ink` and `aqua` are new offered colours. They need no migration: `20260532_habits.sql`
 * constrains the column to a 1-32 character string, so a new value is just a new string.
 */
export type HabitColor =
  "primary" | "be" | "act" | "amber" | "emerald" | "violet" | "rose" | "ink" | "aqua";

export interface Habit {
  id: string;
  userId: string;
  name: string;
  kind: HabitKind;
  identity: string;
  cuePlan: string;
  stackAfter: string;
  cravingPairing: string;
  twoMinuteVersion: string;
  rewardNote: string;
  cadence: HabitCadence;
  customDays: number[];
  color: HabitColor;
  archivedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface HabitInput {
  name: string;
  kind: HabitKind;
  identity: string;
  cuePlan: string;
  stackAfter: string;
  cravingPairing: string;
  twoMinuteVersion: string;
  rewardNote: string;
  cadence: HabitCadence;
  customDays: number[];
  color: HabitColor;
}

export interface HabitLog {
  id: string;
  userId: string;
  habitId: string;
  loggedOn: string;
  note: string;
  createdAt: string;
  updatedAt: string;
}
