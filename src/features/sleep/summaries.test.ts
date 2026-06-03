import {
  averageDurationMinutes,
  averageQuality,
  extremes,
  loggedOnDate,
  qualityDistribution,
  recentNights,
  weekdayAverages,
} from "@/src/features/sleep/summaries";
import { toLocalDateKey } from "@/src/utils/date";

function daysAgo(days: number, hour = 12) {
  const d = new Date();
  d.setHours(hour, 0, 0, 0);
  d.setDate(d.getDate() - days);
  return d.toISOString();
}

function log(durationMinutes: number, quality: number, loggedAt: string) {
  return { id: `l-${loggedAt}-${durationMinutes}`, durationMinutes, quality, loggedAt };
}

describe("averageDurationMinutes", () => {
  it("returns null with no logs in the window", () => {
    expect(averageDurationMinutes([], 7)).toBeNull();
    expect(averageDurationMinutes([log(360, 3, daysAgo(30))], 7)).toBeNull();
  });

  it("rounds the mean of in-window logs", () => {
    expect(averageDurationMinutes([log(360, 3, daysAgo(1)), log(421, 3, daysAgo(2))], 7)).toBe(391);
  });
});

describe("averageQuality", () => {
  it("returns null with no in-window logs", () => {
    expect(averageQuality([], 7)).toBeNull();
  });

  it("averages quality to one decimal", () => {
    expect(averageQuality([log(360, 3, daysAgo(0)), log(360, 4, daysAgo(1))], 7)).toBe(3.5);
  });
});

describe("recentNights", () => {
  it("returns the newest n logs, oldest->newest", () => {
    const a = log(360, 3, daysAgo(3));
    const b = log(420, 4, daysAgo(1));
    const c = log(300, 2, daysAgo(2));
    const result = recentNights([a, b, c], 2);
    expect(result.map((l) => l.id)).toEqual([c.id, b.id]);
  });
});

describe("extremes", () => {
  it("returns null/null with no logs", () => {
    expect(extremes([])).toEqual({ longest: null, shortest: null });
  });

  it("finds longest and shortest durations", () => {
    expect(
      extremes([log(360, 3, daysAgo(1)), log(480, 4, daysAgo(2)), log(300, 2, daysAgo(3))]),
    ).toEqual({ longest: 480, shortest: 300 });
  });
});

describe("qualityDistribution", () => {
  it("counts each quality 1..5 into indexes 0..4", () => {
    const logs = [
      log(360, 1, daysAgo(1)),
      log(360, 3, daysAgo(2)),
      log(360, 3, daysAgo(3)),
      log(360, 5, daysAgo(4)),
    ];
    expect(qualityDistribution(logs)).toEqual([1, 0, 2, 0, 1]);
  });
});

describe("weekdayAverages", () => {
  it("averages duration per weekday, Monday-first, null for empty days", () => {
    // 2026-06-01 is a Monday; 2026-06-02 a Tuesday.
    const mon = new Date(2026, 5, 1, 12).toISOString();
    const tue = new Date(2026, 5, 2, 12).toISOString();
    const result = weekdayAverages([log(360, 3, mon), log(420, 4, mon), log(300, 2, tue)]);
    expect(result[0]).toBe(390); // Monday avg
    expect(result[1]).toBe(300); // Tuesday avg
    expect(result[6]).toBeNull(); // Sunday empty
  });
});

describe("loggedOnDate", () => {
  it("matches a log on the given local date key", () => {
    const today = daysAgo(0);
    expect(loggedOnDate([{ loggedAt: today }], toLocalDateKey(today))).toBe(true);
    expect(loggedOnDate([{ loggedAt: daysAgo(5) }], "1999-01-01")).toBe(false);
  });
});
