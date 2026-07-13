import {
  occurrenceDateKey,
  occurrenceTimeFromDate,
  validateOccurrenceTime,
} from "@/src/lib/occurrence-time";

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
