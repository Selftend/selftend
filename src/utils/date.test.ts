import { formatTimestamp } from "@/src/utils/date";

describe("formatTimestamp", () => {
  const ISO = "2026-05-24T10:00:00.000Z";

  it("returns a non-empty string", () => {
    expect(typeof formatTimestamp(ISO)).toBe("string");
    expect(formatTimestamp(ISO).length).toBeGreaterThan(0);
  });

  it("includes the year of the ISO input", () => {
    expect(formatTimestamp(ISO)).toContain("2026");
  });

  it("includes the day of the month of the ISO input", () => {
    // May 24 — look for '24' somewhere in the output
    expect(formatTimestamp(ISO)).toMatch(/24/);
  });

  it("produces different output for two different ISO timestamps", () => {
    const a = formatTimestamp("2026-01-01T08:00:00.000Z");
    const b = formatTimestamp("2026-12-31T23:59:00.000Z");
    expect(a).not.toBe(b);
  });

  it("formats a well-known date with a plausible medium-date + short-time shape", () => {
    // We cannot pin the exact locale string in CI, but the result should
    // contain both a year-like 4-digit sequence and a time separator ":"
    const result = formatTimestamp("2026-05-24T09:05:00.000Z");
    expect(result).toMatch(/2026/);
    expect(result).toMatch(/:/); // time portion always has a colon
  });
});
