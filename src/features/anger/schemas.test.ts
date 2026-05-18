import { angerLogFormSchema } from "@/src/features/anger/schemas";

describe("angerLogFormSchema", () => {
  const base = {
    triggerText: "Cut me off",
    interpretation: "",
    arousalLevel: 5,
    urge: "",
    behaviorChosen: "",
    consequence: "",
    timeOutTaken: false,
    alternativeInterpretation: "",
    outcomeRating: null,
    notes: "",
  };

  it("accepts a minimal valid log", () => {
    expect(angerLogFormSchema.safeParse(base).success).toBe(true);
  });

  it("rejects a trigger shorter than 3 chars", () => {
    expect(angerLogFormSchema.safeParse({ ...base, triggerText: "ab" }).success).toBe(false);
  });

  it("rejects an arousal level outside 1-10", () => {
    expect(angerLogFormSchema.safeParse({ ...base, arousalLevel: 0 }).success).toBe(false);
    expect(angerLogFormSchema.safeParse({ ...base, arousalLevel: 11 }).success).toBe(false);
  });

  it("rejects an outcome rating outside 1-10", () => {
    expect(angerLogFormSchema.safeParse({ ...base, outcomeRating: 0 }).success).toBe(false);
    expect(angerLogFormSchema.safeParse({ ...base, outcomeRating: 11 }).success).toBe(false);
  });

  it("accepts a null outcome rating", () => {
    expect(angerLogFormSchema.safeParse({ ...base, outcomeRating: null }).success).toBe(true);
  });
});
