import {
  ROUTINE_NAME_MAX,
  routineInputSchema,
  routineStepInputSchema,
  routineUpdateSchema,
} from "@/src/features/routines/schemas";

describe("routineInputSchema", () => {
  it("accepts a name-only routine (reminder fields optional)", () => {
    expect(routineInputSchema.safeParse({ name: "Morning" }).success).toBe(true);
  });

  it("accepts a full reminder configuration", () => {
    const result = routineInputSchema.safeParse({
      name: "Evening wind-down",
      reminderEnabled: true,
      reminderHour: 21,
      reminderMinute: 30,
      reminderTimezone: "Europe/Sofia",
    });
    expect(result.success).toBe(true);
  });

  it("accepts null reminder fields (reminders cleared)", () => {
    const result = routineInputSchema.safeParse({
      name: "Morning",
      reminderHour: null,
      reminderMinute: null,
      reminderTimezone: null,
    });
    expect(result.success).toBe(true);
  });

  it("rejects a blank name", () => {
    expect(routineInputSchema.safeParse({ name: "   " }).success).toBe(false);
  });

  it("rejects names over the limit", () => {
    const result = routineInputSchema.safeParse({ name: "x".repeat(ROUTINE_NAME_MAX + 1) });
    expect(result.success).toBe(false);
  });

  it("rejects an out-of-range hour (DB check is 0-23)", () => {
    expect(routineInputSchema.safeParse({ name: "n", reminderHour: 24 }).success).toBe(false);
  });

  it("rejects an out-of-range minute (DB check is 0-59)", () => {
    expect(routineInputSchema.safeParse({ name: "n", reminderMinute: 60 }).success).toBe(false);
  });

  it("rejects fractional reminder times", () => {
    expect(routineInputSchema.safeParse({ name: "n", reminderHour: 7.5 }).success).toBe(false);
  });

  // Schedule fields (#103, design #96-#98): DB CHECKs are
  // routines_data_cadence_valid / _custom_days_valid.
  it("accepts every cadence, with custom days for custom", () => {
    expect(routineInputSchema.safeParse({ name: "n", cadence: "daily" }).success).toBe(true);
    expect(routineInputSchema.safeParse({ name: "n", cadence: "weekdays" }).success).toBe(true);
    expect(routineInputSchema.safeParse({ name: "n", cadence: "on-demand" }).success).toBe(true);
    expect(
      routineInputSchema.safeParse({ name: "n", cadence: "custom", customDays: [1, 3, 5] }).success,
    ).toBe(true);
  });

  it("rejects an unknown cadence", () => {
    expect(routineInputSchema.safeParse({ name: "n", cadence: "weekly" }).success).toBe(false);
  });

  it("rejects custom cadence without at least one day (DB check parity)", () => {
    expect(routineInputSchema.safeParse({ name: "n", cadence: "custom" }).success).toBe(false);
    expect(
      routineInputSchema.safeParse({ name: "n", cadence: "custom", customDays: [] }).success,
    ).toBe(false);
  });

  it("rejects out-of-range or fractional days (getDay() values are 0-6 ints)", () => {
    expect(
      routineInputSchema.safeParse({ name: "n", cadence: "custom", customDays: [7] }).success,
    ).toBe(false);
    expect(
      routineInputSchema.safeParse({ name: "n", cadence: "custom", customDays: [-1] }).success,
    ).toBe(false);
    expect(
      routineInputSchema.safeParse({ name: "n", cadence: "custom", customDays: [1.5] }).success,
    ).toBe(false);
  });
});

describe("routineUpdateSchema", () => {
  it("accepts a reminder-only patch with no name", () => {
    expect(routineUpdateSchema.safeParse({ reminderEnabled: false }).success).toBe(true);
  });

  it("still rejects a blank name when one is supplied", () => {
    expect(routineUpdateSchema.safeParse({ name: " " }).success).toBe(false);
  });

  it("accepts a schedule-only patch", () => {
    expect(routineUpdateSchema.safeParse({ cadence: "custom", customDays: [0, 6] }).success).toBe(
      true,
    );
  });

  it("still rejects a day-less switch to custom", () => {
    expect(routineUpdateSchema.safeParse({ cadence: "custom" }).success).toBe(false);
  });
});

describe("routineStepInputSchema", () => {
  it("accepts every steppable tool id at a non-negative position", () => {
    expect(routineStepInputSchema.safeParse({ toolId: "mood", position: 0 }).success).toBe(true);
    expect(routineStepInputSchema.safeParse({ toolId: "habits", position: 8 }).success).toBe(true);
  });

  it("rejects a tool id outside the steppable set", () => {
    expect(routineStepInputSchema.safeParse({ toolId: "worry", position: 0 }).success).toBe(false);
  });

  it("rejects negative positions", () => {
    expect(routineStepInputSchema.safeParse({ toolId: "mood", position: -1 }).success).toBe(false);
  });

  it("rejects fractional positions", () => {
    expect(routineStepInputSchema.safeParse({ toolId: "mood", position: 1.5 }).success).toBe(false);
  });
});
