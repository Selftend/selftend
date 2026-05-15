import { getMoodSummary } from "@/src/features/mood/summaries";

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
