import type { SteppableToolId } from "@/src/features/routines/derive";

/**
 * When a routine runs (#96/#97): HabitCadence's vocabulary plus "on-demand"
 * for routines that never nudge and only run manually. `customDays` uses JS
 * getDay() numbering (0=Sun..6=Sat), same as habits.
 */
export type RoutineCadence = "daily" | "weekdays" | "custom" | "on-demand";

export const ROUTINE_CADENCES: readonly RoutineCadence[] = [
  "daily",
  "weekdays",
  "custom",
  "on-demand",
];

export interface Routine {
  id: string;
  userId: string;
  name: string;
  reminderEnabled: boolean;
  reminderHour: number | null;
  reminderMinute: number | null;
  reminderTimezone: string | null;
  cadence: RoutineCadence;
  customDays: number[];
  createdAt: string;
  updatedAt: string;
}

export interface RoutineStep {
  id: string;
  routineId: string;
  userId: string;
  toolId: SteppableToolId;
  position: number;
  createdAt: string;
  updatedAt: string;
}

/** A routine plus its steps ordered by `position` ascending. */
export interface RoutineWithSteps extends Routine {
  steps: RoutineStep[];
}

/**
 * Create payload. Reminder fields are optional so "just a name" creates a
 * routine with reminders off (matching the DB defaults); schedule fields are
 * optional so it defaults to every day (#96).
 */
export interface RoutineInput {
  name: string;
  reminderEnabled?: boolean;
  reminderHour?: number | null;
  reminderMinute?: number | null;
  reminderTimezone?: string | null;
  cadence?: RoutineCadence;
  customDays?: number[];
}

/**
 * Partial update payload: rename and/or change reminder fields. Omitted
 * fields are left untouched (the decrypting view's INSTEAD OF UPDATE trigger
 * carries the existing values for columns not in the PostgREST payload).
 */
export type RoutineUpdate = Partial<RoutineInput>;

export interface RoutineStepInput {
  toolId: SteppableToolId;
  position: number;
}
