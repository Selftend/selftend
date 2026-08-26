import type { TFunction } from "i18next";

import {
  deriveCbtHomeView,
  deriveSectionRules,
  type DeriveCbtHomeViewInputs,
} from "./derive-cbt-home-view";
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
    valueKey: null,
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
    beliefAfter: null,
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

  it("returns the three most recent thought records, or none when there are none", () => {
    expect(
      deriveCbtHomeView(
        inputs({ thoughtRecords: [record("x"), record("y"), record("z"), record("w")] }),
      ).recentRecords.map((r) => r.id),
    ).toEqual(["x", "y", "z"]);
    expect(deriveCbtHomeView(inputs({ thoughtRecords: [] })).recentRecords).toEqual([]);
    expect(deriveCbtHomeView(inputs({ thoughtRecords: undefined })).recentRecords).toEqual([]);
  });

  /**
   * ☠️ This block used to hand-construct a recovery-plan slogan and an
   * `insights.slogan` that DISAGREED, to prove an `||` fallback picked the
   * right one. Production could never produce that disagreement:
   * `use-cbt-insights` derived `slogan` from the very same `useRecoveryPlan`
   * query, so the two were one value read twice. Three of the four tests here
   * asserted on an unreachable branch and would have stayed green through any
   * change to it.
   *
   * What is left is the behaviour that does exist: one source, trimmed, empty
   * when there is nothing to read back.
   */
  describe("personalSlogan", () => {
    it("trims the recovery-plan slogan", () => {
      expect(
        deriveCbtHomeView(inputs({ recoveryPlan: recoveryPlan("  keep going  ") })).personalSlogan,
      ).toBe("keep going");
    });

    it("is empty when the recovery slogan is whitespace only", () => {
      expect(deriveCbtHomeView(inputs({ recoveryPlan: recoveryPlan("   ") })).personalSlogan).toBe(
        "",
      );
    });

    it("is empty when there is no recovery plan, and while the plan is still loading", () => {
      expect(deriveCbtHomeView(inputs({ recoveryPlan: null })).personalSlogan).toBe("");
      expect(deriveCbtHomeView(inputs({ recoveryPlan: undefined })).personalSlogan).toBe("");
    });
  });

  /**
   * The hairline rule. Every case here has a DIFFERENT section arriving first,
   * which is the whole point: a hardcoded `ruled={false}` passes the first case
   * and fails the rest.
   */
  describe("sectionRules", () => {
    it("lands the first rule on the framework when a user has logged nothing", () => {
      expect(deriveCbtHomeView(inputs()).sectionRules).toEqual({
        goals: false,
        records: false,
        insights: false,
        framework: false,
        review: true,
      });
    });

    it("leaves active goals unruled and rules everything after them", () => {
      expect(
        deriveCbtHomeView(inputs({ goals: [goal("a", "active")], thoughtRecords: [record("x")] }))
          .sectionRules,
      ).toEqual({ goals: false, records: true, insights: true, framework: true, review: true });
    });

    it("moves the unruled block down to recent records when there are no goals", () => {
      expect(deriveCbtHomeView(inputs({ thoughtRecords: [record("x")] })).sectionRules).toEqual({
        goals: false,
        records: false,
        insights: true,
        framework: true,
        review: true,
      });
    });

    it("does not rule the framework off a goal that is no longer active", () => {
      expect(
        deriveCbtHomeView(inputs({ goals: [goal("a", "completed")] })).sectionRules.framework,
      ).toBe(false);
    });
  });

  describe("deriveSectionRules", () => {
    it("rules a section iff some earlier section is visible", () => {
      expect(deriveSectionRules([false, true, false, true])).toEqual([false, false, true, true]);
    });

    it("rules nothing when nothing is visible", () => {
      expect(deriveSectionRules([false, false, false])).toEqual([false, false, false]);
    });

    it("returns an empty list for no sections", () => {
      expect(deriveSectionRules([])).toEqual([]);
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
