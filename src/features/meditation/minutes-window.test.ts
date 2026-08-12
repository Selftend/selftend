import {
  buildMinutesWindow,
  MINUTES_WINDOW_DAYS,
  minutesWindowFromIso,
  windowTotalMinutes,
} from "@/src/features/meditation/minutes-window";

// The runner's timezone is pinned to Asia/Kolkata (+05:30) in jest.config.js.
const NOW = new Date("2026-08-07T12:00:00+05:30");

describe("buildMinutesWindow", () => {
  it("draws thirty consecutive days, oldest first, ending on today", () => {
    const window = buildMinutesWindow([], MINUTES_WINDOW_DAYS, NOW);

    expect(window).toHaveLength(30);
    expect(window[0]!.dayKey).toBe("2026-07-09");
    expect(window[29]!.dayKey).toBe("2026-08-07");
  });

  it("gives a day with no sit a zero rather than leaving it out", () => {
    // A gap and a zero are different facts. The chart draws a stub for the
    // second, and only a full run of days can tell it which days those are.
    const window = buildMinutesWindow(
      [{ dayKey: "2026-08-07", durationMinutes: 12 }],
      MINUTES_WINDOW_DAYS,
      NOW,
    );

    expect(window).toHaveLength(30);
    expect(window.filter((day) => day.minutes === 0)).toHaveLength(29);
    expect(window[29]).toEqual({ dayKey: "2026-08-07", minutes: 12 });
  });

  it("sums two sits on one day into one column", () => {
    const window = buildMinutesWindow(
      [
        { dayKey: "2026-08-06", durationMinutes: 12 },
        { dayKey: "2026-08-06", durationMinutes: 20 },
      ],
      MINUTES_WINDOW_DAYS,
      NOW,
    );

    expect(window[28]).toEqual({ dayKey: "2026-08-06", minutes: 32 });
  });

  it("ignores sits older than the window without disturbing it", () => {
    const window = buildMinutesWindow(
      [
        { dayKey: "2026-06-01", durationMinutes: 45 },
        { dayKey: "2026-07-09", durationMinutes: 10 },
      ],
      MINUTES_WINDOW_DAYS,
      NOW,
    );

    expect(window).toHaveLength(30);
    expect(window[0]).toEqual({ dayKey: "2026-07-09", minutes: 10 });
    expect(windowTotalMinutes(window)).toBe(10);
  });

  it("extends past today to reach a sit keyed tomorrow", () => {
    // Fly east-to-west and you land holding a sit captured on a day the viewer
    // has not reached. Clamping the window at the viewer's today would drop it
    // off the right-hand edge of the chart entirely (#250).
    const window = buildMinutesWindow(
      [{ dayKey: "2026-08-08", durationMinutes: 30 }],
      MINUTES_WINDOW_DAYS,
      NOW,
    );

    expect(window[29]).toEqual({ dayKey: "2026-08-08", minutes: 30 });
    expect(window[0]!.dayKey).toBe("2026-07-10");
  });

  it("treats an unloaded window as an empty one rather than throwing", () => {
    expect(buildMinutesWindow(undefined, MINUTES_WINDOW_DAYS, NOW)).toHaveLength(30);
    expect(windowTotalMinutes(buildMinutesWindow(undefined, MINUTES_WINDOW_DAYS, NOW))).toBe(0);
  });
});

describe("minutesWindowFromIso", () => {
  it("bounds the fetch one day before the window's first column", () => {
    // The query filters `completed_at`, a UTC instant, while the chart buckets
    // by the captured civil day - so a sit logged at +14:00 belongs to a day key
    // up to 14h before its own instant. A bound placed on the window's own first
    // midnight would drop it.
    const fromIso = minutesWindowFromIso(MINUTES_WINDOW_DAYS, NOW);
    const window = buildMinutesWindow([], MINUTES_WINDOW_DAYS, NOW);

    expect(new Date(fromIso).getTime()).toBeLessThan(
      new Date(`${window[0]!.dayKey}T00:00:00+05:30`).getTime(),
    );
    expect(fromIso).toBe(new Date("2026-07-08T00:00:00+05:30").toISOString());
  });
});
