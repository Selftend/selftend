import { buildThoughtRecordSteps } from "./thought-record-steps";
import { thoughtRecordFormSchema, type ThoughtRecordFormSchema } from "./schemas";
import type { ThoughtRecordStepKey } from "./thought-record-form";

const fakeT = (key: string) => key;

describe("buildThoughtRecordSteps", () => {
  const steps = buildThoughtRecordSteps(fakeT);

  it("returns the 8 steps in order", () => {
    expect(steps.map((s) => s.key)).toEqual<ThoughtRecordStepKey[]>([
      "situation",
      "nats",
      "hotThought",
      "emotions",
      "evidence",
      "distortions",
      "balancedThought",
      "outcome",
    ]);
  });

  it("titles each step via the translator", () => {
    expect(steps[0].title).toBe("record.situation");
    expect(steps[7].title).toBe("record.outcome");
  });

  it("covers every editable schema field exactly once across step fields", () => {
    const covered = steps.flatMap((s) => s.fields);
    // `nats` is intentionally owned by two steps (nats + hotThought).
    const expectedFields: (keyof ThoughtRecordFormSchema)[] = [
      "situation",
      "nats",
      "nats",
      "emotions",
      "emotionIntensityBefore",
      "evidenceFor",
      "evidenceAgainst",
      "distortions",
      "balancedThought",
      "beliefAfter",
      "emotionIntensityAfter",
      "outcomeNotes",
    ];
    expect(covered).toEqual(expectedFields);
  });

  it("leaves no schema field without a step, derived from the schema itself", () => {
    // The list above is hand-written, so on its own it can only prove the steps
    // match what someone once typed. This derives the other direction: a field
    // added to the schema and forgotten here would never be validated by any
    // step, and on the last step handleSubmit would fail the whole form with an
    // error no step renders. `beliefAfter` (#1376) was the field that made this
    // worth pinning.
    const covered = new Set(steps.flatMap((s) => s.fields));
    for (const field of Object.keys(thoughtRecordFormSchema.shape)) {
      expect(covered).toContain(field);
    }
  });

  it("maps the nats field to both the nats and hotThought steps", () => {
    const natsSteps = steps.filter((s) => s.fields.includes("nats")).map((s) => s.key);
    expect(natsSteps).toEqual(["nats", "hotThought"]);
  });
});
