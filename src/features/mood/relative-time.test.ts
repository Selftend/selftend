import { formatMoodRelativeTime } from "@/src/features/mood/relative-time";

// A minimal TFunction stand-in that echoes the key (+ count) so assertions read clearly.
const t = ((key: string, opts?: { count?: number }) =>
  opts?.count === undefined ? key : `${key}:${opts.count}`) as unknown as Parameters<
  typeof formatMoodRelativeTime
>[1];

describe("formatMoodRelativeTime", () => {
  const now = new Date("2026-05-24T12:00:00.000Z");

  it("returns today for a log earlier the same local day", () => {
    expect(formatMoodRelativeTime("2026-05-24T01:00:00.000Z", t, now)).toBe("relativeTime.today");
  });

  it("treats a future log as today (non-negative day diff)", () => {
    expect(formatMoodRelativeTime("2026-05-25T01:00:00.000Z", t, now)).toBe("relativeTime.today");
  });

  it("returns yesterday for exactly one local day earlier", () => {
    // Use midday UTC to avoid local-timezone ambiguity at day boundaries
    expect(formatMoodRelativeTime("2026-05-23T12:00:00.000Z", t, now)).toBe(
      "relativeTime.yesterday",
    );
  });

  it("returns daysAgo with the day count for older logs", () => {
    expect(formatMoodRelativeTime("2026-05-20T08:00:00.000Z", t, now)).toBe(
      "relativeTime.daysAgo:4",
    );
  });
});
