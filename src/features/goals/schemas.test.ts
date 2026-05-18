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
});
