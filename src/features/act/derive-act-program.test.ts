import {
  deriveActProgram,
  type DeriveActProgramInput,
} from "@/src/features/act/derive-act-program";
import type { ConnectionTechnique } from "@/src/features/act/types";

function connectionLog(technique: ConnectionTechnique, createdAt: string) {
  return {
    id: createdAt,
    userId: "u1",
    technique,
    activityContext: "",
    noticesFromSenses: "",
    durationMinutes: null,
    moodAfter: null,
    notes: "",
    createdAt,
    updatedAt: createdAt,
  } satisfies DeriveActProgramInput["connectionLogs"][number];
}

function taskCurrent(view: ReturnType<typeof deriveActProgram>, weekIndex: number, key: string) {
  return view.weeks[weekIndex].tasks.find((t) => t.key === key)!.current;
}

const empty: Omit<DeriveActProgramInput, "startedAt" | "completedAt" | "now"> = {
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

describe("deriveActProgram", () => {
  it("returns not_started when there is no start date", () => {
    const view = deriveActProgram({
      startedAt: null,
      completedAt: null,
      now: Date.now(),
      ...empty,
    });
    expect(view.status).toBe("not_started");
    expect(view.weeks).toEqual([]);
    expect(view.totalWeeks).toBe(4);
  });

  it("marks the foundation choice-point task done after one map is created since start", () => {
    const startedAt = "2026-05-01T00:00:00.000Z";
    const view = deriveActProgram({
      startedAt,
      completedAt: null,
      now: new Date("2026-05-02T00:00:00.000Z").getTime(),
      ...empty,
      choicePoints: [
        {
          id: "cp1",
          userId: "u1",
          hooks: [],
          awayMoves: [],
          towardMoves: [],
          notes: "",
          createdAt: "2026-05-01T09:00:00.000Z",
          updatedAt: "2026-05-01T09:00:00.000Z",
        },
      ],
    });
    const foundation = view.weeks[0];
    const task = foundation.tasks.find((t) => t.key === "mapChoicePoint")!;
    expect(task.current).toBe(1);
    expect(task.done).toBe(true);
  });

  it("reports graduated when completedAt is set", () => {
    const view = deriveActProgram({
      startedAt: "2026-05-01T00:00:00.000Z",
      completedAt: "2026-05-28T00:00:00.000Z",
      now: new Date("2026-05-28T00:00:00.000Z").getTime(),
      ...empty,
    });
    expect(view.status).toBe("graduated");
  });

  it("buckets drop-anchor logs to the Foundation daily, not the Be Present daily", () => {
    const view = deriveActProgram({
      startedAt: "2026-05-01T00:00:00.000Z",
      completedAt: null,
      now: new Date("2026-05-03T00:00:00.000Z").getTime(),
      ...empty,
      connectionLogs: [
        connectionLog("dropAnchor", "2026-05-01T09:00:00.000Z"),
        connectionLog("dropAnchor", "2026-05-02T09:00:00.000Z"),
      ],
    });
    // Foundation week (0) dropAnchorDays counts both distinct days.
    expect(taskCurrent(view, 0, "dropAnchorDays")).toBe(2);
    // Be Present week (1) bePresentDays must NOT count drop-anchor logs.
    expect(taskCurrent(view, 1, "bePresentDays")).toBe(0);
  });

  it("buckets noticing logs to the Be Present daily and counts distinct days only", () => {
    const view = deriveActProgram({
      startedAt: "2026-05-01T00:00:00.000Z",
      completedAt: null,
      now: new Date("2026-05-03T00:00:00.000Z").getTime(),
      ...empty,
      connectionLogs: [
        // two on the same day -> counts as one distinct day
        connectionLog("noticeFiveThings", "2026-05-01T08:00:00.000Z"),
        connectionLog("mindfulActivity", "2026-05-01T20:00:00.000Z"),
        connectionLog("bodyScan", "2026-05-02T08:00:00.000Z"),
      ],
    });
    expect(taskCurrent(view, 1, "bePresentDays")).toBe(2);
    // None of these are drop anchor, so the Foundation daily stays at 0.
    expect(taskCurrent(view, 0, "dropAnchorDays")).toBe(0);
  });
});
