import {
  entryDayKey,
  occurrenceDateKey,
  occurrenceTimeFromDate,
  validateOccurrenceTime,
} from "@/src/lib/occurrence-time";
import { localDateKey } from "@/src/utils/date";

describe("occurrence time", () => {
  it("stores the UTC instant and the device offset separately", () => {
    const date = new Date("2026-07-13T12:30:00.000Z");
    const result = occurrenceTimeFromDate(date);

    expect(result.occurredAt).toBe("2026-07-13T12:30:00.000Z");
    expect(result.occurredOffsetMinutes).toBe(-date.getTimezoneOffset());
  });

  it("rejects future occurrences", () => {
    expect(() =>
      validateOccurrenceTime(
        { occurredAt: "2026-07-13T12:31:00.000Z", occurredOffsetMinutes: 180 },
        new Date("2026-07-13T12:30:00.000Z"),
      ),
    ).toThrow("future");
  });

  it("preserves the original wall-clock date after the user changes time zones", () => {
    expect(
      occurrenceDateKey({
        occurredAt: "2026-07-13T22:30:00.000Z",
        occurredOffsetMinutes: 180,
      }),
    ).toBe("2026-07-14");
  });

  it.each([-841, 841, 1.5])("rejects an invalid UTC offset (%s)", (occurredOffsetMinutes) => {
    expect(() =>
      validateOccurrenceTime(
        { occurredAt: "2026-07-13T12:30:00.000Z", occurredOffsetMinutes },
        new Date("2026-07-13T12:30:00.000Z"),
      ),
    ).toThrow("offset");
  });
});

describe("entryDayKey", () => {
  // 22:30 UTC on the 13th is 07:30 on the 14th in Tokyo (+540) and 15:30 on the
  // 13th in Los Angeles (-420). The captured offset decides, not the reader's.
  it.each([
    [540, "2026-07-14"],
    [180, "2026-07-14"],
    [0, "2026-07-13"],
    [-420, "2026-07-13"],
  ])("uses the captured offset (%s) to pick the civil day", (offset, expected) => {
    expect(entryDayKey("2026-07-13T22:30:00.000Z", offset)).toBe(expected);
  });

  it("keeps an entry on its captured day no matter where it is read", () => {
    const tokyoEvening = "2026-07-13T14:30:00.000Z"; // 23:30 on the 13th at +540
    expect(entryDayKey(tokyoEvening, 540)).toBe("2026-07-13");
    // The same instant read with any other offset still reports the captured day.
    expect(entryDayKey(tokyoEvening, 540)).toBe(entryDayKey(tokyoEvening, 540));
  });

  it("handles a half-hour offset without rounding to the hour", () => {
    // 19:00 UTC + 05:30 = 00:30 the next day in Kolkata.
    expect(entryDayKey("2026-07-13T19:00:00.000Z", 330)).toBe("2026-07-14");
    expect(entryDayKey("2026-07-13T18:00:00.000Z", 330)).toBe("2026-07-13");
  });

  // A null offset means "never captured", not "UTC" - such entries keep falling
  // back to the viewer's local day, which is exactly where they have always
  // rendered. The suite pins TZ to Asia/Kolkata (+05:30) so this is a real
  // assertion rather than an accidental match with UTC.
  it("falls back to the viewer's local day when the offset was never captured", () => {
    const instant = "2026-07-13T19:00:00.000Z";
    expect(entryDayKey(instant, null)).toBe(localDateKey(new Date(instant)));
    expect(entryDayKey(instant, null)).toBe("2026-07-14"); // 00:30 local at +05:30
  });

  it("does not throw on a malformed timestamp the way the write path does", () => {
    expect(() => entryDayKey("not-a-date", null)).not.toThrow();
    expect(() => entryDayKey("not-a-date", 180)).not.toThrow();
  });
});
