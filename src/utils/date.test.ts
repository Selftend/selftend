import {
  addDaysToKey,
  calendarDayDiff,
  dayKeyDiff,
  dayRangeEndKey,
  formatAtOffset,
  formatCompactAtOffset,
  formatTimestamp,
  isValidDayKey,
  lastNDayKeys,
  lastNDayKeysEndingAt,
  localDateKey,
  maxDayKey,
  parseLocalNoon,
  shiftFromOffsetFrame,
  shiftToOffsetFrame,
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

describe("isValidDayKey", () => {
  it("accepts a real day key", () => {
    expect(isValidDayKey("2026-05-24")).toBe(true);
    expect(isValidDayKey("2024-02-29")).toBe(true); // a real leap day
  });

  it("rejects anything that is not the YYYY-MM-DD shape", () => {
    // These reach `Intl.DateTimeFormat` as an invalid Date otherwise, which
    // throws a RangeError and takes the route down.
    for (const value of ["", "bogus", "2026-5-24", "24/05/2026", "2026-05-24T10:00:00Z"]) {
      expect(isValidDayKey(value)).toBe(false);
    }
  });

  it("rejects a well-shaped impossible day", () => {
    // `new Date("2026-02-31T12:00:00")` rolls forward to 3 March rather than
    // failing, so the regex alone would wave these through.
    expect(isValidDayKey("2026-02-31")).toBe(false);
    expect(isValidDayKey("2026-13-01")).toBe(false);
    expect(isValidDayKey("2023-02-29")).toBe(false); // 2023 is not a leap year
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

describe("day-key arithmetic", () => {
  it("steps forward and back across month and year boundaries", () => {
    expect(addDaysToKey("2026-05-31", 1)).toBe("2026-06-01");
    expect(addDaysToKey("2026-06-01", -1)).toBe("2026-05-31");
    expect(addDaysToKey("2026-12-31", 1)).toBe("2027-01-01");
    expect(addDaysToKey("2026-03-01", -1)).toBe("2026-02-28");
    expect(addDaysToKey("2024-03-01", -1)).toBe("2024-02-29"); // leap year
    expect(addDaysToKey("2026-05-24", 0)).toBe("2026-05-24");
  });

  it("measures signed whole days between keys", () => {
    expect(dayKeyDiff("2026-05-24", "2026-05-31")).toBe(7);
    expect(dayKeyDiff("2026-05-31", "2026-05-24")).toBe(-7);
    expect(dayKeyDiff("2026-05-24", "2026-05-24")).toBe(0);
  });

  it("returns `count` keys ending on the given day, oldest first", () => {
    expect(lastNDayKeysEndingAt(3, "2026-06-01")).toEqual([
      "2026-05-30",
      "2026-05-31",
      "2026-06-01",
    ]);
    expect(lastNDayKeysEndingAt(1, "2026-06-01")).toEqual(["2026-06-01"]);
  });

  it("takes the later of two keys", () => {
    expect(maxDayKey("2026-05-31", "2026-06-01")).toBe("2026-06-01");
    expect(maxDayKey("2026-06-01", "2026-05-31")).toBe("2026-06-01");
    expect(maxDayKey("2026-06-01", "2026-06-01")).toBe("2026-06-01");
  });

  describe("dayRangeEndKey", () => {
    const now = new Date(2026, 4, 31, 12, 0, 0);

    it("is today when every entry is in the past", () => {
      expect(dayRangeEndKey(["2026-05-20", "2026-05-30"], now)).toBe("2026-05-31");
      expect(dayRangeEndKey([], now)).toBe("2026-05-31");
    });

    // Log in Tokyo, land in Los Angeles while it is still the previous day there:
    // the entry's captured day is ahead of the viewer's today and must still be
    // covered, or it vanishes from every chart and strip (#250).
    it("extends past today to cover an entry captured further east", () => {
      expect(dayRangeEndKey(["2026-05-30", "2026-06-01"], now)).toBe("2026-06-01");
    });
  });
});

describe("formatAtOffset", () => {
  // 14:30 UTC is 23:30 in Tokyo (+540). Reading it in any other zone must still
  // show 23:30, so the time agrees with the civil day it is filed under.
  it("renders at the captured offset, not the viewer's zone", () => {
    const formatted = formatAtOffset("2026-07-13T14:30:00.000Z", 540, "en");
    expect(formatted).toContain("11:30 PM");
    expect(formatted).toContain("Jul 13");
  });

  it("honours a half-hour captured offset", () => {
    expect(formatAtOffset("2026-07-13T19:00:00.000Z", 330, "en")).toContain("12:30 AM");
  });

  it("falls back to the viewer's zone when no offset was captured", () => {
    // TZ is pinned to Asia/Kolkata (+05:30): 19:00 UTC reads as 00:30 the next day.
    const formatted = formatAtOffset("2026-07-13T19:00:00.000Z", null, "en");
    expect(formatted).toContain("12:30 AM");
    expect(formatted).toContain("Jul 14");
  });

  it("returns the input unchanged when it is not a date", () => {
    expect(formatAtOffset("nope", 120, "en")).toBe("nope");
  });
});

describe("formatCompactAtOffset", () => {
  // TZ is pinned to Asia/Kolkata (+05:30); "today" for these tests is Monday
  // 13 July 2026 in that frame.
  const now = new Date("2026-07-13T12:00:00");

  it("renders a bare time for an entry captured today", () => {
    // 05:00 UTC at +05:30 is 10:30 on July 13 — today.
    const formatted = formatCompactAtOffset("2026-07-13T05:00:00.000Z", 330, "en", now);
    expect(formatted).toBe("10:30 AM");
  });

  it("decides 'today' in the CAPTURED frame, not the viewer's", () => {
    // 22:00 UTC on July 13 at +09:00 is already 07:00 on July 14 — a travel
    // entry keyed "tomorrow" relative to the viewer. Still a bare time (#250).
    const formatted = formatCompactAtOffset("2026-07-13T22:00:00.000Z", 540, "en", now);
    expect(formatted).toBe("7:00 AM");
  });

  it("renders weekday plus time within the last week", () => {
    // July 10 is three days back — a weekday is unambiguous under 7 days.
    const formatted = formatCompactAtOffset("2026-07-10T05:00:00.000Z", 330, "en", now);
    expect(formatted).toContain("Fri");
    expect(formatted).toContain("10:30 AM");
  });

  it("renders a short date at exactly seven days back, where the weekday repeats", () => {
    const formatted = formatCompactAtOffset("2026-07-06T05:00:00.000Z", 330, "en", now);
    expect(formatted).toContain("Jul 6");
    expect(formatted).not.toMatch(/AM|PM/);
    // The current year stays implicit.
    expect(formatted).not.toContain("2026");
  });

  it("adds the year only when it is not the viewer's", () => {
    const formatted = formatCompactAtOffset("2025-11-20T05:00:00.000Z", 330, "en", now);
    expect(formatted).toContain("Nov 20");
    expect(formatted).toContain("2025");
  });

  it("falls back to the viewer's frame when no offset was captured", () => {
    // 19:00 UTC reads as 00:30 on July 14 in Kolkata — the viewer's tomorrow,
    // so still a bare time.
    expect(formatCompactAtOffset("2026-07-13T19:00:00.000Z", null, "en", now)).toBe("12:30 AM");
  });

  it("returns the input unchanged when it is not a date", () => {
    expect(formatCompactAtOffset("nope", 120, "en", now)).toBe("nope");
  });
});

describe("offset frame shifts", () => {
  it("round-trips an instant through a captured frame", () => {
    const instant = new Date("2026-07-13T14:30:00.000Z");
    for (const offset of [540, 330, 0, -420]) {
      const shifted = shiftToOffsetFrame(instant, offset);
      expect(shiftFromOffsetFrame(shifted, offset).toISOString()).toBe(instant.toISOString());
    }
  });

  it("makes the device-local wall clock read as the captured frame's", () => {
    // 14:30 UTC at +540 is 23:30; the shifted Date reads 23:30 in local getters.
    const shifted = shiftToOffsetFrame(new Date("2026-07-13T14:30:00.000Z"), 540);
    expect(shifted.getHours()).toBe(23);
    expect(shifted.getMinutes()).toBe(30);
    expect(shifted.getDate()).toBe(13);
  });
});

// jest.config.js pins TZ to Asia/Kolkata, which has no DST - so the round-trip
// above cannot expose an offset resolved at the wrong instant. Re-pin to a DST
// zone for this block only.
describe("shiftToOffsetFrame across a device-zone DST boundary", () => {
  const originalTz = process.env.TZ;
  beforeAll(() => {
    process.env.TZ = "America/New_York";
  });
  afterAll(() => {
    process.env.TZ = originalTz;
  });

  // 2026-03-08 is US spring-forward. 06:30Z is still EST (-300); shifting into
  // offset 0 lands at 11:30Z, which is already EDT (-240).
  const springForward = new Date("2026-03-08T06:30:00.000Z");

  it("displays the captured wall clock, not one shifted by the DST delta", () => {
    const shifted = shiftToOffsetFrame(springForward, 0);
    expect(shifted.getHours()).toBe(6);
    expect(shifted.getMinutes()).toBe(30);
  });

  it("stays the inverse of shiftFromOffsetFrame across the boundary", () => {
    const shifted = shiftToOffsetFrame(springForward, 0);
    expect(shiftFromOffsetFrame(shifted, 0).toISOString()).toBe(springForward.toISOString());
  });
});
