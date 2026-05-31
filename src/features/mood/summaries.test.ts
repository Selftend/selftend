import {
  getMoodSummary,
  getDailyAverages,
  getWeekDelta,
  getTopEmotions,
  groupLogsByDate,
} from "@/src/features/mood/summaries";

function daysAgo(days: number, hour = 12) {
  const date = new Date();
  date.setHours(hour, 0, 0, 0);
  date.setDate(date.getDate() - days);
  return date.toISOString();
}

describe("getMoodSummary", () => {
  it("returns empty result when logs are undefined or empty", () => {
    expect(getMoodSummary(undefined, 7)).toEqual({ average: null, count: 0 });
    expect(getMoodSummary([], 7)).toEqual({ average: null, count: 0 });
  });

  it("excludes logs older than the requested window", () => {
    const logs = [
      { loggedAt: daysAgo(1), moodScore: 3 },
      { loggedAt: daysAgo(10), moodScore: 5 },
    ];
    expect(getMoodSummary(logs, 7)).toEqual({ average: 3, count: 1 });
  });

  it("averages multiple logs in the window with rounding", () => {
    const logs = [
      { loggedAt: daysAgo(0), moodScore: 4 },
      { loggedAt: daysAgo(1), moodScore: 4 },
      { loggedAt: daysAgo(2), moodScore: 3 },
    ];
    const summary = getMoodSummary(logs, 7);
    expect(summary.count).toBe(3);
    expect(summary.average).toBe(3.7);
  });

  it("rounds to one decimal place", () => {
    const logs = [
      { loggedAt: daysAgo(0), moodScore: 2 },
      { loggedAt: daysAgo(1), moodScore: 3 },
      { loggedAt: daysAgo(2), moodScore: 3 },
    ];
    expect(getMoodSummary(logs, 7).average).toBe(2.7);
  });

  it("returns null average when no logs fall in the window", () => {
    const logs = [{ loggedAt: daysAgo(40), moodScore: 5 }];
    expect(getMoodSummary(logs, 7)).toEqual({ average: null, count: 0 });
  });
});

describe("getDailyAverages", () => {
  it("returns one bucket per day, oldest→newest, null on empty days", () => {
    const now = new Date(2026, 4, 31, 12, 0, 0, 0);
    const logs = [
      { loggedAt: new Date(2026, 4, 31, 9).toISOString(), moodScore: 4 },
      { loggedAt: new Date(2026, 4, 31, 18).toISOString(), moodScore: 2 },
      { loggedAt: new Date(2026, 4, 29, 12).toISOString(), moodScore: 5 },
    ];
    const week = getDailyAverages(logs, 7, now);
    expect(week).toHaveLength(7);
    expect(week[6]).toEqual({ dateKey: "2026-05-31", average: 3 });
    expect(week[4]).toEqual({ dateKey: "2026-05-29", average: 5 });
    expect(week[5]).toEqual({ dateKey: "2026-05-30", average: null });
  });
});

describe("getWeekDelta", () => {
  it("compares the last 7 days to the prior 7 days", () => {
    const now = new Date(2026, 4, 31, 12, 0, 0, 0);
    const logs = [
      { loggedAt: new Date(2026, 4, 30, 12).toISOString(), moodScore: 4 },
      { loggedAt: new Date(2026, 4, 28, 12).toISOString(), moodScore: 4 },
      { loggedAt: new Date(2026, 4, 22, 12).toISOString(), moodScore: 2 },
    ];
    expect(getWeekDelta(logs, now)).toEqual({ current: 4, previous: 2, delta: 2 });
  });

  it("returns null delta when either window is empty", () => {
    const now = new Date(2026, 4, 31, 12, 0, 0, 0);
    const logs = [{ loggedAt: new Date(2026, 4, 30, 12).toISOString(), moodScore: 4 }];
    expect(getWeekDelta(logs, now)).toEqual({ current: 4, previous: null, delta: null });
  });
});

describe("getTopEmotions", () => {
  it("counts emotion ids and returns the most frequent first", () => {
    const logs = [
      { loggedAt: new Date().toISOString(), moodScore: 4, emotions: ["relaxed", "happy"] },
      { loggedAt: new Date().toISOString(), moodScore: 3, emotions: ["relaxed"] },
      { loggedAt: new Date().toISOString(), moodScore: 2, emotions: ["anxious"] },
    ];
    expect(getTopEmotions(logs, 2)).toEqual([
      { id: "relaxed", count: 2 },
      { id: "anxious", count: 1 },
    ]);
  });

  it("returns an empty array when there are no emotions", () => {
    expect(getTopEmotions([], 3)).toEqual([]);
  });
});

describe("groupLogsByDate", () => {
  it("buckets entries into today/yesterday/thisWeek/older with per-group averages", () => {
    const now = new Date(2026, 4, 31, 12, 0, 0, 0);
    const logs = [
      { id: "a", loggedAt: new Date(2026, 4, 31, 9).toISOString(), moodScore: 4 },
      { id: "b", loggedAt: new Date(2026, 4, 30, 9).toISOString(), moodScore: 2 },
      { id: "c", loggedAt: new Date(2026, 4, 28, 9).toISOString(), moodScore: 5 },
      { id: "d", loggedAt: new Date(2026, 4, 1, 9).toISOString(), moodScore: 3 },
    ] as Parameters<typeof groupLogsByDate>[0];
    const groups = groupLogsByDate(logs, now);
    expect(groups.map((g) => g.key)).toEqual(["today", "yesterday", "thisWeek", "older"]);
    expect(groups[0]).toMatchObject({ key: "today", average: 4, entries: [logs![0]] });
    expect(groups[2]).toMatchObject({ key: "thisWeek", average: 5 });
  });

  it("omits empty groups", () => {
    const now = new Date(2026, 4, 31, 12, 0, 0, 0);
    const logs = [
      { id: "a", loggedAt: new Date(2026, 4, 31, 9).toISOString(), moodScore: 4 },
    ] as Parameters<typeof groupLogsByDate>[0];
    expect(groupLogsByDate(logs, now).map((g) => g.key)).toEqual(["today"]);
  });
});
