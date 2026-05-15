import { thoughtRecordFormSchema } from "@/src/features/cbt/schemas";

describe("thought record schema", () => {
  it("accepts a balanced thought record payload", () => {
    expect(() =>
      thoughtRecordFormSchema.parse({
        situation: "I opened a difficult message from work this morning.",
        automaticThought: "I am definitely about to be blamed.",
        emotions: ["Anxious", "Overwhelmed"],
        emotionIntensityBefore: null,
        distortions: ["fortune-telling"],
        evidenceFor: [],
        evidenceAgainst: [],
        balancedThought: "I do not know what the message means yet, and I can read it slowly.",
        emotionIntensityAfter: null,
        outcomeNotes: "",
      }),
    ).not.toThrow();
  });

  it("accepts optional evidence and intensity fields", () => {
    expect(() =>
      thoughtRecordFormSchema.parse({
        situation: "I opened a difficult message from work this morning.",
        automaticThought: "I am definitely about to be blamed.",
        emotions: ["Anxious"],
        emotionIntensityBefore: 80,
        distortions: ["fortune-telling"],
        evidenceFor: ["The message says we need to talk."],
        evidenceAgainst: ["This has been a routine check-in before."],
        balancedThought: "I can read the message before deciding what it means.",
        emotionIntensityAfter: 50,
        outcomeNotes: "The worry still exists, but it feels less certain.",
      }),
    ).not.toThrow();
  });

  it("allows a blank partial record so it can be completed later", () => {
    expect(() =>
      thoughtRecordFormSchema.parse({
        situation: "",
        automaticThought: "",
        emotions: [],
        emotionIntensityBefore: null,
        distortions: [],
        evidenceFor: [],
        evidenceAgainst: [],
        balancedThought: "",
        emotionIntensityAfter: null,
        outcomeNotes: "",
      }),
    ).not.toThrow();
  });
});
