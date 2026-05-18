import { worryEntryFormSchema } from "@/src/features/worry/schemas";

describe("worryEntryFormSchema", () => {
  const hypotheticalBase = {
    worryStatement: "What if it rains",
    worryCategory: "hypothetical" as const,
    probabilityEstimate: 40,
    evidenceFor: [],
    evidenceAgainst: [],
    copingStatement: "I have an umbrella",
    actionSteps: [],
  };

  const realBase = {
    worryStatement: "Deadline tight",
    worryCategory: "real_problem" as const,
    probabilityEstimate: null,
    evidenceFor: [],
    evidenceAgainst: [],
    copingStatement: "",
    actionSteps: ["ping team"],
  };

  it("accepts a hypothetical worry with a coping statement", () => {
    expect(worryEntryFormSchema.safeParse(hypotheticalBase).success).toBe(true);
  });

  it("rejects a hypothetical worry without a coping statement", () => {
    const result = worryEntryFormSchema.safeParse({
      ...hypotheticalBase,
      copingStatement: "  ",
    });
    expect(result.success).toBe(false);
  });

  it("accepts a real_problem worry with at least one action step", () => {
    expect(worryEntryFormSchema.safeParse(realBase).success).toBe(true);
  });

  it("rejects a real_problem worry with no action steps", () => {
    const result = worryEntryFormSchema.safeParse({ ...realBase, actionSteps: [] });
    expect(result.success).toBe(false);
  });

  it("rejects an unknown worry category", () => {
    expect(
      worryEntryFormSchema.safeParse({
        ...hypotheticalBase,
        worryCategory: "other" as unknown as "hypothetical",
      }).success,
    ).toBe(false);
  });

  it("rejects probability outside 0-100", () => {
    expect(
      worryEntryFormSchema.safeParse({ ...hypotheticalBase, probabilityEstimate: -1 }).success,
    ).toBe(false);
    expect(
      worryEntryFormSchema.safeParse({ ...hypotheticalBase, probabilityEstimate: 101 }).success,
    ).toBe(false);
  });

  it("rejects empty entries inside evidence arrays", () => {
    expect(worryEntryFormSchema.safeParse({ ...hypotheticalBase, evidenceFor: [""] }).success).toBe(
      false,
    );
  });
});
