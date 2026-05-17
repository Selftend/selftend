import {
  getIdentityRoundUp,
  getTwoMinuteAdoption,
  getWeeklyRhythm,
} from "@/src/features/habits/insights";
import type { Habit, HabitLog } from "@/src/features/habits/types";

const baseHabit: Habit = {
  id: "h-1",
  userId: "user-1",
  name: "Read",
  kind: "build",
  identity: "Reader",
  cuePlan: "",
  stackAfter: "",
  cravingPairing: "",
  twoMinuteVersion: "Read one page",
  rewardNote: "",
  cadence: "daily",
  customDays: [],
  color: "primary",
  archivedAt: null,
  createdAt: "2026-05-01T00:00:00.000Z",
  updatedAt: "2026-05-01T00:00:00.000Z",
};

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

describe("getIdentityRoundUp", () => {
  const now = new Date("2026-05-17T12:00:00");

  it("groups ticks by the owning habit's identity, ignoring this-month-only", () => {
    const habits: Habit[] = [
      { ...baseHabit, id: "h-1", identity: "Reader" },
      { ...baseHabit, id: "h-2", identity: "Walker" },
      { ...baseHabit, id: "h-3", identity: "" },
    ];
    const logs: HabitLog[] = [
      log("h-1", "2026-05-17"),
      log("h-1", "2026-05-10"),
      log("h-2", "2026-05-09"),
      log("h-3", "2026-05-12"), // no identity → ignored
      log("h-1", "2026-04-30"), // previous month → ignored
    ];
    const round = getIdentityRoundUp(habits, logs, now);
    expect(round).toEqual([
      { identity: "Reader", count: 2 },
      { identity: "Walker", count: 1 },
    ]);
  });
});

describe("getTwoMinuteAdoption", () => {
  it("reports filled / total over active build habits", () => {
    const habits: Habit[] = [
      { ...baseHabit, id: "h-1", twoMinuteVersion: "Read one page" },
      { ...baseHabit, id: "h-2", twoMinuteVersion: "" },
      { ...baseHabit, id: "h-3", twoMinuteVersion: "Stretch 30s" },
      { ...baseHabit, id: "h-4", twoMinuteVersion: "", archivedAt: "2026-05-01T00:00:00.000Z" },
      { ...baseHabit, id: "h-5", twoMinuteVersion: "", kind: "break" },
    ];
    expect(getTwoMinuteAdoption(habits)).toEqual({
      filled: 2,
      total: 3,
      ratio: 2 / 3,
    });
  });

  it("returns a clean zero when there are no active build habits", () => {
    expect(getTwoMinuteAdoption([])).toEqual({ filled: 0, total: 0, ratio: 0 });
  });
});
