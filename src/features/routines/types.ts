import type { SteppableToolId } from "@/src/features/routines/derive";

export interface Routine {
  id: string;
  userId: string;
  name: string;
  reminderEnabled: boolean;
  reminderHour: number | null;
  reminderMinute: number | null;
  reminderTimezone: string | null;
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
 * routine with reminders off (matching the DB defaults).
 */
export interface RoutineInput {
  name: string;
  reminderEnabled?: boolean;
  reminderHour?: number | null;
  reminderMinute?: number | null;
  reminderTimezone?: string | null;
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
