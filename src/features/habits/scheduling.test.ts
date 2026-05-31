import {
  addDays,
  isAtMissTwiceRisk,
  isScheduledOn,
  localDateKey,
} from "@/src/features/habits/scheduling";
import type { Habit, HabitLog } from "@/src/features/habits/types";

const baseHabit: Habit = {
  id: "h-1",
  userId: "user-1",
  name: "Read",
  kind: "build",
  identity: "",
  cuePlan: "",
  stackAfter: "",
  cravingPairing: "",
  twoMinuteVersion: "",
  rewardNote: "",
  cadence: "daily",
  customDays: [],
  color: "primary",
  archivedAt: null,
  createdAt: "2026-05-01T00:00:00.000Z",
  updatedAt: "2026-05-01T00:00:00.000Z",
};

function buildLog(habitId: string, loggedOn: string): HabitLog {
  return {
    id: `log-${loggedOn}`,
    userId: "user-1",
    habitId,
    loggedOn,
    note: "",
    createdAt: `${loggedOn}T00:00:00.000Z`,
    updatedAt: `${loggedOn}T00:00:00.000Z`,
  };
}

describe("scheduling helpers", () => {
  it("treats daily habits as scheduled on any day", () => {
    const date = new Date("2026-05-17T12:00:00");
    expect(isScheduledOn(baseHabit, date)).toBe(true);
  });

  it("skips archived habits", () => {
    const archived: Habit = { ...baseHabit, archivedAt: "2026-05-10T00:00:00.000Z" };
    expect(isScheduledOn(archived, new Date("2026-05-17T12:00:00"))).toBe(false);
  });

  it("treats weekday habits as scheduled Mon–Fri only", () => {
    const habit: Habit = { ...baseHabit, cadence: "weekdays" };
    expect(isScheduledOn(habit, new Date("2026-05-18T12:00:00"))).toBe(true);
    expect(isScheduledOn(habit, new Date("2026-05-16T12:00:00"))).toBe(false);
  });

  it("treats custom-day habits as scheduled only on the chosen days", () => {
    const habit: Habit = { ...baseHabit, cadence: "custom", customDays: [1, 3] };
    expect(isScheduledOn(habit, new Date("2026-05-18T12:00:00"))).toBe(true);
    expect(isScheduledOn(habit, new Date("2026-05-19T12:00:00"))).toBe(false);
  });
});

describe("isAtMissTwiceRisk", () => {
  const today = new Date("2026-05-17T12:00:00");
  const yesterdayStr = localDateKey(addDays(today, -1));

  it("returns true when yesterday was scheduled, missed, and today is scheduled but not ticked", () => {
    expect(isAtMissTwiceRisk(baseHabit, [], today)).toBe(true);
  });

  it("returns false once today's tick has been recorded", () => {
    const logs = [buildLog(baseHabit.id, localDateKey(today))];
    expect(isAtMissTwiceRisk(baseHabit, logs, today)).toBe(false);
  });

  it("returns false when yesterday was already ticked", () => {
    const logs = [buildLog(baseHabit.id, yesterdayStr)];
    expect(isAtMissTwiceRisk(baseHabit, logs, today)).toBe(false);
  });

  it("returns false when yesterday wasn't on the schedule (weekday habit on weekend)", () => {
    const monday = new Date("2026-05-18T12:00:00");
    const weekdayHabit: Habit = { ...baseHabit, cadence: "weekdays" };
    expect(isAtMissTwiceRisk(weekdayHabit, [], monday)).toBe(false);
  });

  it("returns false for a habit created today (it couldn't have been missed yesterday)", () => {
    const createdToday: Habit = { ...baseHabit, createdAt: "2026-05-17T09:00:00.000Z" };
    expect(isAtMissTwiceRisk(createdToday, [], today)).toBe(false);
  });
});
