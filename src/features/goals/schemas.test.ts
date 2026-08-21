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

  // The value anchor can NEVER gate goal creation (#1289). The shipped programme's
  // first week asks for goals *before* values clarification, so on the intended path
  // the first goal is written with no priority values in existence at all.
  it("accepts a goal with no value key at all", () => {
    expect("valueKey" in base).toBe(false); // guards the assertion below from rotting
    expect(goalFormSchema.safeParse(base).success).toBe(true);
  });

  // These assert the PARSED OUTPUT, not just `.success`. A zod object strips unknown
  // keys, so `safeParse({ ...base, valueKey }).success` is true whether or not the
  // schema has the field at all - it would pass vacuously.
  it("accepts a goal explicitly anchored to nothing", () => {
    const result = goalFormSchema.safeParse({ ...base, valueKey: null });
    expect(result.success && result.data.valueKey).toBeNull();
  });

  it("keeps the value key of a goal anchored to a value", () => {
    const result = goalFormSchema.safeParse({ ...base, valueKey: "honest" });
    expect(result.success && result.data.valueKey).toBe("honest");
  });

  // No minimum-length rule: the picker only ever emits a key from the user's own
  // priority list, so a length floor would buy nothing and could reject a future key.
  it("does not impose a minimum length on the value key", () => {
    const result = goalFormSchema.safeParse({ ...base, valueKey: "a" });
    expect(result.success && result.data.valueKey).toBe("a");
  });
});
