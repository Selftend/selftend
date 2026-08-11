import {
  deriveWindowDurationMinutes,
  SLEEP_DURATION_OPTIONS,
  SLEEP_NOTES_MAX,
  SLEEP_WINDOW_MAX_MINUTES,
  sleepLogSchema,
  sleepWindowSchema,
} from "@/src/features/sleep/schemas";

describe("sleepLogSchema", () => {
  const base = { durationMinutes: 480, quality: 4, notes: "" };

  it("accepts a minimal valid log", () => {
    expect(sleepLogSchema.safeParse(base).success).toBe(true);
  });

  it("rejects non-integer or zero duration", () => {
    expect(sleepLogSchema.safeParse({ ...base, durationMinutes: 0 }).success).toBe(false);
    expect(sleepLogSchema.safeParse({ ...base, durationMinutes: -60 }).success).toBe(false);
    expect(sleepLogSchema.safeParse({ ...base, durationMinutes: 1.5 }).success).toBe(false);
  });

  it("rejects quality outside 1-5 or non-integer", () => {
    expect(sleepLogSchema.safeParse({ ...base, quality: 0 }).success).toBe(false);
    expect(sleepLogSchema.safeParse({ ...base, quality: 6 }).success).toBe(false);
    expect(sleepLogSchema.safeParse({ ...base, quality: 3.5 }).success).toBe(false);
  });

  it("rejects notes longer than max", () => {
    expect(
      sleepLogSchema.safeParse({ ...base, notes: "x".repeat(SLEEP_NOTES_MAX + 1) }).success,
    ).toBe(false);
  });
});

describe("sleepWindowSchema", () => {
  const base = {
    startedAt: "2026-07-20T22:30:00.000Z",
    startedOffsetMinutes: 120,
    endedAt: "2026-07-21T06:00:00.000Z",
    endedOffsetMinutes: 120,
  };

  it("accepts a complete window", () => {
    expect(sleepWindowSchema.safeParse(base).success).toBe(true);
  });

  it("rejects a one-sided window — both bounds and both offsets travel together", () => {
    const { endedAt: _endedAt, ...missingEnd } = base;
    expect(sleepWindowSchema.safeParse(missingEnd).success).toBe(false);
    const { startedOffsetMinutes: _so, ...missingOffset } = base;
    expect(sleepWindowSchema.safeParse(missingOffset).success).toBe(false);
  });

  it("rejects unparseable instants and out-of-range offsets", () => {
    expect(sleepWindowSchema.safeParse({ ...base, startedAt: "not a date" }).success).toBe(false);
    expect(sleepWindowSchema.safeParse({ ...base, endedOffsetMinutes: 900 }).success).toBe(false);
    expect(sleepWindowSchema.safeParse({ ...base, startedOffsetMinutes: -900 }).success).toBe(
      false,
    );
  });
});

describe("deriveWindowDurationMinutes", () => {
  it("derives whole minutes between the bounds", () => {
    expect(
      deriveWindowDurationMinutes({
        startedAt: "2026-07-20T22:30:00.000Z",
        endedAt: "2026-07-21T06:00:00.000Z",
      }),
    ).toBe(450);
  });

  it("returns null for equal or inverted bounds — the unsavable seeded state", () => {
    expect(
      deriveWindowDurationMinutes({
        startedAt: "2026-07-21T06:00:00.000Z",
        endedAt: "2026-07-21T06:00:00.000Z",
      }),
    ).toBeNull();
    expect(
      deriveWindowDurationMinutes({
        startedAt: "2026-07-21T06:00:00.000Z",
        endedAt: "2026-07-20T22:30:00.000Z",
      }),
    ).toBeNull();
  });

  it("returns null for unparseable instants", () => {
    expect(
      deriveWindowDurationMinutes({ startedAt: "nope", endedAt: "2026-07-21T06:00:00.000Z" }),
    ).toBeNull();
  });

  it("caps at the database's 24-hour bound via the exported constant", () => {
    // 24h exactly is valid; the screen compares against this same constant.
    expect(
      deriveWindowDurationMinutes({
        startedAt: "2026-07-20T06:00:00.000Z",
        endedAt: "2026-07-21T06:00:00.000Z",
      }),
    ).toBe(SLEEP_WINDOW_MAX_MINUTES);
  });
});

describe("SLEEP_DURATION_OPTIONS", () => {
  it("is strictly ascending and all positive integers", () => {
    let prev = -1;
    for (const v of SLEEP_DURATION_OPTIONS) {
      expect(Number.isInteger(v)).toBe(true);
      expect(v).toBeGreaterThan(prev);
      prev = v;
    }
  });

  it("ranges between 4 and 10.5 hours", () => {
    expect(SLEEP_DURATION_OPTIONS[0]).toBe(240);
    expect(SLEEP_DURATION_OPTIONS[SLEEP_DURATION_OPTIONS.length - 1]).toBe(630);
  });
});
