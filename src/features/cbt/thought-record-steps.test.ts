import {
  filledThoughtRecordParts,
  THOUGHT_RECORD_PART_FIELDS,
  THOUGHT_RECORD_PARTS,
  type ThoughtRecordPart,
} from "./thought-record-steps";
import { thoughtRecordFormSchema, type ThoughtRecordFormSchema } from "./schemas";
import { defaultValues } from "./thought-record-form";

describe("THOUGHT_RECORD_PARTS", () => {
  it("names the six parts in column order, patterns before evidence", () => {
    expect(THOUGHT_RECORD_PARTS).toEqual<ThoughtRecordPart[]>([
      "situation",
      "thoughts",
      "feelings",
      "patterns",
      "evidence",
      "balanced",
    ]);
  });

  it("leaves no schema field outside a part, derived from the schema itself", () => {
    // A field added to the schema and forgotten in the part map could be
    // filled without the rail ever counting it. This derives the check from
    // the schema so the map cannot silently fall behind.
    const covered = new Set(Object.values(THOUGHT_RECORD_PART_FIELDS).flat());
    for (const field of Object.keys(thoughtRecordFormSchema.shape)) {
      expect(covered).toContain(field);
    }
  });

  it("assigns every mapped field to exactly one part", () => {
    const all = Object.values(THOUGHT_RECORD_PART_FIELDS).flat();
    expect(new Set(all).size).toBe(all.length);
  });
});

describe("filledThoughtRecordParts", () => {
  const nat = { text: "I will fail", beliefRating: 70, isHotThought: false };

  function filled(overrides: Partial<ThoughtRecordFormSchema>) {
    return filledThoughtRecordParts({ ...defaultValues, ...overrides });
  }

  it("lights nothing on a fresh form", () => {
    expect(Object.values(filled({}))).toEqual([false, false, false, false, false, false]);
  });

  it("☠️ counts the LAST part alone as one part, not as a finished prefix", () => {
    expect(filled({ outcomeNotes: "calmer now" })).toEqual({
      situation: false,
      thoughts: false,
      feelings: false,
      patterns: false,
      evidence: false,
      balanced: true,
    });
  });

  it("counts each part only for its own fields", () => {
    expect(filled({ situation: "A tense meeting" }).situation).toBe(true);
    expect(filled({ nats: [nat] }).thoughts).toBe(true);
    expect(filled({ emotions: ["Anxious"] }).feelings).toBe(true);
    expect(filled({ emotionIntensityBefore: 60 }).feelings).toBe(true);
    expect(filled({ distortions: ["catastrophizing"] }).patterns).toBe(true);
    expect(filled({ evidenceFor: ["a fact"] }).evidence).toBe(true);
    expect(filled({ evidenceAgainst: ["another fact"] }).evidence).toBe(true);
    expect(filled({ balancedThought: "It may be routine" }).balanced).toBe(true);
    expect(filled({ beliefAfter: 30 }).balanced).toBe(true);
    expect(filled({ emotionIntensityAfter: 20 }).balanced).toBe(true);
  });

  it("does not count whitespace as an answer", () => {
    const values = filled({
      situation: "   ",
      // The evidence textareas split "" to [""] - a blank LINE is not a fact.
      evidenceFor: [""],
      evidenceAgainst: ["   "],
      balancedThought: " ",
      outcomeNotes: "\n",
      nats: [{ text: "   ", beliefRating: null, isHotThought: false }],
    });
    expect(Object.values(values)).toEqual([false, false, false, false, false, false]);
  });

  it("treats an absent beliefAfter like null, so old drafts do not light the last part", () => {
    expect(filled({ beliefAfter: undefined }).balanced).toBe(false);
  });
});
