import { activityFormSchema } from "@/src/features/activities/schemas";

describe("activityFormSchema", () => {
  const base = {
    activityName: "Walk",
    category: "pleasure" as const,
    paceCategory: null,
    scheduledAt: null,
    moodBefore: null,
    notes: "",
  };

  it("accepts a minimal valid activity", () => {
    expect(activityFormSchema.safeParse(base).success).toBe(true);
  });

  it("rejects an empty activity name", () => {
    expect(activityFormSchema.safeParse({ ...base, activityName: "" }).success).toBe(false);
  });

  it("rejects a single-character activity name", () => {
    expect(activityFormSchema.safeParse({ ...base, activityName: "a" }).success).toBe(false);
  });

  it("rejects an unknown category", () => {
    expect(
      activityFormSchema.safeParse({ ...base, category: "other" as unknown as "pleasure" }).success,
    ).toBe(false);
  });

  it("accepts mastery category", () => {
    expect(activityFormSchema.safeParse({ ...base, category: "mastery" }).success).toBe(true);
  });

  it("rejects moodBefore out of 1-5 range", () => {
    expect(activityFormSchema.safeParse({ ...base, moodBefore: 0 }).success).toBe(false);
    expect(activityFormSchema.safeParse({ ...base, moodBefore: 6 }).success).toBe(false);
  });

  it("accepts moodBefore in 1-5 range", () => {
    for (const m of [1, 2, 3, 4, 5]) {
      expect(activityFormSchema.safeParse({ ...base, moodBefore: m }).success).toBe(true);
    }
  });

  it("accepts a valid PACE category", () => {
    expect(activityFormSchema.safeParse({ ...base, paceCategory: "physical" }).success).toBe(true);
    expect(activityFormSchema.safeParse({ ...base, paceCategory: "achievement" }).success).toBe(
      true,
    );
    expect(activityFormSchema.safeParse({ ...base, paceCategory: "connection" }).success).toBe(
      true,
    );
    expect(activityFormSchema.safeParse({ ...base, paceCategory: "enjoyment" }).success).toBe(true);
  });

  it("accepts null paceCategory", () => {
    expect(activityFormSchema.safeParse({ ...base, paceCategory: null }).success).toBe(true);
  });

  it("rejects an invalid PACE category", () => {
    expect(activityFormSchema.safeParse({ ...base, paceCategory: "other" }).success).toBe(false);
  });
});
