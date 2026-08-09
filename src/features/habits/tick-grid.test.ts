import {
  buildTickGrid,
  countTicksInWindow,
  mondayNoonOf,
  tickGridStartKey,
  TICK_GRID_WEEKS,
} from "@/src/features/habits/tick-grid";
import type { HabitLog } from "@/src/features/habits/types";

function log(overrides: Partial<HabitLog> = {}): HabitLog {
  return {
    id: "log-1",
    userId: "user-1",
    habitId: "h-1",
    loggedOn: "2026-08-09",
    note: "",
    createdAt: "2026-08-09T08:00:00.000Z",
    updatedAt: "2026-08-09T08:00:00.000Z",
    ...overrides,
  };
}

describe("mondayNoonOf", () => {
  // 2026-08-09 is a Sunday, 2026-08-03 the Monday that opens its week.
  it("walks a Sunday BACK six days, not forward one", () => {
    expect(mondayNoonOf("2026-08-09").getDate()).toBe(3);
  });

  it("returns a Monday unchanged", () => {
    expect(mondayNoonOf("2026-08-03").getDate()).toBe(3);
  });

  it("resolves every day of one week to the same Monday", () => {
    const mondays = ["03", "04", "05", "06", "07", "08", "09"].map((day) =>
      mondayNoonOf(`2026-08-${day}`).getDate(),
    );
    expect(mondays).toEqual([3, 3, 3, 3, 3, 3, 3]);
  });
});

describe("tickGridStartKey", () => {
  it("opens on the Monday eleven weeks before this week's Monday", () => {
    // 2026-08-03 minus 77 days.
    expect(tickGridStartKey("2026-08-09")).toBe("2026-05-18");
  });

  it("reaches at most 83 days back - which is what the logs query must fetch", () => {
    // Sunday is the widest case: the current week is fully drawn ahead of it.
    const start = new Date("2026-05-18T12:00:00").getTime();
    const today = new Date("2026-08-09T12:00:00").getTime();
    expect(Math.round((today - start) / 86_400_000)).toBe(83);
  });
});

describe("buildTickGrid", () => {
  const grid = buildTickGrid("2026-08-05"); // a Wednesday

  it("draws twelve columns of seven days", () => {
    expect(grid).toHaveLength(TICK_GRID_WEEKS);
    expect(grid.every((week) => week.days.length === 7)).toBe(true);
  });

  it("puts the same weekday on every row, Monday first", () => {
    // Row index IS the weekday only because the window opens on a Monday.
    const rowZero = grid.map((week) => week.days[0].date.getDay());
    expect(new Set(rowZero)).toEqual(new Set([1]));
    const rowSix = grid.map((week) => week.days[6].date.getDay());
    expect(new Set(rowSix)).toEqual(new Set([0]));
  });

  it("emits days in chronological order across the whole grid", () => {
    const keys = grid.flatMap((week) => week.days.map((day) => day.key));
    expect(keys).toEqual([...keys].sort());
    expect(keys).toHaveLength(84);
  });

  it("marks the days after today as future, and today itself as not", () => {
    const days = grid.flatMap((week) => week.days);
    const today = days.find((day) => day.key === "2026-08-05");
    expect(today?.isFuture).toBe(false);
    // Wednesday: Thursday to Sunday of the current week are still ahead.
    expect(days.filter((day) => day.isFuture).map((day) => day.key)).toEqual([
      "2026-08-06",
      "2026-08-07",
      "2026-08-08",
      "2026-08-09",
    ]);
  });

  it("has no future slots at all when today closes the week", () => {
    const sunday = buildTickGrid("2026-08-09");
    expect(sunday.flatMap((week) => week.days).some((day) => day.isFuture)).toBe(false);
  });

  it("keeps its footing across a DST boundary", () => {
    // Europe/Sofia springs forward on 2026-03-29. Anchored at local noon, the
    // civil dates step one at a time regardless.
    const spring = buildTickGrid("2026-04-01");
    const keys = spring.flatMap((week) => week.days.map((day) => day.key));
    expect(new Set(keys).size).toBe(84);
    expect(keys).toContain("2026-03-29");
  });
});

describe("countTicksInWindow", () => {
  it("counts only this habit's logs inside the window", () => {
    const logs = [
      log({ id: "a", loggedOn: "2026-08-05" }),
      log({ id: "b", loggedOn: "2026-05-17" }), // one day before the window
      log({ id: "c", loggedOn: "2026-08-06" }), // after `endKey`
      log({ id: "d", habitId: "h-2", loggedOn: "2026-08-05" }),
      log({ id: "e", loggedOn: "2026-05-18" }), // the first day, inclusive
    ];

    expect(countTicksInWindow(logs, "h-1", "2026-05-18", "2026-08-05")).toBe(2);
  });

  it("is zero for a habit with nothing in range", () => {
    expect(countTicksInWindow([], "h-1", "2026-05-18", "2026-08-05")).toBe(0);
  });
});
