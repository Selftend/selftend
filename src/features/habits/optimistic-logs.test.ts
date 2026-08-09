import {
  applyOptimisticToggle,
  habitLogsScope,
  isTickedInAnyPage,
  optimisticLogId,
} from "@/src/features/habits/optimistic-logs";
import type { HabitLog } from "@/src/features/habits/types";

function log(overrides: Partial<HabitLog> = {}): HabitLog {
  return {
    id: "log-1",
    userId: "u1",
    habitId: "h-1",
    loggedOn: "2026-08-08",
    note: "",
    createdAt: "2026-08-08T08:00:00.000Z",
    updatedAt: "2026-08-08T08:00:00.000Z",
    ...overrides,
  };
}

const params = { userId: "u1", habitId: "h-1", loggedOn: "2026-08-09" };

describe("habitLogsScope", () => {
  it("drops undefined entries so equivalent options hash alike", () => {
    expect(habitLogsScope({ sinceDate: "2026-08-01", limit: undefined })).toEqual({
      sinceDate: "2026-08-01",
    });
    expect(habitLogsScope({})).toEqual({});
  });
});

describe("isTickedInAnyPage", () => {
  it("is true when any cached page holds the row", () => {
    const pages = [undefined, [], [log({ loggedOn: "2026-08-09" })]];
    expect(isTickedInAnyPage(pages, "h-1", "2026-08-09")).toBe(true);
  });

  it("is false when no page holds it, so the intent is a tick", () => {
    expect(isTickedInAnyPage([[log()], []], "h-1", "2026-08-09")).toBe(false);
  });

  it("does not confuse two habits sharing a day", () => {
    expect(
      isTickedInAnyPage([[log({ habitId: "h-2", loggedOn: "2026-08-09" })]], "h-1", "2026-08-09"),
    ).toBe(false);
  });
});

describe("applyOptimisticToggle - ticking", () => {
  it("inserts a placeholder in newest-first order, matching listHabitLogs", () => {
    const logs = [
      log({ id: "a", loggedOn: "2026-08-10" }),
      log({ id: "b", loggedOn: "2026-08-01" }),
    ];

    const next = applyOptimisticToggle(logs, "tick", params, {})!;

    expect(next.map((l) => l.loggedOn)).toEqual(["2026-08-10", "2026-08-09", "2026-08-01"]);
    expect(next[1].id).toBe(optimisticLogId("h-1", "2026-08-09"));
    expect(next[1].note).toBe("");
  });

  it("leaves an unloaded page unloaded rather than publishing one the query never fetched", () => {
    expect(applyOptimisticToggle(undefined, "tick", params, {})).toBeUndefined();
  });

  it("does not add the row to a page scoped to a different habit", () => {
    const logs: HabitLog[] = [];
    expect(applyOptimisticToggle(logs, "tick", params, { habitId: "h-2" })).toBe(logs);
  });

  it("does not add a day that falls before the page's window", () => {
    const logs: HabitLog[] = [];
    expect(applyOptimisticToggle(logs, "tick", params, { sinceDate: "2026-08-20" })).toBe(logs);
  });

  it("truncates a limited page so it keeps holding only its newest rows", () => {
    const logs = [log({ id: "a", loggedOn: "2026-08-01" })];

    const next = applyOptimisticToggle(logs, "tick", params, { limit: 1 })!;

    expect(next).toHaveLength(1);
    expect(next[0].loggedOn).toBe("2026-08-09");
  });

  it("is idempotent, so a double tap cannot leave two rows for one day", () => {
    const logs = [log({ loggedOn: "2026-08-09" })];
    expect(applyOptimisticToggle(logs, "tick", params, {})).toBe(logs);
  });
});

describe("applyOptimisticToggle - unticking", () => {
  it("removes the matching row", () => {
    const logs = [
      log({ id: "a", loggedOn: "2026-08-09" }),
      log({ id: "b", loggedOn: "2026-08-01" }),
    ];

    const next = applyOptimisticToggle(logs, "untick", params, {})!;

    expect(next.map((l) => l.id)).toEqual(["b"]);
  });

  it("returns the same reference when the page never held the row", () => {
    const logs = [log({ loggedOn: "2026-08-01" })];
    expect(applyOptimisticToggle(logs, "untick", params, {})).toBe(logs);
  });

  it("leaves a limit-scoped page alone rather than emptying it into 'no ticks yet'", () => {
    // The lifetime page answers "what was the most recent tick?". Emptying it
    // would make the header claim a returning user has never ticked anything -
    // the client simply no longer knows, so stale beats invented.
    const logs = [log({ loggedOn: "2026-08-09" })];
    expect(applyOptimisticToggle(logs, "untick", params, { limit: 1 })).toBe(logs);
  });
});
