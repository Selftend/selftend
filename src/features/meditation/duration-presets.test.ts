import { durationPresetsForStage } from "@/src/features/meditation/duration-presets";

describe("durationPresetsForStage", () => {
  it("returns the base presets for stages 1 through 7", () => {
    expect(durationPresetsForStage(1)).toEqual([10, 15, 20, 30]);
    expect(durationPresetsForStage(7)).toEqual([10, 15, 20, 30]);
  });

  it("adds the longer presets at Stage 8 and beyond", () => {
    expect(durationPresetsForStage(8)).toEqual([10, 15, 20, 30, 45, 60, 90]);
    expect(durationPresetsForStage(10)).toEqual([10, 15, 20, 30, 45, 60, 90]);
  });
});
