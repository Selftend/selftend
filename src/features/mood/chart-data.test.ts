import { buildMoodChartData, buildMoodChartDataForRange } from "@/src/features/mood/chart-data";
import { addDaysToKey, localDateKey } from "@/src/utils/date";

// Fixed "today" so the trailing-window tests do not drift with the run clock.
const NOW = new Date(2026, 6, 25, 15, 0, 0);
const TODAY = localDateKey(NOW);

function dayKeyAgo(daysAgo: number) {
  return addDaysToKey(TODAY, -daysAgo);
}

describe("buildMoodChartData", () => {
  it("returns empty array for undefined or empty input", () => {
    expect(buildMoodChartData(undefined, 14, "en", NOW)).toEqual([]);
    expect(buildMoodChartData([], 14, "en", NOW)).toEqual([]);
  });

  it("returns empty array when days is non-positive", () => {
    const logs = [{ dayKey: dayKeyAgo(0), moodScore: 3 }];
    expect(buildMoodChartData(logs, 0, "en", NOW)).toEqual([]);
  });

  it("averages same-day logs into a single point", () => {
    const logs = [
      { dayKey: dayKeyAgo(0), moodScore: 2 },
      { dayKey: dayKeyAgo(0), moodScore: 4 },
    ];
    const points = buildMoodChartData(logs, 7, "en", NOW);
    expect(points).toHaveLength(1);
    expect(points[0].score).toBe(3);
  });

  it("orders points chronologically (oldest first)", () => {
    const logs = [
      { dayKey: dayKeyAgo(0), moodScore: 4 },
      { dayKey: dayKeyAgo(2), moodScore: 3 },
      { dayKey: dayKeyAgo(4), moodScore: 5 },
    ];
    const scores = buildMoodChartData(logs, 7, "en", NOW).map((p) => p.score);
    expect(scores).toEqual([5, 3, 4]);
  });

  it("skips days outside the requested window", () => {
    const logs = [
      { dayKey: dayKeyAgo(0), moodScore: 4 },
      { dayKey: dayKeyAgo(30), moodScore: 2 },
    ];
    const points = buildMoodChartData(logs, 7, "en", NOW);
    expect(points).toHaveLength(1);
    expect(points[0].score).toBe(4);
  });

  it("gives each day a distinct, non-empty label (no repeated weekday across the window)", () => {
    // Day 0 and day 7 fall on the same weekday; weekday-name labels would collide, hiding
    // that they are two different days. Locale-aware date labels must stay distinct.
    const logs = [
      { dayKey: dayKeyAgo(0), moodScore: 3 },
      { dayKey: dayKeyAgo(7), moodScore: 4 },
    ];
    const labels = buildMoodChartData(logs, 14, "en", NOW).map((p) => p.day);
    expect(labels).toHaveLength(2);
    expect(labels.every((l) => l.length > 0)).toBe(true);
    expect(new Set(labels).size).toBe(labels.length);
  });

  it("assigns offsets by real position in an explicit date range", () => {
    // Fixed 30-day range 2026-03-03..2026-04-01: entries on the first day, day 15, last day.
    const logs = [
      { dayKey: "2026-03-03", moodScore: 4 },
      { dayKey: "2026-03-18", moodScore: 3 },
      { dayKey: "2026-04-01", moodScore: 5 },
    ];
    const pts = buildMoodChartDataForRange(logs, "2026-03-03", "2026-04-01");
    expect(pts).toHaveLength(3);
    expect(pts[0].offset).toBeCloseTo(0, 5);
    expect(pts[1].offset).toBeCloseTo(15 / 29, 5);
    expect(pts[2].offset).toBeCloseTo(1, 5);
    expect(pts.map((p) => p.score)).toEqual([4, 3, 5]);
  });

  it("excludes samples before the range start and after the range end", () => {
    const logs = [
      { dayKey: "2026-03-02", moodScore: 1 },
      { dayKey: "2026-03-10", moodScore: 4 },
      { dayKey: "2026-04-02", moodScore: 1 },
    ];
    const pts = buildMoodChartDataForRange(logs, "2026-03-03", "2026-04-01");
    expect(pts).toHaveLength(1);
    expect(pts[0].score).toBe(4);
  });

  it("averages same-day logs and centers a single-day range at offset 0", () => {
    const logs = [
      { dayKey: "2026-03-10", moodScore: 2 },
      { dayKey: "2026-03-10", moodScore: 5 },
    ];
    const pts = buildMoodChartDataForRange(logs, "2026-03-10", "2026-03-10");
    expect(pts).toHaveLength(1);
    expect(pts[0].score).toBe(3.5);
    expect(pts[0].offset).toBe(0);
  });

  it("returns empty for an inverted or empty range", () => {
    const logs = [{ dayKey: "2026-03-10", moodScore: 2 }];
    expect(buildMoodChartDataForRange(logs, "2026-04-01", "2026-03-03")).toEqual([]);
    expect(buildMoodChartDataForRange([], "2026-03-03", "2026-04-01")).toEqual([]);
    expect(buildMoodChartDataForRange(undefined, "2026-03-03", "2026-04-01")).toEqual([]);
  });

  it("assigns offsets by real position in the window, not by index", () => {
    // window = 14 days ending today; entries 13 days ago, 1 day ago, today
    const logs = [
      { dayKey: dayKeyAgo(13), moodScore: 4 },
      { dayKey: dayKeyAgo(1), moodScore: 3 },
      { dayKey: dayKeyAgo(0), moodScore: 5 },
    ];
    const pts = buildMoodChartData(logs, 14, "en", NOW);
    expect(pts).toHaveLength(3);
    // oldest entry is window start (dayIndex 0), today is dayIndex 13; denominator = 13
    expect(pts[0].offset).toBeCloseTo(0 / 13, 5); // 13 days ago = window start
    expect(pts[2].offset).toBeCloseTo(1, 5); // today
    expect(pts[2].offset - pts[1].offset).toBeCloseTo(1 / 13, 5); // 1-day gap is small
    expect(pts[1].offset - pts[0].offset).toBeGreaterThan(0.8); // 12-day gap is large
  });

  // The window ends at today OR at a later captured day, so an entry logged east
  // of the viewer is not clipped off the right-hand edge of the trend.
  it("extends the trailing window to include a day captured ahead of today", () => {
    const logs = [
      { dayKey: dayKeyAgo(0), moodScore: 3 },
      { dayKey: addDaysToKey(TODAY, 1), moodScore: 5 },
    ];
    const pts = buildMoodChartData(logs, 7, "en", NOW);
    expect(pts.map((p) => p.score)).toEqual([3, 5]);
    expect(pts[pts.length - 1].offset).toBeCloseTo(1, 5);
  });
});
