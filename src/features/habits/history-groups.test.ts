import { t } from "i18next";

import { formatHabitHistoryDay, groupLogsByDay } from "@/src/features/habits/history-groups";
import { currentDateKey } from "@/src/features/habits/scheduling";
import type { HabitLog } from "@/src/features/habits/types";
import { addDaysToKey } from "@/src/utils/date";

function log(overrides: Partial<HabitLog> = {}): HabitLog {
  return {
    id: "log-1",
    userId: "u1",
    habitId: "h-1",
    loggedOn: "2026-07-20",
    note: "",
    createdAt: "2026-07-20T08:00:00.000Z",
    updatedAt: "2026-07-20T08:00:00.000Z",
    ...overrides,
  };
}

describe("groupLogsByDay", () => {
  it("returns nothing for an unloaded or empty list", () => {
    expect(groupLogsByDay(undefined)).toEqual([]);
    expect(groupLogsByDay([])).toEqual([]);
  });

  it("puts every tick for one day in one section", () => {
    const sections = groupLogsByDay([
      log({ id: "a", loggedOn: "2026-07-20" }),
      log({ id: "b", loggedOn: "2026-07-20", habitId: "h-2" }),
    ]);

    expect(sections).toHaveLength(1);
    expect(sections[0].key).toBe("2026-07-20");
    expect(sections[0].data.map((l) => l.id)).toEqual(["a", "b"]);
  });

  it("orders days newest first even when a page arrives out of order", () => {
    // Rebuilt from the keys rather than trusted from insertion order, so a
    // later page cannot interleave days.
    const sections = groupLogsByDay([
      log({ id: "a", loggedOn: "2026-07-19" }),
      log({ id: "b", loggedOn: "2026-07-21" }),
      log({ id: "c", loggedOn: "2026-07-20" }),
    ]);

    expect(sections.map((s) => s.key)).toEqual(["2026-07-21", "2026-07-20", "2026-07-19"]);
  });
});

describe("formatHabitHistoryDay", () => {
  it("keeps Today and Yesterday as words - they are positions, not dates", () => {
    const today = currentDateKey();
    expect(formatHabitHistoryDay(today, t, "en")).toBe("Today");
    expect(formatHabitHistoryDay(addDaysToKey(today, -1), t, "en")).toBe("Yesterday");
  });

  it("gives an older day a real date, never the raw key (#726)", () => {
    const heading = formatHabitHistoryDay("2026-07-20", t, "en");

    // "14 days ago" is a fine row label and a poor landmark in a long scroll.
    expect(heading).not.toBe("2026-07-20");
    expect(heading).not.toMatch(/days ago/);
    expect(heading).toContain("2026");
  });
});
