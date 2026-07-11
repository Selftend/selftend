import type { TFunction } from "i18next";

import {
  buildTimeline,
  formatDate,
  getTimelineLabel,
  type TimelineKey,
} from "@/src/features/recovery/timeline";
import type { RecoverySources } from "@/src/features/recovery/sources";

// Echoes the i18n key so we can assert which key each branch resolves.
const t = ((key: string) => key) as unknown as TFunction<"cbt">;

describe("formatDate", () => {
  it("formats a medium date for a fixed locale", () => {
    expect(formatDate("2026-05-01T12:00:00.000Z", "en-US")).toBe("May 1, 2026");
  });

  it("returns a non-empty string for another locale", () => {
    expect(formatDate("2026-05-01T12:00:00.000Z", "bg").length).toBeGreaterThan(0);
  });
});

describe("getTimelineLabel", () => {
  it("uses the recovery.timeline namespace for mood and recovery", () => {
    expect(getTimelineLabel(t, "mood")).toBe("recovery.timeline.mood");
    expect(getTimelineLabel(t, "recovery")).toBe("recovery.timeline.recovery");
  });

  it("uses the dashboard.strategies namespace for strategy keys", () => {
    expect(getTimelineLabel(t, "goals")).toBe("dashboard.strategies.goals");
  });
});

describe("buildTimeline", () => {
  it("omits sources with no records and returns an empty list", () => {
    expect(buildTimeline({}, null)).toEqual([]);
  });

  it("picks the earliest date per source and counts records", () => {
    const sources: RecoverySources = {
      goals: [
        { createdAt: "2026-05-10T12:00:00.000Z", status: "active" },
        { createdAt: "2026-05-02T12:00:00.000Z", status: "active" },
      ],
    };
    const result = buildTimeline(sources, null);
    expect(result).toEqual([{ key: "goals", date: "2026-05-02T12:00:00.000Z", count: 2 }]);
  });

  it("appends the recovery-plan item and sorts all items chronologically", () => {
    const sources: RecoverySources = {
      moodLogs: [{ loggedAt: "2026-06-01T12:00:00.000Z" }],
      goals: [{ createdAt: "2026-04-01T12:00:00.000Z", status: "active" }],
    };
    const result = buildTimeline(sources, { createdAt: "2026-05-01T12:00:00.000Z" });

    expect(result.map((item) => item.key)).toEqual(["goals", "recovery", "mood"]);
    expect(result[1]).toEqual({ key: "recovery", date: "2026-05-01T12:00:00.000Z", count: 1 });
  });

  it("reads the values profile via its updatedAt as a single record", () => {
    const sources: RecoverySources = {
      valuesProfile: { updatedAt: "2026-05-01T12:00:00.000Z", personalValues: [{}, {}] },
    };
    const result = buildTimeline(sources, null);
    const key: TimelineKey = "values";
    expect(result).toEqual([{ key, date: "2026-05-01T12:00:00.000Z", count: 1 }]);
  });
});
