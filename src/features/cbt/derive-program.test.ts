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
        // Thought records on 3 distinct days satisfies the daily-practice target.
        thoughtRecords: [
          { id: "t1", createdAt: "2026-05-02T08:00:00Z", distortions: [] },
          { id: "t2", createdAt: "2026-05-03T08:00:00Z", distortions: [] },
          { id: "t3", createdAt: "2026-05-04T08:00:00Z", distortions: [] },
        ] as never,
        beliefs: [{ id: "b1", createdAt: "2026-05-02T00:00:00Z" }] as never,
      }),
    );
    const think = result.weeks[1];
    expect(think.tasks.find((t) => t.key === "thoughtRecordDays")!.done).toBe(true);
    expect(think.tasks.find((t) => t.key === "examineBelief")!.done).toBe(true);
    expect(think.done).toBe(true);
  });

  it("counts a daily-practice task by distinct days, not raw events", () => {
    const result = deriveCbtProgram(
      input({
        // Three records, but only two distinct days -> below the 3-day target.
        thoughtRecords: [
          { id: "t1", createdAt: "2026-05-02T08:00:00Z", distortions: [] },
          { id: "t2", createdAt: "2026-05-02T20:00:00Z", distortions: [] },
          { id: "t3", createdAt: "2026-05-03T08:00:00Z", distortions: [] },
        ] as never,
      }),
    );
    const task = result.weeks[1].tasks.find((t) => t.key === "thoughtRecordDays")!;
    expect(task.current).toBe(2);
    expect(task.done).toBe(false);
  });

  it("graduates when all weeks complete and surfaces summary stats", () => {
    const fourDays = ["2026-05-02", "2026-05-03", "2026-05-04", "2026-05-05"];
    const full = deriveCbtProgram(
      input({
        goals: [{ id: "g", createdAt: "2026-05-02T00:00:00Z" }] as never,
        values: [{ id: "v", updatedAt: "2026-05-02T00:00:00Z" }] as never,
        // Mood check-in on 4 distinct days (Week 1 daily practice).
        moodLogs: fourDays.map((d, i) => ({ id: `m${i}`, loggedAt: `${d}T08:00:00Z` })) as never,
        // Thought records on 3 distinct days (Week 2 daily practice).
        thoughtRecords: [
          { id: "t1", createdAt: "2026-05-02T08:00:00Z", distortions: ["x"] },
          { id: "t2", createdAt: "2026-05-03T08:00:00Z", distortions: [] },
          { id: "t3", createdAt: "2026-05-04T08:00:00Z", distortions: [] },
        ] as never,
        beliefs: [{ id: "b", createdAt: "2026-05-02T00:00:00Z" }] as never,
        // Completed activities on 4 distinct days (Week 3 daily practice).
        activities: fourDays.map((d, i) => ({
          id: `a${i}`,
          createdAt: `${d}T00:00:00Z`,
          completedAt: `${d}T18:00:00Z`,
        })) as never,
        exposures: [{ id: "e", createdAt: "2026-05-02T00:00:00Z" }] as never,
        // Calming sessions on 4 distinct days (Week 4 daily practice).
        mindfulnessSessions: fourDays.map((d, i) => ({
          id: `s${i}`,
          completedAt: `${d}T19:00:00Z`,
        })) as never,
        recoveryPlan: { updatedAt: "2026-05-02T00:00:00Z", personalSlogan: "Onward" } as never,
      }),
    );
    expect(full.allWeeksComplete).toBe(true);
    expect(full.summaryStats.thoughtRecords).toBe(3);
    expect(full.summaryStats.activitiesCompleted).toBe(4);
  });

  it("stays graduated once completedAt is set, even if data is later removed", () => {
    const result = deriveCbtProgram(input({ completedAt: "2026-05-20T00:00:00Z" }));
    expect(result.status).toBe("graduated");
  });
});
