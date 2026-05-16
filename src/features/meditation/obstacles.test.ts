import { obstacleTagsForStage } from "@/src/features/meditation/obstacles";

describe("obstacleTagsForStage", () => {
  it("returns Stage 1 obstacles around showing up", () => {
    const tags = obstacleTagsForStage(1);
    expect(tags).toContain("resistance");
    expect(tags).toContain("procrastination");
    expect(tags).not.toContain("subtleDullness");
  });

  it("returns Stage 4 obstacles around gross distraction and pain", () => {
    const tags = obstacleTagsForStage(4);
    expect(tags).toContain("grossDistraction");
    expect(tags).toContain("pain");
    expect(tags).toContain("chargedMemories");
  });

  it("returns subtle-only obstacles at Stage 6", () => {
    const tags = obstacleTagsForStage(6);
    expect(tags).toContain("subtleDistraction");
    expect(tags).toContain("subtleDullness");
    expect(tags).not.toContain("grossDistraction");
  });

  it("returns an empty list for Stage 10", () => {
    expect(obstacleTagsForStage(10)).toEqual([]);
  });
});
