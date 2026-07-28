import { computeRecoveryStats } from "@/src/features/recovery/stats";
import type { RecoverySources } from "@/src/features/recovery/sources";

function statValue(sources: RecoverySources, key: string) {
  return computeRecoveryStats(sources).find((stat) => stat.key === key)?.value;
}

describe("computeRecoveryStats", () => {
  it("returns zeros for every tile when all sources are undefined", () => {
    expect(computeRecoveryStats({})).toEqual([
      { key: "thoughtRecords", value: 0 },
      { key: "exposuresCompleted", value: 0 },
      { key: "moodDays", value: 0 },
      { key: "goalsAchieved", value: 0 },
      { key: "activitiesCompleted", value: 0 },
    ]);
  });

  it("counts only exposures with a completedAt timestamp", () => {
    const sources: RecoverySources = {
      exposureItems: [
        { completedAt: "2026-05-01T12:00:00.000Z" },
        { completedAt: null },
        { completedAt: "2026-05-02T12:00:00.000Z" },
      ],
    };
    expect(statValue(sources, "exposuresCompleted")).toBe(2);
  });

  it("counts only completed goals", () => {
    const sources: RecoverySources = {
      goals: [
        { createdAt: "2026-05-01T12:00:00.000Z", status: "completed" },
        { createdAt: "2026-05-01T12:00:00.000Z", status: "active" },
        { createdAt: "2026-05-01T12:00:00.000Z", status: "completed" },
      ],
    };
    expect(statValue(sources, "goalsAchieved")).toBe(2);
  });

  it("counts only activities with a completedAt timestamp", () => {
    const sources: RecoverySources = {
      activities: [
        { createdAt: "2026-05-01T12:00:00.000Z", completedAt: "2026-05-02T12:00:00.000Z" },
        { createdAt: "2026-05-01T12:00:00.000Z", completedAt: null },
      ],
    };
    expect(statValue(sources, "activitiesCompleted")).toBe(1);
  });

  it("de-dupes mood logs by local date key so same-day logs count once", () => {
    const sources: RecoverySources = {
      moodLogs: [
        { loggedAt: "2026-05-01T12:00:00.000Z", dayKey: "2026-05-01" },
        { loggedAt: "2026-05-01T12:00:00.000Z", dayKey: "2026-05-01" },
        { loggedAt: "2026-06-15T12:00:00.000Z", dayKey: "2026-06-15" },
      ],
    };
    // Three logs across two distinct days -> two mood days.
    expect(statValue(sources, "moodDays")).toBe(2);
  });

  it("counts thought records by length", () => {
    const sources: RecoverySources = {
      thoughtRecords: [
        { createdAt: "2026-05-01T12:00:00.000Z" },
        { createdAt: "2026-05-02T12:00:00.000Z" },
      ],
    };
    expect(statValue(sources, "thoughtRecords")).toBe(2);
  });
});
