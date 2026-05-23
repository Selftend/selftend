import { thoughtRecordFormSchema } from "@/src/features/cbt/schemas";

const baseNat = { text: "I will fail", beliefRating: 80, isHotThought: true };

describe("thought record schema", () => {
  it("accepts a record with one NAT as the hot thought", () => {
    expect(() =>
      thoughtRecordFormSchema.parse({
        situation: "I opened a difficult message from work this morning.",
        nats: [baseNat],
        emotions: ["Anxious", "Overwhelmed"],
        emotionIntensityBefore: null,
        distortions: ["fortune-telling"],
        evidenceFor: [],
        evidenceAgainst: [],
        balancedThought: "I do not know what the message means yet.",
        emotionIntensityAfter: null,
        outcomeNotes: "",
      }),
    ).not.toThrow();
  });

  it("accepts multiple NATs with only one marked as hot thought", () => {
    expect(() =>
      thoughtRecordFormSchema.parse({
        situation: "Job interview result.",
        nats: [
          { text: "I am completely useless", beliefRating: 95, isHotThought: true },
          { text: "This job should have been mine", beliefRating: 100, isHotThought: false },
          { text: "There is no point trying again", beliefRating: 75, isHotThought: false },
        ],
        emotions: ["Angry"],
        emotionIntensityBefore: 80,
        distortions: ["labeling"],
        evidenceFor: ["I did not get the job."],
        evidenceAgainst: ["I received positive feedback."],
        balancedThought: "I am disappointed but this is one situation.",
        emotionIntensityAfter: 40,
        outcomeNotes: "Feeling calmer after writing it out.",
      }),
    ).not.toThrow();
  });

  it("accepts an empty nats array for a partial in-progress record", () => {
    expect(() =>
      thoughtRecordFormSchema.parse({
        situation: "",
        nats: [],
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

  it("rejects a beliefRating above 100", () => {
    expect(() =>
      thoughtRecordFormSchema.parse({
        situation: "test",
        nats: [{ text: "over the limit", beliefRating: 101, isHotThought: true }],
        emotions: [],
        emotionIntensityBefore: null,
        distortions: [],
        evidenceFor: [],
        evidenceAgainst: [],
        balancedThought: "",
        emotionIntensityAfter: null,
        outcomeNotes: "",
      }),
    ).toThrow();
  });

  it("accepts a null beliefRating (user skipped rating)", () => {
    expect(() =>
      thoughtRecordFormSchema.parse({
        situation: "test",
        nats: [{ text: "some thought", beliefRating: null, isHotThought: true }],
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
