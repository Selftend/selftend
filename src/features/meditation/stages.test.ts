import { getStage, STAGES, suggestStageFromAssessment } from "@/src/features/meditation/stages";

describe("stages", () => {
  it("defines all ten stages in order with milestones at 3, 6, 7, and 10", () => {
    expect(STAGES).toHaveLength(10);
    expect(STAGES.map((s) => s.number)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
    expect(STAGES.find((s) => s.number === 3)?.milestoneAtEnd).toBe(1);
    expect(STAGES.find((s) => s.number === 6)?.milestoneAtEnd).toBe(2);
    expect(STAGES.find((s) => s.number === 7)?.milestoneAtEnd).toBe(3);
    expect(STAGES.find((s) => s.number === 10)?.milestoneAtEnd).toBe(4);
  });

  it("getStage clamps to a valid stage", () => {
    expect(getStage(1).number).toBe(1);
    expect(getStage(10).number).toBe(10);
    expect(getStage(0).number).toBe(1);
    expect(getStage(99).number).toBe(1);
  });
});

describe("suggestStageFromAssessment", () => {
  it("lands users without a daily habit at Stage 1", () => {
    const stage = suggestStageFromAssessment({
      hasDailyHabit: false,
      breathFocusLength: "continuously",
      fallsAsleep: false,
      catchesDistractionEarly: true,
      extendedNoThoughts: true,
    });
    expect(stage).toBe(1);
  });

  it("lands sleepy meditators at Stage 3 regardless of other answers", () => {
    const stage = suggestStageFromAssessment({
      hasDailyHabit: true,
      breathFocusLength: "continuously",
      fallsAsleep: true,
      catchesDistractionEarly: true,
      extendedNoThoughts: true,
    });
    expect(stage).toBe(3);
  });

  it("caps onboarding at Stage 4 even for strong self-reports", () => {
    const stage = suggestStageFromAssessment({
      hasDailyHabit: true,
      breathFocusLength: "continuously",
      fallsAsleep: false,
      catchesDistractionEarly: true,
      extendedNoThoughts: true,
    });
    expect(stage).toBe(4);
  });

  it("returns Stage 2 for a daily practitioner who drifts in seconds", () => {
    const stage = suggestStageFromAssessment({
      hasDailyHabit: true,
      breathFocusLength: "seconds",
      fallsAsleep: false,
      catchesDistractionEarly: false,
      extendedNoThoughts: false,
    });
    expect(stage).toBe(2);
  });

  it("returns Stage 3 when the user catches distractions early", () => {
    const stage = suggestStageFromAssessment({
      hasDailyHabit: true,
      breathFocusLength: "aboutAMinute",
      fallsAsleep: false,
      catchesDistractionEarly: true,
      extendedNoThoughts: false,
    });
    expect(stage).toBe(3);
  });
});
