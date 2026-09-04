import { buildMoodChartDataForRange } from "@/src/features/mood/chart-data";
import { addDaysToKey, localDateKey } from "@/src/utils/date";

// Fixed "today" so the date-key helpers below do not drift with the run clock.
const NOW = new Date(2026, 6, 25, 15, 0, 0);
const TODAY = localDateKey(NOW);

function dayKeyAgo(daysAgo: number) {
  return addDaysToKey(TODAY, -daysAgo);
}

describe("buildMoodChartDataForRange", () => {
  it("assigns offsets by real position in an explicit date range", () => {
    // 30-day range; entries on day 0, day 7 and day 29 of it.
    const logs = [
      { dayKey: "2026-03-03", moodScore: 4 },
      { dayKey: "2026-03-10", moodScore: 3 },
      { dayKey: "2026-04-01", moodScore: 5 },
    ];

    const pts = buildMoodChartDataForRange(logs, "2026-03-03", "2026-04-01");

    expect(pts).toHaveLength(3);
    expect(pts[0].offset).toBeCloseTo(0, 5);
    expect(pts[2].offset).toBeCloseTo(1, 5);
    // The middle point sits 7/29 along, not 1/2 — position, not index.
    expect(pts[1].offset).toBeCloseTo(7 / 29, 5);
    // And each score still travels with its own day.
    expect(pts.map((p) => p.score)).toEqual([4, 3, 5]);
  });

  /**
   * ☠️ The out-of-range samples sit EXACTLY one day outside the range, and that
   * is the whole test. Move them further out (2026-03-01 / 2026-04-05, say) and
   * the off-by-one guard on `dayCount = dayKeyDiff(start, end) + 1` stops being
   * covered — a walk widened by a day at each end still passes. Review caught
   * this file weakening in exactly that way, and mutation-proved it.
   */
  it("excludes samples one day before the range start and one day after its end", () => {
    const logs = [
      { dayKey: "2026-03-02", moodScore: 1 },
      { dayKey: "2026-03-10", moodScore: 3 },
      { dayKey: "2026-04-02", moodScore: 5 },
    ];

    const pts = buildMoodChartDataForRange(logs, "2026-03-03", "2026-04-01");

    expect(pts.map((p) => p.score)).toEqual([3]);
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
    const logs = [{ dayKey: "2026-03-10", moodScore: 3 }];

    expect(buildMoodChartDataForRange(logs, "2026-04-01", "2026-03-03")).toEqual([]);
    expect(buildMoodChartDataForRange([], "2026-03-03", "2026-04-01")).toEqual([]);
    expect(buildMoodChartDataForRange(undefined, "2026-03-03", "2026-04-01")).toEqual([]);
  });

  /**
   * ⚠️ Retargeted from the deleted wrapper (#1912). The range walk is what puts
   * points in order, and no other case asserted it — the wrapper was only ever
   * the way this behaviour got reached.
   */
  it("orders points chronologically, oldest first", () => {
    const logs = [
      { dayKey: dayKeyAgo(0), moodScore: 5 },
      { dayKey: dayKeyAgo(6), moodScore: 4 },
      { dayKey: dayKeyAgo(3), moodScore: 2 },
    ];

    const pts = buildMoodChartDataForRange(logs, dayKeyAgo(6), TODAY);

    expect(pts.map((p) => p.score)).toEqual([4, 2, 5]);
  });

  /**
   * ⚠️ Retargeted from the deleted wrapper (#1912), and the reason retargeting
   * mattered rather than deleting: `formatDayLabel` is private to this module
   * and reached ONLY from here, so this is its sole coverage. A 14-day window
   * spans two of every weekday, which is what catches a label that formats to
   * the weekday alone.
   */
  it("gives each day a distinct, non-empty label", () => {
    const logs = Array.from({ length: 14 }, (_, index) => ({
      dayKey: dayKeyAgo(13 - index),
      moodScore: 3,
    }));

    const labels = buildMoodChartDataForRange(logs, dayKeyAgo(13), TODAY).map((p) => p.day);

    expect(labels).toHaveLength(14);
    expect(labels.every((label) => label.length > 0)).toBe(true);
    expect(new Set(labels).size).toBe(14);
  });
});
