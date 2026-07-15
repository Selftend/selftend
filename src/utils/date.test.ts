import {
  calendarDayDiff,
  formatTimestamp,
  lastNDayKeys,
  localDateKey,
  parseLocalNoon,
} from "@/src/utils/date";

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
    // May 24 - look for '24' somewhere in the output
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

describe("calendarDayDiff", () => {
  // Returns whole calendar days as `to_day - from_day`, ignoring wall-clock time.
  it("is 0 for two times on the same calendar day", () => {
    const from = new Date(2026, 4, 24, 1, 0, 0);
    const to = new Date(2026, 4, 24, 23, 0, 0);
    expect(calendarDayDiff(from, to)).toBe(0);
  });

  it("is 1 when `from` is the day before `to`", () => {
    const from = new Date(2026, 4, 23, 23, 0, 0);
    const to = new Date(2026, 4, 24, 0, 5, 0);
    expect(calendarDayDiff(from, to)).toBe(1);
  });

  it("is negative when `from` is after `to` (future log)", () => {
    const from = new Date(2026, 4, 25, 0, 0, 0);
    const to = new Date(2026, 4, 24, 0, 0, 0);
    expect(calendarDayDiff(from, to)).toBe(-1);
  });
});

describe("lastNDayKeys", () => {
  it("returns `count` local day keys ending on the reference day, oldest first", () => {
    const reference = new Date(2026, 6, 15, 9, 30); // Jul 15, mid-morning
    expect(lastNDayKeys(7, reference)).toEqual([
      "2026-07-09",
      "2026-07-10",
      "2026-07-11",
      "2026-07-12",
      "2026-07-13",
      "2026-07-14",
      "2026-07-15",
    ]);
  });

  it("walks back across month boundaries", () => {
    const reference = new Date(2026, 7, 1, 23, 59); // Aug 1, late evening
    expect(lastNDayKeys(3, reference)).toEqual(["2026-07-30", "2026-07-31", "2026-08-01"]);
  });

  it("a count of 1 is just the reference day", () => {
    const reference = new Date(2026, 0, 1, 0, 0, 1);
    expect(lastNDayKeys(1, reference)).toEqual(["2026-01-01"]);
  });

  it("defaults the reference to now, so the last key is today's key", () => {
    const keys = lastNDayKeys(7);
    expect(keys).toHaveLength(7);
    expect(keys[keys.length - 1]).toBe(localDateKey(new Date()));
  });
});

describe("parseLocalNoon", () => {
  // Local-time getters make this deterministic across timezones: the input is
  // anchored at local noon, so the civil date never rolls over to a neighbour.
  it("anchors the parsed Date at local noon", () => {
    expect(parseLocalNoon("2026-05-24").getHours()).toBe(12);
  });

  it("preserves the calendar date from the key", () => {
    const d = parseLocalNoon("2026-05-24");
    expect(d.getFullYear()).toBe(2026);
    expect(d.getMonth() + 1).toBe(5);
    expect(d.getDate()).toBe(24);
  });
});
