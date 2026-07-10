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

describe("validation messages are i18n keys", () => {
  // Resolved via t() in the "cbt" namespace at render time; the i18n
  // key-coverage test guarantees each key exists in en and bg.
  it("emits keys for the empty statement, missing coping statement, and missing steps", () => {
    const hypothetical = worryEntryFormSchema.safeParse({
      worryStatement: "",
      worryCategory: "hypothetical",
      probabilityEstimate: null,
      evidenceFor: [],
      evidenceAgainst: [],
      copingStatement: "",
      actionSteps: [],
    });
    expect(hypothetical.success).toBe(false);
    const hypotheticalMessages = hypothetical.error!.issues.map((issue) => issue.message);
    expect(hypotheticalMessages).toContain("worry.validation.worryStatement");
    expect(hypotheticalMessages).toContain("worry.validation.copingStatement");

    const real = worryEntryFormSchema.safeParse({
      worryStatement: "Deadline tight",
      worryCategory: "real_problem",
      probabilityEstimate: null,
      evidenceFor: [],
      evidenceAgainst: [],
      copingStatement: "",
      actionSteps: [],
    });
    expect(real.success).toBe(false);
    expect(real.error!.issues.map((issue) => issue.message)).toContain(
      "worry.validation.actionSteps",
    );
  });
});
