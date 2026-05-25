import {
  deriveActProgram,
  type DeriveActProgramInput,
} from "@/src/features/act/derive-act-program";

const START = "2026-05-01T00:00:00.000Z";

const emptyData = {
  choicePoints: [],
  valueEntries: [],
  connectionLogs: [],
  observingSessions: [],
  defusionLogs: [],
  expansionLogs: [],
  urgeSurfLogs: [],
  committedActions: [],
  actionSteps: [],
};

function input(overrides: Partial<DeriveActProgramInput> = {}): DeriveActProgramInput {
  return {
    startedAt: START,
    completedAt: null,
    selectedDate: "2026-05-09",
    phaseIndex: 0,
    phaseStartedAt: START,
    ...emptyData,
    ...overrides,
  };
}

describe("deriveActProgram", () => {
  it("reports not_started when there is no start timestamp", () => {
    const result = deriveActProgram(input({ startedAt: null }));
    expect(result.status).toBe("not_started");
  });

  it("reports in_progress when started", () => {
    expect(deriveActProgram(input()).status).toBe("in_progress");
  });

  it("reports graduated when completedAt is set", () => {
    const result = deriveActProgram(input({ completedAt: "2026-05-20T00:00:00Z" }));
    expect(result.status).toBe("graduated");
  });

  it("counts only data created at/after startedAt toward summaryStats", () => {
    const before = {
      id: "cp0",
      userId: "u",
      hooks: [],
      awayMoves: [],
      towardMoves: [],
      notes: "",
      createdAt: "2026-04-01T00:00:00Z",
      updatedAt: "2026-04-01T00:00:00Z",
    } as never;
    const after = {
      id: "cp1",
      userId: "u",
      hooks: [],
      awayMoves: [],
      towardMoves: [],
      notes: "",
      createdAt: "2026-05-02T00:00:00Z",
      updatedAt: "2026-05-02T00:00:00Z",
    } as never;
    const result = deriveActProgram(input({ choicePoints: [before, after] }));
    expect(result.summaryStats.choicePoints).toBe(1);
  });

  // ── Phase-based view ──────────────────────────────────────────────────────

  it("phaseReady is true when all milestones are satisfied since phaseStartedAt", () => {
    const PHASE_START = "2026-05-05T00:00:00.000Z";
    const result = deriveActProgram(
      input({
        phaseIndex: 0,
        phaseStartedAt: PHASE_START,
        choicePoints: [
          {
            id: "cp1",
            userId: "u",
            hooks: [],
            awayMoves: [],
            towardMoves: [],
            notes: "",
            createdAt: "2026-05-06T00:00:00Z",
            updatedAt: "2026-05-06T00:00:00Z",
          },
        ] as never,
      }),
    );
    expect(result.phaseReady).toBe(true);
    expect(result.phase).not.toBeNull();
    expect(result.phase!.milestones.every((m) => m.done)).toBe(true);
  });

  it("phaseReady is false when a milestone action is dated before phaseStartedAt", () => {
    const PHASE_START = "2026-05-05T00:00:00.000Z";
    const result = deriveActProgram(
      input({
        phaseIndex: 0,
        phaseStartedAt: PHASE_START,
        // choice point created BEFORE phase entry — must not count
        choicePoints: [
          {
            id: "cp0",
            userId: "u",
            hooks: [],
            awayMoves: [],
            towardMoves: [],
            notes: "",
            createdAt: "2026-05-03T00:00:00Z",
            updatedAt: "2026-05-03T00:00:00Z",
          },
        ] as never,
      }),
    );
    expect(result.phaseReady).toBe(false);
    const mapChoicePoint = result.phase!.milestones.find((m) => m.key === "mapChoicePoint")!;
    expect(mapChoicePoint.done).toBe(false);
  });

  it("dailyPractice is done only when an entity exists on selectedDate (foundation: dropAnchor)", () => {
    const selected = "2026-05-09";
    const done = deriveActProgram(
      input({
        phaseIndex: 0,
        selectedDate: selected,
        connectionLogs: [
          {
            id: "cl1",
            userId: "u",
            technique: "dropAnchor",
            activityContext: "",
            noticesFromSenses: "",
            durationMinutes: null,
            moodAfter: null,
            notes: "",
            createdAt: `${selected}T10:00:00Z`,
            updatedAt: `${selected}T10:00:00Z`,
          },
        ] as never,
      }),
    );
    expect(done.phase!.dailyPractice!.done).toBe(true);

    const notDone = deriveActProgram(
      input({
        phaseIndex: 0,
        selectedDate: selected,
        connectionLogs: [
          {
            id: "cl2",
            userId: "u",
            technique: "dropAnchor",
            activityContext: "",
            noticesFromSenses: "",
            durationMinutes: null,
            moodAfter: null,
            notes: "",
            createdAt: "2026-05-08T10:00:00Z",
            updatedAt: "2026-05-08T10:00:00Z",
          },
        ] as never,
      }),
    );
    expect(notDone.phase!.dailyPractice!.done).toBe(false);
  });

  it("isLastPhase is true at phaseIndex 3 (doWhatMatters)", () => {
    const result = deriveActProgram(input({ phaseIndex: 3 }));
    expect(result.isLastPhase).toBe(true);
    expect(result.phaseIndex).toBe(3);
    expect(result.phase!.key).toBe("doWhatMatters");
  });

  it("clamps phaseIndex within [0, 3]", () => {
    const low = deriveActProgram(input({ phaseIndex: -5 }));
    expect(low.phaseIndex).toBe(0);
    const high = deriveActProgram(input({ phaseIndex: 99 }));
    expect(high.phaseIndex).toBe(3);
  });

  it("phase is null when status is not_started", () => {
    const result = deriveActProgram(input({ startedAt: null }));
    expect(result.status).toBe("not_started");
    expect(result.phase).toBeNull();
    expect(result.phaseReady).toBe(false);
    expect(result.totalPhases).toBe(4);
  });

  it("phase is null when graduated (completedAt set)", () => {
    const result = deriveActProgram(input({ completedAt: "2026-05-20T00:00:00Z" }));
    expect(result.status).toBe("graduated");
    expect(result.phase).toBeNull();
  });
});
