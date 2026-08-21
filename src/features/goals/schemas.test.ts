import { goalFormSchema, milestoneSchema } from "@/src/features/goals/schemas";

describe("milestoneSchema", () => {
  it("accepts a valid milestone", () => {
    expect(milestoneSchema.safeParse({ description: "Run 1k", targetDate: null }).success).toBe(
      true,
    );
  });

  it("rejects a short description", () => {
    expect(milestoneSchema.safeParse({ description: "ab", targetDate: null }).success).toBe(false);
  });
});

describe("goalFormSchema", () => {
  const base = {
    lifeDomain: "health",
    goalType: "outcome",
    title: "Run 5k",
    description: "",
    targetDate: null,
    milestones: [{ description: "Run 1k", targetDate: null }],
  };

  it("accepts a valid goal", () => {
    expect(goalFormSchema.safeParse(base).success).toBe(true);
  });

  it("rejects empty life domain", () => {
    expect(goalFormSchema.safeParse({ ...base, lifeDomain: "" }).success).toBe(false);
  });

  it("rejects empty goal type", () => {
    expect(goalFormSchema.safeParse({ ...base, goalType: "" }).success).toBe(false);
  });

  it("rejects a short title", () => {
    expect(goalFormSchema.safeParse({ ...base, title: "ab" }).success).toBe(false);
  });

  it("rejects an empty milestones array", () => {
    expect(goalFormSchema.safeParse({ ...base, milestones: [] }).success).toBe(false);
  });

  describe("targetDate", () => {
    it("accepts a real day key", () => {
      expect(goalFormSchema.safeParse({ ...base, targetDate: "2026-09-01" }).success).toBe(true);
    });

    it("accepts null, because the target date is optional", () => {
      expect(goalFormSchema.safeParse({ ...base, targetDate: null }).success).toBe(true);
    });

    it("rejects free text, which the column would reject with a generic save error", () => {
      expect(goalFormSchema.safeParse({ ...base, targetDate: "next Tuesday" }).success).toBe(false);
    });

    it("rejects a well-shaped impossible day", () => {
      // The regex alone passes this: `new Date("2026-02-31T12:00:00")` rolls
      // forward to 3 March rather than failing, so what rejects it is the day-key
      // validator's round-trip.
      expect(goalFormSchema.safeParse({ ...base, targetDate: "2026-02-31" }).success).toBe(false);
    });

    it("rejects the empty string, which is not the same as no date", () => {
      expect(goalFormSchema.safeParse({ ...base, targetDate: "" }).success).toBe(false);
    });

    it("names the error with a translation key, so it reads in the in-app language", () => {
      const result = goalFormSchema.safeParse({ ...base, targetDate: "nope" });
      expect(result.success).toBe(false);
      if (result.success) return;
      expect(result.error.issues[0].message).toBe("goals.validation.targetDate");
    });
  });
});
