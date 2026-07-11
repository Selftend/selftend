import {
  addCopingStep,
  removeCopingStep,
  updateCopingStep,
  type ChallengeDraft,
} from "@/src/features/recovery/challenge-draft";

const base: ChallengeDraft = {
  id: "challenge-1",
  challengeDescription: "Hard week",
  copingSteps: ["Call a friend", "Go for a walk"],
};

describe("updateCopingStep", () => {
  it("sets the step at the index without mutating the input", () => {
    const result = updateCopingStep(base, 1, "Journal");
    expect(result.copingSteps).toEqual(["Call a friend", "Journal"]);
    expect(base.copingSteps).toEqual(["Call a friend", "Go for a walk"]);
    expect(result).not.toBe(base);
  });
});

describe("addCopingStep", () => {
  it("appends a blank step", () => {
    expect(addCopingStep(base).copingSteps).toEqual(["Call a friend", "Go for a walk", ""]);
  });
});

describe("removeCopingStep", () => {
  it("removes the step at the index", () => {
    expect(removeCopingStep(base, 0).copingSteps).toEqual(["Go for a walk"]);
  });

  it("never drops below a single blank row", () => {
    const single: ChallengeDraft = { challengeDescription: "x", copingSteps: ["only"] };
    expect(removeCopingStep(single, 0).copingSteps).toEqual([""]);
  });

  it("preserves other draft fields", () => {
    expect(removeCopingStep(base, 0).id).toBe("challenge-1");
    expect(removeCopingStep(base, 0).challengeDescription).toBe("Hard week");
  });
});
