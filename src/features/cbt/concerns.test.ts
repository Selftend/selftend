import { distortionDefinitions } from "@/src/constants/distortions";
import {
  CBT_CONCERNS,
  CONCERN_DISTORTIONS,
  CONCERN_RECOMMENDED_STRATEGIES,
  distortionsForConcerns,
  isCbtConcern,
  recommendedStrategiesFor,
} from "@/src/features/cbt/concerns";
import { isStrategyKey, strategyKeys } from "@/src/features/cbt/strategies";

describe("cbt concerns engine", () => {
  it("recommends only valid strategy keys for every concern", () => {
    for (const concern of CBT_CONCERNS) {
      for (const key of CONCERN_RECOMMENDED_STRATEGIES[concern]) {
        expect(isStrategyKey(key)).toBe(true);
      }
    }
  });

  it("maps only real distortion keys for every concern", () => {
    const valid = new Set(distortionDefinitions.map((d) => d.key));
    for (const concern of CBT_CONCERNS) {
      for (const key of CONCERN_DISTORTIONS[concern]) {
        expect(valid.has(key)).toBe(true);
      }
    }
  });

  it("dedupes recommendations and preserves canonical strategy order", () => {
    const result = recommendedStrategiesFor(["depression", "anger"]);
    // depression -> thoughts,activities,beliefs ; anger -> anger,thoughts
    expect(result).toEqual(strategyKeys.filter((k) => result.includes(k)));
    expect(new Set(result).size).toBe(result.length);
    expect(result).toContain("thoughts");
    expect(result).toContain("activities");
    expect(result).toContain("anger");
  });

  it("dedupes distortions across concerns", () => {
    const result = distortionsForConcerns(["panic", "gad"]);
    expect(new Set(result).size).toBe(result.length);
    expect(result).toContain("catastrophizing");
  });

  it("validates concern keys", () => {
    expect(isCbtConcern("depression")).toBe(true);
    expect(isCbtConcern("nonsense")).toBe(false);
  });
});
