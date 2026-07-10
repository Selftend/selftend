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

  it("accepts an empty partial record (legacy records with blank fields stay saveable)", () => {
    // Behavior parity with the pre-i18n schema: the message-key refactor must not
    // introduce requiredness. Legacy rows with empty narrative fields must remain
    // editable and saveable exactly as before.
    const result = thoughtRecordFormSchema.safeParse({
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
    });
    expect(result.success).toBe(true);
  });

  it("sanitizes free text on parse (NBSP normalized, unpaired surrogates dropped)", () => {
    const result = thoughtRecordFormSchema.safeParse({
      situation: "pasted\u00A0text with a cut emoji \uD83D",
      nats: [{ text: "thought text", beliefRating: null, isHotThought: true }],
      emotions: ["Anxious"],
      emotionIntensityBefore: null,
      distortions: ["catastrophizing"],
      evidenceFor: ["evidence line"],
      evidenceAgainst: [],
      balancedThought: "balanced view",
      emotionIntensityAfter: null,
      outcomeNotes: "notes\uDC00 tail",
    });

    expect(result.success).toBe(true);
    expect(result.data!.situation).toBe("pasted text with a cut emoji");
    expect(result.data!.nats[0].text).toBe("thought text");
    expect(result.data!.evidenceFor).toEqual(["evidence line"]);
    expect(result.data!.balancedThought).toBe("balanced view");
    expect(result.data!.outcomeNotes).toBe("notes tail");
  });

  it("emits i18n keys for the length caps (resolved via t() in cbt/new.tsx)", () => {
    const result = thoughtRecordFormSchema.safeParse({
      situation: "x".repeat(4001),
      nats: [{ text: "y".repeat(2001), beliefRating: null, isHotThought: true }],
      emotions: [],
      emotionIntensityBefore: null,
      distortions: [],
      evidenceFor: ["z".repeat(2001)],
      evidenceAgainst: [],
      balancedThought: "b".repeat(4001),
      emotionIntensityAfter: null,
      outcomeNotes: "n".repeat(4001),
    });

    expect(result.success).toBe(false);
    const messages = result.error!.issues.map((issue) => issue.message);
    expect(messages).toContain("record.validation.situationTooLong");
    expect(messages).toContain("record.validation.natTooLong");
    expect(messages).toContain("record.validation.evidenceTooLong");
    expect(messages).toContain("record.validation.balancedThoughtTooLong");
    expect(messages).toContain("record.validation.outcomeNotesTooLong");
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
        emotions: ["Anxious"],
        emotionIntensityBefore: null,
        distortions: ["catastrophizing"],
        evidenceFor: [],
        evidenceAgainst: [],
        balancedThought: "A more balanced view.",
        emotionIntensityAfter: null,
        outcomeNotes: "",
      }),
    ).not.toThrow();
  });
});
