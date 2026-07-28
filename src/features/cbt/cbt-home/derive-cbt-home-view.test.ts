import type { TFunction } from "i18next";

import { deriveCbtHomeView, type DeriveCbtHomeViewInputs } from "./derive-cbt-home-view";
import type { CbtInsights } from "@/src/features/cbt/use-cbt-insights";
import type { Goal } from "@/src/features/goals/types";
import type { RecoveryPlan } from "@/src/features/recovery/types";
import type { ThoughtRecord } from "@/src/features/cbt/types";

const t = ((key: string) => key) as unknown as TFunction<"cbt">;

function baseInsights(): CbtInsights {
  return {
    topDistortions: [],
    exerciseMoodLift: null,
    activityMoodLiftByCategory: [],
    beliefReviewSuggestions: [],
    recurringThoughtSuggestions: [],
    selfCareTrend: null,
    angerPattern: null,
    exposureProgress: null,
    slogan: "",
  };
}

function goal(id: string, status: Goal["status"]): Goal {
  return {
    id,
    userId: "u1",
    title: `goal ${id}`,
    description: "",
    lifeDomain: "health",
    goalType: "outcome",
    targetDate: null,
    status,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
  };
}

function record(id: string): ThoughtRecord {
  return {
    id,
    userId: "u1",
    situation: "",
    nats: [],
    emotions: [],
    emotionIntensityBefore: null,
    distortions: [],
    evidenceFor: [],
    evidenceAgainst: [],
    balancedThought: "",
    emotionIntensityAfter: null,
    outcomeNotes: "",
    createdAt: "2026-01-01T00:00:00.000Z",
    createdOffsetMinutes: 0,
    dayKey: "2026-01-01",
    updatedAt: "2026-01-01T00:00:00.000Z",
    archivedAt: null,
  };
}

function recoveryPlan(personalSlogan: string): RecoveryPlan {
  return {
    id: "rp1",
    userId: "u1",
    recoveryKeys: [],
    personalSlogan,
    strategyIntegrationNotes: {},
    maintenanceCommitments: [],
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
  };
}

function inputs(overrides: Partial<DeriveCbtHomeViewInputs> = {}): DeriveCbtHomeViewInputs {
  return {
    goals: [],
    thoughtRecords: [],
    recoveryPlan: null,
    insights: baseInsights(),
    program: { status: "not_started" },
    promptDismissedAt: null,
    t,
    ...overrides,
  };
}

describe("deriveCbtHomeView", () => {
  it("keeps only active goals and caps them at two", () => {
    const view = deriveCbtHomeView(
      inputs({
        goals: [
          goal("a", "active"),
          goal("b", "completed"),
          goal("c", "active"),
          goal("d", "active"),
        ],
      }),
    );
    expect(view.activeGoals.map((g) => g.id)).toEqual(["a", "c"]);
  });

  it("returns the first thought record as latestRecord, or null when there are none", () => {
    expect(
      deriveCbtHomeView(inputs({ thoughtRecords: [record("x"), record("y")] })).latestRecord?.id,
    ).toBe("x");
    expect(deriveCbtHomeView(inputs({ thoughtRecords: [] })).latestRecord).toBeNull();
    expect(deriveCbtHomeView(inputs({ thoughtRecords: undefined })).latestRecord).toBeNull();
  });

  describe("personalSlogan fallback", () => {
    it("prefers a trimmed non-empty recovery-plan slogan", () => {
      const view = deriveCbtHomeView(
        inputs({
          recoveryPlan: recoveryPlan("  keep going  "),
          insights: { ...baseInsights(), slogan: "fallback" },
        }),
      );
      expect(view.personalSlogan).toBe("keep going");
    });

    it("falls through to the insights slogan when the recovery slogan is whitespace only", () => {
      const view = deriveCbtHomeView(
        inputs({
          recoveryPlan: recoveryPlan("   "),
          insights: { ...baseInsights(), slogan: "fallback" },
        }),
      );
      expect(view.personalSlogan).toBe("fallback");
    });

    it("is empty when both the recovery and insights slogans are empty", () => {
      const view = deriveCbtHomeView(
        inputs({ recoveryPlan: recoveryPlan(""), insights: { ...baseInsights(), slogan: "" } }),
      );
      expect(view.personalSlogan).toBe("");
    });

    it("uses the insights slogan when there is no recovery plan", () => {
      const view = deriveCbtHomeView(
        inputs({ recoveryPlan: null, insights: { ...baseInsights(), slogan: "from insights" } }),
      );
      expect(view.personalSlogan).toBe("from insights");
    });
  });

  describe("showProgramCard", () => {
    it("is false only when not_started and the prompt was dismissed", () => {
      expect(
        deriveCbtHomeView(
          inputs({ program: { status: "not_started" }, promptDismissedAt: "2026-05-22" }),
        ).showProgramCard,
      ).toBe(false);
    });

    it("is true when not_started and the prompt was never dismissed", () => {
      expect(
        deriveCbtHomeView(inputs({ program: { status: "not_started" }, promptDismissedAt: null }))
          .showProgramCard,
      ).toBe(true);
    });

    it("is true for in_progress even after a prior dismissal", () => {
      expect(
        deriveCbtHomeView(
          inputs({ program: { status: "in_progress" }, promptDismissedAt: "2026-05-22" }),
        ).showProgramCard,
      ).toBe(true);
    });
  });

  describe("hasInsights", () => {
    it("is false when no insight cards are built", () => {
      const view = deriveCbtHomeView(inputs());
      expect(view.hasInsights).toBe(false);
      expect(view.insightCards).toEqual([]);
    });

    it("is true and mirrors the built cards when an insight is present", () => {
      const view = deriveCbtHomeView(
        inputs({
          insights: { ...baseInsights(), topDistortions: [{ key: "catastrophizing", count: 3 }] },
        }),
      );
      expect(view.hasInsights).toBe(true);
      expect(view.insightCards).toHaveLength(1);
      expect(view.topDistortion).toEqual({ key: "catastrophizing", count: 3 });
    });
  });

  it("splits topDistortion from otherDistortions", () => {
    const view = deriveCbtHomeView(
      inputs({
        insights: {
          ...baseInsights(),
          topDistortions: [
            { key: "a", count: 5 },
            { key: "b", count: 3 },
            { key: "c", count: 1 },
          ],
        },
      }),
    );
    expect(view.topDistortion).toEqual({ key: "a", count: 5 });
    expect(view.otherDistortions.map((d) => d.key)).toEqual(["b", "c"]);
  });
});
