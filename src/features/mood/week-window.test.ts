import {
  buildWeekDays,
  countLogsInCurrentWeek,
  currentWeekStartKey,
  earliestWeekOffset,
  getTopEmotionsForWindow,
  getWeekDeltaForWindow,
  logsOnDay,
  weekWindowForOffset,
} from "@/src/features/mood/week-window";

// A Wednesday, so the current week has both past and future days in it - the
// case trailing-7 windows never had.
const WEDNESDAY = new Date(2026, 7, 5, 12, 0, 0, 0); // 2026-08-05

describe("weekWindowForOffset", () => {
  it("starts the week on Monday, matching the mood map's columns", () => {
    const window = weekWindowForOffset(0, WEDNESDAY);
    expect(window.startKey).toBe("2026-08-03"); // Monday
    expect(window.endKey).toBe("2026-08-09"); // Sunday
  });

  it("spans the previous week too, so the delta is right at every offset", () => {
    const window = weekWindowForOffset(-3, WEDNESDAY);
    expect(window.startKey).toBe("2026-07-13");
    expect(window.endKey).toBe("2026-07-19");
    expect(window.previousStartKey).toBe("2026-07-06");
    expect(window.previousEndKey).toBe("2026-07-12");
  });

  // Forward navigation cannot pass the current week: there is nothing to see in
  // a week that has not started.
  it("clamps a positive offset to the current week", () => {
    expect(weekWindowForOffset(3, WEDNESDAY)).toEqual(weekWindowForOffset(0, WEDNESDAY));
    expect(weekWindowForOffset(3, WEDNESDAY).offset).toBe(0);
  });

  it("agrees with currentWeekStartKey at offset zero", () => {
    expect(weekWindowForOffset(0, WEDNESDAY).startKey).toBe(currentWeekStartKey(WEDNESDAY));
  });
});

describe("earliestWeekOffset", () => {
  it("stops at the week holding the first entry", () => {
    // 2026-07-20 is the Monday three weeks before 2026-08-03.
    expect(earliestWeekOffset("2026-07-22", WEDNESDAY)).toBe(-2);
    expect(earliestWeekOffset("2026-07-20", WEDNESDAY)).toBe(-2);
    // The Sunday before that Monday belongs to the week before it.
    expect(earliestWeekOffset("2026-07-19", WEDNESDAY)).toBe(-3);
  });

  it("offers no paging at all with no entries, or with only this week's", () => {
    expect(earliestWeekOffset(null, WEDNESDAY)).toBe(0);
    expect(earliestWeekOffset("2026-08-04", WEDNESDAY)).toBe(0);
  });
});

describe("buildWeekDays", () => {
  const window = weekWindowForOffset(0, WEDNESDAY);

  it("returns seven Monday-first cells, averaging each day's scores", () => {
    const days = buildWeekDays(
      [
        { dayKey: "2026-08-03", moodScore: 4 },
        { dayKey: "2026-08-03", moodScore: 2 },
        { dayKey: "2026-08-05", moodScore: 5 },
      ],
      window,
      WEDNESDAY,
    );

    expect(days).toHaveLength(7);
    expect(days[0]).toMatchObject({ dateKey: "2026-08-03", average: 3, count: 2 });
    expect(days[1]).toMatchObject({ dateKey: "2026-08-04", average: null, count: 0 });
    expect(days[2]).toMatchObject({ dateKey: "2026-08-05", average: 5, count: 1 });
  });

  // Calendar weeks introduce days that have not happened yet. They must render
  // as nothing - a hollow "no entry" dot on Saturday would show a user four
  // missed days they have not had, which the no-shame rule forbids.
  it("marks days after today as future, and only those", () => {
    const days = buildWeekDays([], window, WEDNESDAY);
    expect(days.filter((d) => d.isFuture).map((d) => d.dateKey)).toEqual([
      "2026-08-06",
      "2026-08-07",
      "2026-08-08",
      "2026-08-09",
    ]);
    // Monday and Tuesday have passed with nothing logged: empty, not future.
    expect(days[0]).toMatchObject({ isFuture: false, count: 0 });
  });

  it("marks exactly one cell as today", () => {
    const days = buildWeekDays([], window, WEDNESDAY);
    expect(days.filter((d) => d.isToday).map((d) => d.dateKey)).toEqual(["2026-08-05"]);
  });

  // #250: fly east-to-west and you land holding an entry keyed "tomorrow".
  // Treating that day as future would hide an entry the user just logged.
  it("extends today to a later day the user already holds an entry on", () => {
    const days = buildWeekDays([{ dayKey: "2026-08-07", moodScore: 4 }], window, WEDNESDAY);
    expect(days.find((d) => d.dateKey === "2026-08-07")).toMatchObject({
      isToday: true,
      isFuture: false,
      average: 4,
    });
    expect(days.find((d) => d.dateKey === "2026-08-06")).toMatchObject({
      isFuture: false,
      count: 0,
    });
    expect(days.find((d) => d.dateKey === "2026-08-08")!.isFuture).toBe(true);
  });

  it("ignores logs from the previous week the query also fetched", () => {
    const days = buildWeekDays([{ dayKey: "2026-07-30", moodScore: 1 }], window, WEDNESDAY);
    expect(days.every((d) => d.count === 0)).toBe(true);
  });
});

