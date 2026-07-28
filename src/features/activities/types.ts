import type { CapturedOffsetMinutes } from "@/src/lib/occurrence-time";

export type ActivityCategory = "pleasure" | "mastery";

export type PACECategory = "physical" | "achievement" | "connection" | "enjoyment";

export interface ActivityLog {
  id: string;
  userId: string;
  activityName: string;
  category: ActivityCategory;
  paceCategory: PACECategory | null;
  scheduledAt: string | null;
  /** Minutes east of UTC where the plan was made; null when never captured. */
  scheduledOffsetMinutes: CapturedOffsetMinutes;
  /**
   * The civil day the activity was PLANNED for, resolved once here - null when
   * nothing is scheduled. Frozen at planning time so "Tuesday 7pm" stays Tuesday
   * after travel: behavioural activation asks whether you did the thing you
   * planned for that day, so the day is the unit of the intervention (#330).
   */
  scheduledDayKey: string | null;
  completedAt: string | null;
  /** Minutes east of UTC where the activity was completed; null when never captured. */
  completedOffsetMinutes: CapturedOffsetMinutes;
  /** The civil day it was DONE on - null while it is still open. */
  completedDayKey: string | null;
  moodBefore: number | null;
  moodAfter: number | null;
  notes: string;
  createdAt: string;
  updatedAt: string;
}

export interface ActivityInput {
  activityName: string;
  category: ActivityCategory;
  paceCategory: PACECategory | null;
  scheduledAt: string | null;
  /**
   * Captured with `scheduledAt` from one parse of the picker text so the pair
   * always describes the same clock. Null when nothing is scheduled.
   */
  scheduledOffsetMinutes: CapturedOffsetMinutes;
  moodBefore: number | null;
  notes: string;
}
