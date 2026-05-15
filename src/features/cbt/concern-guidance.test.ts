import { getConcernGuidance } from "@/src/features/cbt/concern-guidance";

describe("getConcernGuidance", () => {
  it("returns unique strategy suggestions in concern order", () => {
    expect(getConcernGuidance(["anxiety", "panic"])).toEqual([
      "worry",
      "exposure",
      "mindfulness",
      "thoughts",
    ]);
  });

  it("ignores unknown concern keys", () => {
    expect(getConcernGuidance(["unknown", "procrastination"])).toEqual([
      "tasks",
      "goals",
      "thoughts",
    ]);
  });
});
