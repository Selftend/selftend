import { selectDisplayThought } from "./select-display-thought";
import type { NegativeAutomaticThought, ThoughtRecord } from "@/src/features/cbt/types";

function makeRecord(nats: NegativeAutomaticThought[], balancedThought = "balanced"): ThoughtRecord {
  return {
    id: "r1",
    userId: "u1",
    situation: "",
    nats,
    emotions: [],
    emotionIntensityBefore: null,
    distortions: [],
    evidenceFor: [],
    evidenceAgainst: [],
    balancedThought,
    emotionIntensityAfter: null,
    outcomeNotes: "",
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    archivedAt: null,
  };
}

function nat(text: string, isHotThought: boolean): NegativeAutomaticThought {
  return { text, beliefRating: null, isHotThought };
}

describe("selectDisplayThought", () => {
  it("returns the hot thought's text when one is flagged", () => {
    const record = makeRecord([nat("first", false), nat("the hot one", true)], "calm");
    expect(selectDisplayThought(record)).toEqual({
      natText: "the hot one",
      balancedThought: "calm",
    });
  });

  it("falls back to the first NAT when none is hot", () => {
    const record = makeRecord([nat("first", false), nat("second", false)]);
    expect(selectDisplayThought(record).natText).toBe("first");
  });

  it("returns an empty NAT text when there are no NATs", () => {
    const record = makeRecord([]);
    expect(selectDisplayThought(record).natText).toBe("");
  });

  it("prefers the first hot thought over a later one", () => {
    const record = makeRecord([nat("hot a", true), nat("hot b", true)]);
    expect(selectDisplayThought(record).natText).toBe("hot a");
  });
});
