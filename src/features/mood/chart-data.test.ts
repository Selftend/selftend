import { buildMoodChartData } from "@/src/features/mood/chart-data";

function isoAtLocal(daysAgo: number, hour = 12) {
  const date = new Date();
  date.setHours(hour, 0, 0, 0);
  date.setDate(date.getDate() - daysAgo);
  return date.toISOString();
}

describe("buildMoodChartData", () => {
  it("returns empty array for undefined or empty input", () => {
    expect(buildMoodChartData(undefined, 14)).toEqual([]);
    expect(buildMoodChartData([], 14)).toEqual([]);
  });

  it("returns empty array when days is non-positive", () => {
    const logs = [{ loggedAt: isoAtLocal(0), moodScore: 3 }];
    expect(buildMoodChartData(logs, 0)).toEqual([]);
  });

  it("averages same-day logs into a single point", () => {
    const logs = [
      { loggedAt: isoAtLocal(0, 9), moodScore: 2 },
      { loggedAt: isoAtLocal(0, 18), moodScore: 4 },
    ];
    const points = buildMoodChartData(logs, 7);
    expect(points).toHaveLength(1);
    expect(points[0].score).toBe(3);
  });

  it("orders points chronologically (oldest first)", () => {
    const logs = [
      { loggedAt: isoAtLocal(0), moodScore: 4 },
      { loggedAt: isoAtLocal(2), moodScore: 3 },
      { loggedAt: isoAtLocal(4), moodScore: 5 },
    ];
    const scores = buildMoodChartData(logs, 7).map((p) => p.score);
    expect(scores).toEqual([5, 3, 4]);
  });

  it("skips days outside the requested window", () => {
    const logs = [
      { loggedAt: isoAtLocal(0), moodScore: 4 },
      { loggedAt: isoAtLocal(30), moodScore: 2 },
    ];
    const points = buildMoodChartData(logs, 7);
    expect(points).toHaveLength(1);
    expect(points[0].score).toBe(4);
  });

  it("gives each day a distinct, non-empty label (no repeated weekday across the window)", () => {
    // Day 0 and day 7 fall on the same weekday; weekday-name labels would collide, hiding
    // that they are two different days. Locale-aware date labels must stay distinct.
    const logs = [
      { loggedAt: isoAtLocal(0), moodScore: 3 },
      { loggedAt: isoAtLocal(7), moodScore: 4 },
    ];
    const labels = buildMoodChartData(logs, 14).map((p) => p.day);
    expect(labels).toHaveLength(2);
    expect(labels.every((l) => l.length > 0)).toBe(true);
    expect(new Set(labels).size).toBe(labels.length);
  });

  it("assigns offsets by real position in the window, not by index", () => {
    // window = 14 days ending today; entries 13 days ago, 1 day ago, today
    const now = Date.now();
    const day = 24 * 60 * 60 * 1000;
    const logs = [
      { loggedAt: new Date(now - 13 * day).toISOString(), moodScore: 4 },
      { loggedAt: new Date(now - 1 * day).toISOString(), moodScore: 3 },
      { loggedAt: new Date(now).toISOString(), moodScore: 5 },
    ];
    const pts = buildMoodChartData(logs, 14);
    expect(pts).toHaveLength(3);
    // oldest entry is window start (dayIndex 0), today is dayIndex 13; denominator = 13
    expect(pts[0].offset).toBeCloseTo(0 / 13, 5); // 13 days ago = window start
    expect(pts[2].offset).toBeCloseTo(1, 5); // today
    expect(pts[2].offset - pts[1].offset).toBeCloseTo(1 / 13, 5); // 1-day gap is small
    expect(pts[1].offset - pts[0].offset).toBeGreaterThan(0.8); // 12-day gap is large
  });
});
