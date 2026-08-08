import {
  getMoodSummary,
  getDailyAverages,
  getWeekDelta,
  getTopEmotions,
  groupLogsByDate,
} from "@/src/features/mood/summaries";
import { addDaysToKey, localDateKey } from "@/src/utils/date";

// Fixed "today" so windows do not drift with the run clock.
const NOW = new Date(2026, 6, 25, 12, 0, 0, 0);
const TODAY = localDateKey(NOW);

function dayKeyAgo(days: number) {
  return addDaysToKey(TODAY, -days);
}

describe("getMoodSummary", () => {
  it("returns empty result when logs are undefined or empty", () => {
    expect(getMoodSummary(undefined, 7, NOW)).toEqual({ average: null, count: 0 });
    expect(getMoodSummary([], 7, NOW)).toEqual({ average: null, count: 0 });
  });

  it("excludes logs older than the requested window", () => {
    const logs = [
      { dayKey: dayKeyAgo(1), moodScore: 3 },
      { dayKey: dayKeyAgo(10), moodScore: 5 },
    ];
    expect(getMoodSummary(logs, 7, NOW)).toEqual({ average: 3, count: 1 });
  });

  it("averages multiple logs in the window with rounding", () => {
    const logs = [
      { dayKey: dayKeyAgo(0), moodScore: 4 },
      { dayKey: dayKeyAgo(1), moodScore: 4 },
      { dayKey: dayKeyAgo(2), moodScore: 3 },
    ];
    const summary = getMoodSummary(logs, 7, NOW);
    expect(summary.count).toBe(3);
    expect(summary.average).toBe(3.7);
  });

  it("rounds to one decimal place", () => {
    const logs = [
      { dayKey: dayKeyAgo(0), moodScore: 2 },
      { dayKey: dayKeyAgo(1), moodScore: 3 },
      { dayKey: dayKeyAgo(2), moodScore: 3 },
    ];
    expect(getMoodSummary(logs, 7, NOW).average).toBe(2.7);
  });

  it("returns null average when no logs fall in the window", () => {
    const logs = [{ dayKey: dayKeyAgo(40), moodScore: 5 }];
    expect(getMoodSummary(logs, 7, NOW)).toEqual({ average: null, count: 0 });
  });

  // The 7-day average must cover exactly the 7 columns the week strip renders.
  // With the window anchored at today while entries bucket at their captured day,
  // an entry logged east of the viewer fell outside the average but inside the
  // strip - the two disagreed only for travellers (#250).
  it("counts a day captured ahead of today, and still spans exactly 7 days", () => {
    const logs = [
      { dayKey: addDaysToKey(TODAY, 1), moodScore: 5 },
      { dayKey: dayKeyAgo(5), moodScore: 3 },
      { dayKey: dayKeyAgo(6), moodScore: 1 }, // one day past the extended window's start
    ];
    expect(getMoodSummary(logs, 7, NOW)).toEqual({ average: 4, count: 2 });
  });
});

describe("getDailyAverages", () => {
  it("returns one bucket per day, oldest→newest, null on empty days", () => {
    const now = new Date(2026, 4, 31, 12, 0, 0, 0);
    const logs = [
      { dayKey: "2026-05-31", moodScore: 4 },
      { dayKey: "2026-05-31", moodScore: 2 },
      { dayKey: "2026-05-29", moodScore: 5 },
    ];
    const week = getDailyAverages(logs, 7, now);
    expect(week).toHaveLength(7);
    expect(week[6]).toEqual({ dateKey: "2026-05-31", average: 3 });
    expect(week[4]).toEqual({ dateKey: "2026-05-29", average: 5 });
    expect(week[5]).toEqual({ dateKey: "2026-05-30", average: null });
  });

  it("ends on a day captured ahead of today rather than dropping it", () => {
    const now = new Date(2026, 4, 31, 12, 0, 0, 0);
    const week = getDailyAverages([{ dayKey: "2026-06-01", moodScore: 4 }], 7, now);
    expect(week).toHaveLength(7);
    expect(week[6]).toEqual({ dateKey: "2026-06-01", average: 4 });
  });
});

describe("getWeekDelta", () => {
  it("compares the last 7 days to the prior 7 days", () => {
    const now = new Date(2026, 4, 31, 12, 0, 0, 0);
    const logs = [
      { dayKey: "2026-05-30", moodScore: 4 },
      { dayKey: "2026-05-28", moodScore: 4 },
      { dayKey: "2026-05-22", moodScore: 2 },
    ];
    expect(getWeekDelta(logs, now)).toEqual({ current: 4, previous: 2, delta: 2 });
  });

  it("returns null delta when either window is empty", () => {
    const now = new Date(2026, 4, 31, 12, 0, 0, 0);
    const logs = [{ dayKey: "2026-05-30", moodScore: 4 }];
    expect(getWeekDelta(logs, now)).toEqual({ current: 4, previous: null, delta: null });
  });
});