describe("getWeekDeltaForWindow", () => {
  it("compares the displayed calendar week to the one before it", () => {
    const window = weekWindowForOffset(0, WEDNESDAY);
    const delta = getWeekDeltaForWindow(
      [
        { dayKey: "2026-08-03", moodScore: 4 },
        { dayKey: "2026-08-05", moodScore: 4 },
        { dayKey: "2026-07-28", moodScore: 2 },
      ],
      window,
    );
    expect(delta).toEqual({ current: 4, previous: 2, delta: 2 });
  });

  // The whole reason the query spans fourteen days rather than seven.
  it("is still correct on a navigated week", () => {
    const window = weekWindowForOffset(-1, WEDNESDAY);
    const delta = getWeekDeltaForWindow(
      [
        { dayKey: "2026-07-28", moodScore: 5 }, // displayed week (Jul 27 - Aug 2)
        { dayKey: "2026-07-21", moodScore: 3 }, // the week before it
        { dayKey: "2026-08-05", moodScore: 1 }, // the CURRENT week - out of both
      ],
      window,
    );
    expect(delta).toEqual({ current: 5, previous: 3, delta: 2 });
  });

  it("reports no comparison when either week is empty", () => {
    const window = weekWindowForOffset(0, WEDNESDAY);
    expect(getWeekDeltaForWindow([{ dayKey: "2026-08-03", moodScore: 4 }], window)).toEqual({
      current: 4,
      previous: null,
      delta: null,
    });
    expect(getWeekDeltaForWindow(undefined, window)).toEqual({
      current: null,
      previous: null,
      delta: null,
    });
  });
});

describe("getTopEmotionsForWindow", () => {
  it("counts only the displayed week, most frequent first", () => {
    const window = weekWindowForOffset(0, WEDNESDAY);
    expect(
      getTopEmotionsForWindow(
        [
          { dayKey: "2026-08-03", emotions: ["relaxed", "happy"] },
          { dayKey: "2026-08-04", emotions: ["relaxed"] },
          { dayKey: "2026-07-29", emotions: ["anxious", "anxious", "anxious"] },
        ],
        window,
        3,
      ),
    ).toEqual([
      { id: "relaxed", count: 2 },
      { id: "happy", count: 1 },
    ]);
  });

  // The navigable version of #705: chips under a March heading may not count
  // this week's emotions.
  it("follows the navigated week rather than the newest data", () => {
    const window = weekWindowForOffset(-1, WEDNESDAY);
    expect(
      getTopEmotionsForWindow(
        [
          { dayKey: "2026-08-05", emotions: ["calm"] }, // current week
          { dayKey: "2026-07-30", emotions: ["tired"] }, // displayed week
        ],
        window,
        3,
      ),
    ).toEqual([{ id: "tired", count: 1 }]);
  });

  it("honours the limit and breaks ties by id", () => {
    const window = weekWindowForOffset(0, WEDNESDAY);
    expect(
      getTopEmotionsForWindow([{ dayKey: "2026-08-03", emotions: ["b", "a", "c"] }], window, 2),
    ).toEqual([
      { id: "a", count: 1 },
      { id: "b", count: 1 },
    ]);
  });
});

describe("logsOnDay", () => {
  const entry = (id: string, dayKey: string, loggedAt: string) => ({ id, dayKey, loggedAt });

  it("returns that civil day's entries only, newest first", () => {
    const logs = [
      entry("a", "2026-08-05", "2026-08-05T08:00:00.000Z"),
      entry("b", "2026-08-05", "2026-08-05T19:00:00.000Z"),
      entry("c", "2026-08-04", "2026-08-04T19:00:00.000Z"),
    ];
    expect(logsOnDay(logs, "2026-08-05").map((l) => l.id)).toEqual(["b", "a"]);
    expect(logsOnDay(logs, "2026-08-06")).toEqual([]);
    expect(logsOnDay(undefined, "2026-08-05")).toEqual([]);
  });
});

describe("countLogsInCurrentWeek", () => {
  // The header stat read a trailing seven days while the block below it read a
  // calendar week, so "this week" named two different spans on one screen.
  it("counts the calendar week, not a trailing seven days", () => {
    const logs = [
      { dayKey: "2026-08-03", moodScore: 3 }, // Monday, in
      { dayKey: "2026-08-05", moodScore: 3 }, // Wednesday, in
      { dayKey: "2026-08-02", moodScore: 3 }, // Sunday before - out, though within 7 days
      { dayKey: "2026-07-30", moodScore: 3 }, // out
    ];
    expect(countLogsInCurrentWeek(logs, WEDNESDAY)).toBe(2);
    expect(countLogsInCurrentWeek(undefined, WEDNESDAY)).toBe(0);
  });
});
