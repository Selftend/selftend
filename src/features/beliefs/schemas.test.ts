import { coreBeliefFormSchema } from "@/src/features/beliefs/schemas";

describe("coreBeliefFormSchema", () => {
  const base = {
    beliefStatement: "I am not enough",
    triggeringSituations: [],
    evidenceFor: [],
    evidenceAgainst: [],
    alternativeBelief: "I am learning",
    originalBeliefStrength: 80,
    alternativeBeliefStrength: 30,
    reinforcementPlan: "",
    nextReviewDate: null,
  };

  it("accepts a minimal valid belief", () => {
    expect(coreBeliefFormSchema.safeParse(base).success).toBe(true);
  });

  it("rejects a belief statement shorter than 3 chars", () => {
    expect(coreBeliefFormSchema.safeParse({ ...base, beliefStatement: "ab" }).success).toBe(false);
  });

  it("rejects an alternative belief shorter than 3 chars", () => {
    expect(coreBeliefFormSchema.safeParse({ ...base, alternativeBelief: "ab" }).success).toBe(
      false,
    );
  });

  it("rejects strengths outside 0-100", () => {
    expect(coreBeliefFormSchema.safeParse({ ...base, originalBeliefStrength: -1 }).success).toBe(
      false,
    );
    expect(
      coreBeliefFormSchema.safeParse({ ...base, alternativeBeliefStrength: 101 }).success,
    ).toBe(false);
  });

  it("rejects empty strings inside array fields", () => {
    expect(coreBeliefFormSchema.safeParse({ ...base, triggeringSituations: [""] }).success).toBe(
      false,
    );
  });
});
