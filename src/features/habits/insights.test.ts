import { getWeeklyRhythm } from "@/src/features/habits/insights";
import type { HabitLog } from "@/src/features/habits/types";

function log(habitId: string, loggedOn: string): HabitLog {
  return {
    id: `log-${habitId}-${loggedOn}`,
    userId: "user-1",
    habitId,
    loggedOn,
    note: "",
    createdAt: `${loggedOn}T00:00:00.000Z`,
    updatedAt: `${loggedOn}T00:00:00.000Z`,
  };
}

describe("getWeeklyRhythm", () => {
  const now = new Date("2026-05-17T12:00:00"); // Sunday

  it("returns seven entries in [Sun..Sat] order", () => {
    const rhythm = getWeeklyRhythm([], 4, now);
    expect(rhythm.map((r) => r.weekday)).toEqual([0, 1, 2, 3, 4, 5, 6]);
    expect(rhythm.every((r) => r.count === 0)).toBe(true);
  });

  it("counts ticks within the requested window and ignores older ticks", () => {
    const logs: HabitLog[] = [
      log("h-1", "2026-05-17"), // today, Sun
      log("h-1", "2026-05-12"), // Tue
      log("h-2", "2026-05-12"), // Tue (different habit, same day)
      log("h-1", "2026-04-01"), // outside the 4-week window
    ];
    const rhythm = getWeeklyRhythm(logs, 4, now);
    expect(rhythm.find((r) => r.weekday === 0)?.count).toBe(1);
    expect(rhythm.find((r) => r.weekday === 2)?.count).toBe(2);
    expect(rhythm.find((r) => r.weekday === 5)?.count).toBe(0);
  });
});
