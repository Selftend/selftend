import {
  SLEEP_DURATION_OPTIONS,
  SLEEP_NOTES_MAX,
  sleepLogSchema,
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
