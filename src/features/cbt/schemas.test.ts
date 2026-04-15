import { thoughtRecordFormSchema } from "@/src/features/cbt/schemas";

describe("thought record schema", () => {
  it("accepts a balanced thought record payload", () => {
    expect(() =>
      thoughtRecordFormSchema.parse({
        situation: "I opened a difficult message from work this morning.",
        automaticThought: "I am definitely about to be blamed.",
        emotions: ["Anxious", "Overwhelmed"],
        distortions: ["fortune-telling"],
        balancedThought: "I do not know what the message means yet, and I can read it slowly.",
      }),
    ).not.toThrow();
  });

  it("requires at least one emotion", () => {
    expect(() =>
      thoughtRecordFormSchema.parse({
        situation: "I opened a difficult message from work this morning.",
        automaticThought: "I am definitely about to be blamed.",
        emotions: [],
        distortions: ["fortune-telling"],
        balancedThought: "I do not know what the message means yet, and I can read it slowly.",
      }),
    ).toThrow("Choose at least one emotion.");
  });
});
