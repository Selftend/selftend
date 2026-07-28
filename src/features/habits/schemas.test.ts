import {
  HABIT_COLORS,
  HABIT_CUE_MAX,
  HABIT_NAME_MAX,
  HABIT_NOTE_MAX,
  habitInputSchema,
  habitLogNoteSchema,
  toHabitColor,
} from "@/src/features/habits/schemas";

const baseInput = {
  name: "Read",
  kind: "build" as const,
  identity: "I'm a reader",
  cuePlan: "I will read at 8pm on the couch.",
  stackAfter: "After dinner",
  cravingPairing: "Only podcast while folding laundry",
  twoMinuteVersion: "Read one page",
  rewardNote: "Tick the box",
  cadence: "daily" as const,
  customDays: [],
  color: "primary" as const,
};

describe("habitInputSchema", () => {
  it("accepts a fully filled build habit", () => {
    expect(habitInputSchema.safeParse(baseInput).success).toBe(true);
  });

  it("rejects a blank name", () => {
    const result = habitInputSchema.safeParse({ ...baseInput, name: "   " });
    expect(result.success).toBe(false);
  });

  it("rejects names over the limit", () => {
    const result = habitInputSchema.safeParse({
      ...baseInput,
      name: "x".repeat(HABIT_NAME_MAX + 1),
    });
    expect(result.success).toBe(false);
  });

  it("rejects a cue plan that exceeds its limit", () => {
    const result = habitInputSchema.safeParse({
      ...baseInput,
      cuePlan: "x".repeat(HABIT_CUE_MAX + 1),
    });
    expect(result.success).toBe(false);
  });

  it("accepts custom cadence with valid day indices", () => {
    const result = habitInputSchema.safeParse({
      ...baseInput,
      cadence: "custom",
      customDays: [1, 3, 5],
    });
    expect(result.success).toBe(true);
  });

  it("rejects out-of-range custom days", () => {
    const result = habitInputSchema.safeParse({
      ...baseInput,
      cadence: "custom",
      customDays: [7],
    });
    expect(result.success).toBe(false);
  });

  it("rejects unknown colors", () => {
    const result = habitInputSchema.safeParse({
      ...baseInput,
      color: "neon-pink" as unknown as typeof baseInput.color,
    });
    expect(result.success).toBe(false);
  });
});

describe("habitLogNoteSchema", () => {
  it("accepts an empty note", () => {
    expect(habitLogNoteSchema.safeParse({ note: "" }).success).toBe(true);
  });

  it("rejects notes longer than the limit", () => {
    expect(habitLogNoteSchema.safeParse({ note: "x".repeat(HABIT_NOTE_MAX + 1) }).success).toBe(
      false,
    );
  });
});

describe("toHabitColor", () => {
  it("passes through every known alias", () => {
    for (const color of HABIT_COLORS) {
      expect(toHabitColor(color)).toBe(color);
    }
  });

  // The column is only a 1-32 char string in 20260532_habits.sql, and mapHabit
  // casts rows without validation. Since #278 an unknown alias would read as
  // `undefined` out of the chip palette and crash on the first `chip.fill`.
  it("falls back to primary for a color the palette does not know", () => {
    expect(toHabitColor("neon-pink")).toBe("primary");
    expect(toHabitColor("")).toBe("primary");
    expect(toHabitColor(null)).toBe("primary");
    expect(toHabitColor(undefined)).toBe("primary");
    expect(toHabitColor(42)).toBe("primary");
  });
});
