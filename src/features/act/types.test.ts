import {
  ACT_CONCERNS,
  ACT_LIFE_DOMAINS,
  CONNECTION_TECHNIQUES,
  DEFUSION_TECHNIQUES,
  EXPANSION_TECHNIQUES,
  OBSERVING_TECHNIQUES,
  RECOMMENDED_PRINCIPLE,
  THOUGHT_CATEGORIES,
  type ACTConcern,
} from "@/src/features/act/types";

describe("act types - RECOMMENDED_PRINCIPLE", () => {
  it("covers every concern listed in ACT_CONCERNS", () => {
    for (const concern of ACT_CONCERNS) {
      expect(RECOMMENDED_PRINCIPLE[concern]).toBeDefined();
    }
  });

  it("recommends defusion as a safe fallback for 'other'", () => {
    const fallback: ACTConcern = "other";
    expect(RECOMMENDED_PRINCIPLE[fallback]).toBe("defusion");
  });
});

describe("act types - constant lists", () => {
  it("technique enums have no duplicates", () => {
    for (const list of [
      DEFUSION_TECHNIQUES,
      EXPANSION_TECHNIQUES,
      CONNECTION_TECHNIQUES,
      OBSERVING_TECHNIQUES,
      THOUGHT_CATEGORIES,
      ACT_LIFE_DOMAINS,
      ACT_CONCERNS,
    ]) {
      expect(new Set(list).size).toBe(list.length);
    }
  });

  it("ACT_LIFE_DOMAINS lists the four canonical Bull's-Eye domains", () => {
    expect([...ACT_LIFE_DOMAINS].sort()).toEqual(
      ["leisure", "personalGrowth", "relationships", "work"].sort(),
    );
  });
});
