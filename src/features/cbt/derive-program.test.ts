import { deriveCbtProgram, type DeriveProgramInput } from "@/src/features/cbt/derive-program";

const START = "2026-05-01T00:00:00.000Z";
const NOW = new Date("2026-05-09T00:00:00.000Z").getTime(); // day 8 -> week 2

const emptyData = {
  goals: [],
  values: [],
  thoughtRecords: [],
  beliefs: [],
  activities: [],
  exposures: [],
  tasks: [],
  mindfulnessSessions: [],
  selfCareLogs: [],
  moodLogs: [],
  recoveryPlan: null,
};

function input(overrides: Partial<DeriveProgramInput> = {}): DeriveProgramInput {
  return {
    startedAt: START,
    completedAt: null,
    now: NOW,
    ...emptyData,
    ...overrides,
  };
}

describe("deriveCbtProgram", () => {
  it("reports not_started when there is no start timestamp", () => {
    const result = deriveCbtProgram(input({ startedAt: null }));
    expect(result.status).toBe("not_started");
  });

  it("reports in_progress with the elapsed-time current week (capped at 4)", () => {
    expect(deriveCbtProgram(input()).status).toBe("in_progress");
    expect(deriveCbtProgram(input()).currentWeekIndex).toBe(1); // day 8 -> week index 1 (0-based)
    const late = deriveCbtProgram(input({ now: new Date("2026-07-01T00:00:00Z").getTime() }));
    expect(late.currentWeekIndex).toBe(3); // capped at last week
  });

  it("counts only data created at/after startedAt", () => {
    const before = { id: "g0", createdAt: "2026-04-01T00:00:00Z" } as never;
    const after = { id: "g1", createdAt: "2026-05-02T00:00:00Z" } as never;
    const result = deriveCbtProgram(input({ goals: [before, after] }));
    const setGoals = result.weeks[0].tasks.find((t) => t.key === "setGoals")!;
    expect(setGoals.current).toBe(1);
    expect(setGoals.done).toBe(true);
  });

  it("marks a week done only when every task reaches its target", () => {
    const result = deriveCbtProgram(
      input({
        thoughtRecords: [
          { id: "t1", createdAt: "2026-05-02T00:00:00Z", distortions: ["catastrophizing"] },
          { id: "t2", createdAt: "2026-05-03T00:00:00Z", distortions: [] },
          { id: "t3", createdAt: "2026-05-04T00:00:00Z", distortions: [] },
        ] as never,
        beliefs: [{ id: "b1", createdAt: "2026-05-02T00:00:00Z" }] as never,
      }),
    );
    const think = result.weeks[1];
    expect(think.tasks.find((t) => t.key === "threeThoughtRecords")!.done).toBe(true);
    expect(think.tasks.find((t) => t.key === "spotDistortion")!.done).toBe(true);
    expect(think.tasks.find((t) => t.key === "examineBelief")!.done).toBe(true);
    expect(think.done).toBe(true);
  });

  it("graduates when all weeks complete and surfaces summary stats", () => {
    const full = deriveCbtProgram(
      input({
        goals: [{ id: "g", createdAt: "2026-05-02T00:00:00Z" }] as never,
        values: [{ id: "v", updatedAt: "2026-05-02T00:00:00Z" }] as never,
        thoughtRecords: [
          { id: "t1", createdAt: "2026-05-02T00:00:00Z", distortions: ["x"] },
          { id: "t2", createdAt: "2026-05-02T00:00:00Z", distortions: [] },
          { id: "t3", createdAt: "2026-05-02T00:00:00Z", distortions: [] },
        ] as never,
        beliefs: [{ id: "b", createdAt: "2026-05-02T00:00:00Z" }] as never,
        activities: [
          { id: "a1", createdAt: "2026-05-02T00:00:00Z", completedAt: "2026-05-03T00:00:00Z" },
          { id: "a2", createdAt: "2026-05-02T00:00:00Z", completedAt: null },
          { id: "a3", createdAt: "2026-05-02T00:00:00Z", completedAt: null },
        ] as never,
        exposures: [{ id: "e", createdAt: "2026-05-02T00:00:00Z" }] as never,
        moodLogs: [{ id: "m", loggedAt: "2026-05-02T00:00:00Z" }] as never,
        mindfulnessSessions: [{ id: "s", completedAt: "2026-05-02T00:00:00Z" }] as never,
        selfCareLogs: [{ id: "sc", createdAt: "2026-05-02T00:00:00Z" }] as never,
        recoveryPlan: { updatedAt: "2026-05-02T00:00:00Z", personalSlogan: "Onward" } as never,
      }),
    );
    expect(full.allWeeksComplete).toBe(true);
    expect(full.summaryStats.thoughtRecords).toBe(3);
    expect(full.summaryStats.activitiesCompleted).toBe(1);
  });

  it("stays graduated once completedAt is set, even if data is later removed", () => {
    const result = deriveCbtProgram(input({ completedAt: "2026-05-20T00:00:00Z" }));
    expect(result.status).toBe("graduated");
  });
});
