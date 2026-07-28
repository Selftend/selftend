import { groupActivities } from "@/src/features/activities/grouping";
import type { ActivityLog } from "@/src/features/activities/types";
import { entryDayKey } from "@/src/lib/occurrence-time";

// The jest runner pins TZ to Asia/Kolkata (+05:30). 19:00Z on the 15th is already
// 00:30 on the 16th here, but midday on the 15th at UTC-7 - one instant, two days.
const ACROSS_MIDNIGHT_AT = "2026-05-15T19:00:00.000Z";
const CAPTURED_DAY = "2026-05-15";
const VIEWER_DAY = "2026-05-16";
const UTC_MINUS_7 = -420;

function activity(over: Partial<ActivityLog> = {}): ActivityLog {
  return {
    id: "a-1",
    userId: "user-1",
    activityName: "Walk",
    category: "pleasure",
    paceCategory: null,
    scheduledAt: null,
    scheduledOffsetMinutes: null,
    scheduledDayKey: null,
    completedAt: null,
    completedOffsetMinutes: null,
    completedDayKey: null,
    moodBefore: null,
    moodAfter: null,
    notes: "",
    createdAt: "2026-05-15T08:00:00.000Z",
    updatedAt: "2026-05-15T08:00:00.000Z",
    ...over,
  };
}

/** A plan whose captured civil day differs from the day its instant falls on locally. */
function plannedFor(offsetMinutes: number | null, over: Partial<ActivityLog> = {}): ActivityLog {
  return activity({
    scheduledAt: ACROSS_MIDNIGHT_AT,
    scheduledOffsetMinutes: offsetMinutes,
    scheduledDayKey: entryDayKey(ACROSS_MIDNIGHT_AT, offsetMinutes),
    ...over,
  });
}

describe("groupActivities", () => {
  it("buckets a plan by the day it was made for, not the viewer's day", () => {
    // Planned for midday on the 15th at UTC-7. Viewed from Kolkata, where that
    // instant is already the 16th, it must still be the 15th's plan (#330).
    const a = plannedFor(UTC_MINUS_7);
    expect(a.scheduledDayKey).toBe(CAPTURED_DAY);

    const onItsOwnDay = groupActivities([a], CAPTURED_DAY);
    expect(onItsOwnDay.today).toEqual([a]);
    expect(onItsOwnDay.upcoming).toEqual([]);
  });

  it("keeps an overdue plan overdue the day after - it must not vanish into upcoming", () => {
    // The edge the captured day exists to protect. A plan captured on Tuesday, still
    // not done, viewed on Wednesday: it belongs under Today (overdue), never under
    // Upcoming, where the user would stop seeing the day they meant to act on.
    const a = plannedFor(UTC_MINUS_7);
    const dayAfter = groupActivities([a], VIEWER_DAY);
    expect(dayAfter.today).toEqual([a]);
    expect(dayAfter.upcoming).toEqual([]);

    // Bucketing the raw instant by the viewer would have called it VIEWER_DAY's plan
    // and, a further day on, still not overdue. Two days later it is unambiguous.
    const twoDaysAfter = groupActivities([a], "2026-05-17");
    expect(twoDaysAfter.today).toEqual([a]);
  });

  it("only a genuinely future captured day is upcoming", () => {
    const a = plannedFor(UTC_MINUS_7);
    const dayBefore = groupActivities([a], "2026-05-14");
    expect(dayBefore.upcoming).toEqual([a]);
    expect(dayBefore.today).toEqual([]);
  });

  it("files a completed activity under completed regardless of either day", () => {
    const done = plannedFor(UTC_MINUS_7, {
      completedAt: ACROSS_MIDNIGHT_AT,
      completedOffsetMinutes: UTC_MINUS_7,
      completedDayKey: CAPTURED_DAY,
    });
    expect(done.completedDayKey).toBe(CAPTURED_DAY);

    const grouped = groupActivities([done], VIEWER_DAY);
    expect(grouped.completed).toEqual([done]);
    expect(grouped.today).toEqual([]);
    expect(grouped.upcoming).toEqual([]);
  });

  it("falls back to the viewer's day when no offset was captured", () => {
    // Null means "unknown", never "UTC" (#250), so an old row buckets exactly where
    // it always did - under the viewer's day, which for this instant is the 16th.
    const a = plannedFor(null);
    expect(a.scheduledDayKey).toBe(VIEWER_DAY);
    expect(groupActivities([a], VIEWER_DAY).today).toEqual([a]);
    expect(groupActivities([a], CAPTURED_DAY).upcoming).toEqual([a]);
  });

  it("treats an unscheduled, uncompleted activity as upcoming", () => {
    // No plan and no completion: it has no day at all, and must not be swept into
    // "today" by a day key resolved from nothing.
    const a = activity();
    const grouped = groupActivities([a], VIEWER_DAY);
    expect(grouped.upcoming).toEqual([a]);
    expect(grouped.today).toEqual([]);
  });
});
