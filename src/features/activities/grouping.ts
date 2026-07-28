import type { ActivityLog } from "@/src/features/activities/types";
import { currentDateKey } from "@/src/stores/selected-date-store";

export interface GroupedActivities {
  today: ActivityLog[];
  upcoming: ActivityLog[];
  completed: ActivityLog[];
}

/**
 * Split the activity list into the three sections the activities screen shows.
 *
 * Lives here rather than in the screen so it sits inside the module the #330 ESLint
 * guard covers: the day-bucketing is the whole behaviour, and re-deriving a day from
 * a timestamp is exactly the mistake the guard exists to catch.
 */
export function groupActivities(
  activities: ActivityLog[],
  todayKey: string = currentDateKey(),
): GroupedActivities {
  const today: ActivityLog[] = [];
  const upcoming: ActivityLog[] = [];
  const completed: ActivityLog[] = [];

  for (const a of activities) {
    if (a.completedAt) {
      completed.push(a);
    } else if (a.scheduledDayKey) {
      // The civil day the user PLANNED for, captured when they planned it - never the
      // day that instant happens to fall on where they are standing now (#330).
      // YYYY-MM-DD compares lexicographically = chronologically. Only FUTURE days are
      // "upcoming"; today AND overdue (past, still uncompleted) surface under Today so
      // a missed activity isn't mislabeled as upcoming and hidden from the user. That
      // ordering is why the captured day matters here: a plan made for Tuesday must
      // still read as overdue on Wednesday rather than sliding forward into "upcoming"
      // and disappearing from the day the user meant to act on.
      if (a.scheduledDayKey > todayKey) {
        upcoming.push(a);
      } else {
        today.push(a);
      }
    } else {
      upcoming.push(a);
    }
  }

  return { today, upcoming, completed };
}
