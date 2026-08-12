import { getMoodSummary } from "@/src/features/mood/summaries";
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
