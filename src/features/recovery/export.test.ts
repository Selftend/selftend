import type { TFunction } from "i18next";

import { buildRecoveryPlanExport } from "@/src/features/recovery/export";
import type { ChallengePlan } from "@/src/features/recovery/types";

// Echoes the i18n key, appending an interpolation marker so we can assert both
// the key and that the count/date/strategy value was threaded through.
const t = ((key: string, opts?: Record<string, unknown>) => {
  if (opts && "count" in opts) return `${key}#${String(opts.count)}`;
  if (opts && "date" in opts) return `${key}#${String(opts.date)}`;
  return key;
}) as unknown as TFunction<"cbt">;

function challengePlan(overrides: Partial<ChallengePlan>): ChallengePlan {
  return {
    id: "challenge-1",
    recoveryPlanId: "plan-1",
    userId: "user-1",
    challengeDescription: "Desc",
    copingSteps: ["s1", "s2"],
    createdAt: "2026-05-01T12:00:00.000Z",
    updatedAt: "2026-05-01T12:00:00.000Z",
    ...overrides,
  };
}

describe("buildRecoveryPlanExport", () => {
  it("assembles every section in order with nested coping steps", () => {
    const result = buildRecoveryPlanExport({
      challengePlans: [challengePlan({})],
      lang: "en-US",
      recoveryValues: {
        recoveryKeys: ["Walk"],
        personalSlogan: "Slogan",
        strategyIntegrationNotes: { goals: "note1", custom: "note2" },
        maintenanceCommitments: ["Review"],
      },
      stats: [{ key: "thoughtRecords", value: 2 }],
      t,
      timelineItems: [{ key: "mood", date: "2026-05-01T12:00:00.000Z", count: 3 }],
    });

    const lines = result.split("\n");

    expect(lines[0]).toBe("# recovery.export.fileTitle");
    expect(lines[1]).toBe("");
    // The generated-at line embeds today's date, so assert only its key/shape.
    expect(lines[2]).toMatch(/^recovery\.export\.generatedAt#/);

    expect(lines.slice(3)).toEqual([
      "",
      "## recovery.stats.title",
      "- recovery.stats.thoughtRecords#2: 2",
      "",
      "## recovery.timeline.title",
      "- May 1, 2026: recovery.timeline.mood (recovery.timeline.count#3)",
      "",
      "## recovery.recoveryKeys",
      "- Walk",
      "",
      "## recovery.personalSlogan",
      "Slogan",
      "",
      "## recovery.strategyNotes",
      // Known strategy key resolves to a label; unknown key stays raw.
      "- dashboard.strategies.goals: note1",
      "- custom: note2",
      "",
      "## recovery.challengePlans",
      "- Desc",
      "  - s1",
      "  - s2",
      "",
      "## recovery.maintenanceCommitments",
      "- Review",
    ]);
  });

  it("emits the empty label for every empty section", () => {
    const result = buildRecoveryPlanExport({
      challengePlans: [],
      lang: "en-US",
      recoveryValues: {
        recoveryKeys: [],
        personalSlogan: "",
        strategyIntegrationNotes: {},
        maintenanceCommitments: [],
      },
      stats: [],
      t,
      timelineItems: [],
    });

    // Timeline, keys, slogan, strategy notes, challenge plans, commitments = 6.
    const occurrences = result.split("\n").filter((line) => line === "recovery.export.empty");
    expect(occurrences).toHaveLength(6);
  });
});
