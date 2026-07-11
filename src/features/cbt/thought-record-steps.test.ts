import { buildThoughtRecordSteps } from "./thought-record-steps";
import type { ThoughtRecordFormSchema } from "./schemas";
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
      "emotionIntensityAfter",
      "outcomeNotes",
    ];
    expect(covered).toEqual(expectedFields);
  });

  it("maps the nats field to both the nats and hotThought steps", () => {
    const natsSteps = steps.filter((s) => s.fields.includes("nats")).map((s) => s.key);
    expect(natsSteps).toEqual(["nats", "hotThought"]);
  });
});
