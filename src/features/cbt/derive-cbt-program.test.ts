import { deriveCbtProgram, type DeriveProgramInput } from "@/src/features/cbt/derive-cbt-program";

const START = "2026-05-01T00:00:00.000Z";

const emptyData = {
  goals: [],
  valuesProfile: null,
  thoughtRecords: [],
  beliefs: [],
  activities: [],
  exposures: [],
  mindfulnessSessions: [],
  selfCareLogs: [],
  moodLogs: [],
  recoveryPlan: null,
};

function input(overrides: Partial<DeriveProgramInput> = {}): DeriveProgramInput {
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

describe("deriveCbtProgram", () => {
  it("reports not_started when there is no start timestamp", () => {
    const result = deriveCbtProgram(input({ startedAt: null }));
    expect(result.status).toBe("not_started");
  });

  it("reports in_progress when started", () => {
    expect(deriveCbtProgram(input()).status).toBe("in_progress");
  });

  it("counts only data created at/after startedAt toward summaryStats", () => {
    const before = { id: "g0", createdAt: "2026-04-01T00:00:00Z" } as never;
    const after = { id: "g1", createdAt: "2026-05-02T00:00:00Z" } as never;
    const result = deriveCbtProgram(input({ goals: [before, after] }));
    expect(result.summaryStats.goalsSet).toBe(1);
  });

  it("surfaces summary stats since startedAt", () => {
    const fourDays = ["2026-05-02", "2026-05-03", "2026-05-04", "2026-05-05"];
    const full = deriveCbtProgram(
      input({
        goals: [{ id: "g", createdAt: "2026-05-02T00:00:00Z" }] as never,
        valuesProfile: {
          id: "v",
          userId: "user-1",
          personalValues: [{ key: "honest", tier: 1 as const }],
          priorityValues: ["honest"],
          updatedAt: "2026-05-02T00:00:00Z",
        },
        // Noticing-grade check-ins on 4 distinct days (situation filled).
        moodLogs: fourDays.map((d, i) => ({
          id: `m${i}`,
          loggedAt: `${d}T08:00:00Z`,
          situation: "x",
          thoughts: "",
          behaviours: "",
          bodilySensations: "",
        })) as never,
        // Thought records on 3 distinct days.
        thoughtRecords: [
          { id: "t1", createdAt: "2026-05-02T08:00:00Z", distortions: ["x"] },
          { id: "t2", createdAt: "2026-05-03T08:00:00Z", distortions: [] },
          { id: "t3", createdAt: "2026-05-04T08:00:00Z", distortions: [] },
        ] as never,
        beliefs: [{ id: "b", createdAt: "2026-05-02T00:00:00Z" }] as never,
        activities: fourDays.map((d, i) => ({
          id: `a${i}`,
          createdAt: `${d}T00:00:00Z`,
          completedAt: `${d}T18:00:00Z`,
        })) as never,
        exposures: [{ id: "e", createdAt: "2026-05-02T00:00:00Z" }] as never,
        mindfulnessSessions: fourDays.map((d, i) => ({
          id: `s${i}`,
          completedAt: `${d}T19:00:00Z`,
        })) as never,
        recoveryPlan: { updatedAt: "2026-05-02T00:00:00Z", personalSlogan: "Onward" } as never,
      }),
    );
    expect(full.summaryStats.thoughtRecords).toBe(3);
    expect(full.summaryStats.activitiesCompleted).toBe(4);
  });

  it("stays graduated once completedAt is set, even if data is later removed", () => {
    const result = deriveCbtProgram(input({ completedAt: "2026-05-20T00:00:00Z" }));
    expect(result.status).toBe("graduated");
  });

  // ── Phase-based view (Task 3) ──────────────────────────────────────────────

  it("phaseReady is true when all milestones are satisfied since phaseStartedAt", () => {
    const PHASE_START = "2026-05-05T00:00:00.000Z";
    const result = deriveCbtProgram(
      input({
        phaseIndex: 0,
        phaseStartedAt: PHASE_START,
        // SET_GOALS: goal created after phase entry
        goals: [{ id: "g1", createdAt: "2026-05-06T00:00:00Z" }] as never,
        // CLARIFY_VALUES: values profile updated after phase entry
        valuesProfile: {
          id: "v1",
          userId: "user-1",
          personalValues: [{ key: "honest", tier: 1 as const }],
          priorityValues: ["honest"],
          updatedAt: "2026-05-06T00:00:00Z",
        },
      }),
    );
    expect(result.phaseReady).toBe(true);
    expect(result.phase).not.toBeNull();
    expect(result.phase!.milestones.every((m) => m.done)).toBe(true);
  });

  it("phaseReady is false when a milestone action is dated before phaseStartedAt", () => {
    const PHASE_START = "2026-05-05T00:00:00.000Z";
    const result = deriveCbtProgram(
      input({
        phaseIndex: 0,
        phaseStartedAt: PHASE_START,
        // Goal created BEFORE phase entry - must not count toward the phase milestone
        goals: [{ id: "g0", createdAt: "2026-05-03T00:00:00Z" }] as never,
        valuesProfile: {
          id: "v1",
          userId: "user-1",
          personalValues: [{ key: "honest", tier: 1 as const }],
          priorityValues: ["honest"],
          updatedAt: "2026-05-06T00:00:00Z",
        },
      }),
    );
    expect(result.phaseReady).toBe(false);
    const setGoals = result.phase!.milestones.find((m) => m.key === "setGoals")!;
    expect(setGoals.done).toBe(false);
  });

  it("dailyPractice is done only when an entity exists on selectedDate", () => {
    // Assessment phase: dailyPractice = DAILY_NOTICING (mood log on selectedDate)
    const selected = "2026-05-09";
    const done = deriveCbtProgram(
      input({
        phaseIndex: 0,
        selectedDate: selected,
        moodLogs: [
          {
            id: "m1",
            loggedAt: `${selected}T10:00:00Z`,
            situation: "Work stress",
            thoughts: "",
            behaviours: "",
            bodilySensations: "",
          },
        ] as never,
      }),
    );
    expect(done.phase!.dailyPractice!.done).toBe(true);

    const notDone = deriveCbtProgram(
      input({
        phaseIndex: 0,
        selectedDate: selected,
        // Mood log on a different day - should not count
        moodLogs: [
          {
            id: "m2",
            loggedAt: "2026-05-08T10:00:00Z",
            situation: "Work stress",
            thoughts: "",
            behaviours: "",
            bodilySensations: "",
          },
        ] as never,
      }),
    );
    expect(notDone.phase!.dailyPractice!.done).toBe(false);
  });

  it("isLastPhase is true at phaseIndex 4 (resilience)", () => {
    const result = deriveCbtProgram(input({ phaseIndex: 4 }));
    expect(result.isLastPhase).toBe(true);
    expect(result.phaseIndex).toBe(4);
    expect(result.phase!.key).toBe("resilience");
  });

  it("clamps phaseIndex within [0, totalPhases-1]", () => {
    const low = deriveCbtProgram(input({ phaseIndex: -5 }));
    expect(low.phaseIndex).toBe(0);
    const high = deriveCbtProgram(input({ phaseIndex: 99 }));
    expect(high.phaseIndex).toBe(4);
  });

  it("phase is null when status is not_started", () => {
    const result = deriveCbtProgram(input({ startedAt: null }));
    expect(result.status).toBe("not_started");
    expect(result.phase).toBeNull();
    expect(result.phaseReady).toBe(false);
    expect(result.totalPhases).toBe(5);
  });

  it("phase is null when graduated (completedAt set)", () => {
    const result = deriveCbtProgram(input({ completedAt: "2026-05-20T00:00:00Z" }));
    expect(result.status).toBe("graduated");
    expect(result.phase).toBeNull();
  });
});