describe("getTopEmotions", () => {
  const now = new Date(2026, 4, 31, 12, 0, 0, 0); // 2026-05-31

  it("counts emotion ids and returns the most frequent first", () => {
    const logs = [
      { dayKey: "2026-05-31", emotions: ["relaxed", "happy"] },
      { dayKey: "2026-05-30", emotions: ["relaxed"] },
      { dayKey: "2026-05-29", emotions: ["anxious"] },
    ];
    expect(getTopEmotions(logs, 2, 7, now)).toEqual([
      { id: "relaxed", count: 2 },
      { id: "anxious", count: 1 },
    ]);
  });

  it("returns an empty array when there are no emotions", () => {
    expect(getTopEmotions([], 3, 7, now)).toEqual([]);
  });

  // #705: this counted every log it was handed while rendering under "This
  // week", so its real span was the caller's 200-entry cache.
  it("ignores logs outside the window", () => {
    const logs = [
      { dayKey: "2026-05-31", emotions: ["calm"] },
      { dayKey: "2026-05-25", emotions: ["calm"] }, // day 7 back - the edge, included
      { dayKey: "2026-05-24", emotions: ["anxious", "anxious"] }, // day 8 - excluded
      { dayKey: "2026-02-14", emotions: ["anxious"] }, // a hard patch months ago
    ];
    expect(getTopEmotions(logs, 3, 7, now)).toEqual([{ id: "calm", count: 2 }]);
  });

  it("defaults to a seven-day window, matching the section it renders in", () => {
    const logs = [
      { dayKey: "2026-05-31", emotions: ["calm"] },
      { dayKey: "2026-01-01", emotions: ["anxious"] },
    ];
    // No explicit `days`, and `now` still inside the window of the newest key.
    expect(getTopEmotions(logs, 3, undefined, now)).toEqual([{ id: "calm", count: 1 }]);
  });

  // Anchored on the newest captured day key, not on `now` - a log written east
  // of the reader must still anchor its own week (#250), exactly as
  // getDailyAverages and getWeekDelta do.
  it("anchors the window on the newest day key when it is ahead of now", () => {
    const logs = [
      { dayKey: "2026-06-01", emotions: ["hopeful"] }, // ahead of `now`
      { dayKey: "2026-05-26", emotions: ["hopeful"] }, // still within 7 days of 06-01
      { dayKey: "2026-05-25", emotions: ["tired"] }, // 8 days back from 06-01
    ];
    expect(getTopEmotions(logs, 3, 7, now)).toEqual([{ id: "hopeful", count: 2 }]);
  });
});

describe("groupLogsByDate", () => {
  it("buckets entries into today/yesterday/thisWeek/older with per-group averages", () => {
    const now = new Date(2026, 4, 31, 12, 0, 0, 0);
    const logs = [
      { id: "a", dayKey: "2026-05-31", moodScore: 4 },
      { id: "b", dayKey: "2026-05-30", moodScore: 2 },
      { id: "c", dayKey: "2026-05-28", moodScore: 5 },
      { id: "d", dayKey: "2026-05-01", moodScore: 3 },
    ] as Parameters<typeof groupLogsByDate>[0];
    const groups = groupLogsByDate(logs, now);
    expect(groups.map((g) => g.key)).toEqual(["today", "yesterday", "thisWeek", "older"]);
    expect(groups[0]).toMatchObject({ key: "today", average: 4, entries: [logs![0]] });
    expect(groups[2]).toMatchObject({ key: "thisWeek", average: 5 });
  });

  it("omits empty groups", () => {
    const now = new Date(2026, 4, 31, 12, 0, 0, 0);
    const logs = [{ id: "a", dayKey: "2026-05-31", moodScore: 4 }] as Parameters<
      typeof groupLogsByDate
    >[0];
    expect(groupLogsByDate(logs, now).map((g) => g.key)).toEqual(["today"]);
  });

  it("reads a day captured ahead of today as today, not as a future entry", () => {
    const now = new Date(2026, 4, 31, 12, 0, 0, 0);
    const logs = [{ id: "a", dayKey: "2026-06-01", moodScore: 4 }] as Parameters<
      typeof groupLogsByDate
    >[0];
    expect(groupLogsByDate(logs, now).map((g) => g.key)).toEqual(["today"]);
  });
});
