export type HabitKind = "build" | "break";

export type HabitCadence = "daily" | "weekdays" | "custom";

export type HabitColor = "primary" | "be" | "act" | "amber" | "emerald" | "violet" | "rose";

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
