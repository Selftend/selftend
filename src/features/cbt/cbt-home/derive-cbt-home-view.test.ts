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

// Echoes the key with a serialized interpolation payload, so stat assertions
// can see both which label was chosen and which count it pluralises against.
const t = ((key: string, opts?: Record<string, unknown>) => {
  if (!opts) {
    return key;
  }
  const parts = Object.entries(opts)
    .map(([k, v]) => `${k}=${String(v)}`)
    .join(",");
  return `${key}(${parts})`;
}) as unknown as TFunction<"cbt">;

function baseInsights(): CbtInsights {
  return {
    distortionCounts: [],
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

function record(id: string, overrides: Partial<ThoughtRecord> = {}): ThoughtRecord {
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
    createdAt: "2026-01-15T12:00:00.000Z",
    createdOffsetMinutes: 0,
    dayKey: "2026-01-15",
    updatedAt: "2026-01-15T12:00:00.000Z",
    archivedAt: null,
    ...overrides,
  };
}

/** A record carrying the full belief pair, created inside the test month. */
function pairedRecord(id: string, beliefBefore: number, beliefAfter: number): ThoughtRecord {
  return record(id, {
    nats: [{ text: `thought ${id}`, beliefRating: beliefBefore, isHotThought: true }],
    beliefAfter,
  });
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
    lifetimeRecordCount: 0,
    monthRecordCount: 0,
    monthStartIso: "2026-01-01T00:00:00.000Z",
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
    it("is false when there are neither bars nor cards", () => {
      const view = deriveCbtHomeView(inputs());
      expect(view.hasInsights).toBe(false);
      expect(view.insightCards).toEqual([]);
      expect(view.distortionBars).toEqual([]);
    });

    /**
     * The widened gate (#1387): with the bars replacing the top-distortion
     * card, a gate on the card list alone would hide a user's pattern counts
     * whenever the other seven card kinds are silent - the common case at
     * five to ten records.
     */
    it("is true on bars alone, with every card kind silent", () => {
      const view = deriveCbtHomeView(
        inputs({
          insights: { ...baseInsights(), distortionCounts: [{ key: "catastrophizing", count: 2 }] },
        }),
      );
      expect(view.hasInsights).toBe(true);
      expect(view.insightCards).toEqual([]);
      expect(view.distortionBars).toEqual([{ key: "catastrophizing", count: 2 }]);
      expect(view.sectionRules.framework).toBe(true);
    });

    it("is true on cards alone", () => {
      const view = deriveCbtHomeView(
        inputs({
          insights: {
            ...baseInsights(),
            exerciseMoodLift: { withExercise: 7, withoutExercise: 5 },
          },
        }),
      );
      expect(view.hasInsights).toBe(true);
      expect(view.insightCards).toHaveLength(1);
    });
  });

  /**
   * The header's stat run (#1387). Stat 3 is the load-bearing one: a signed
   * mean SHIFT over this month's records that carry both belief numbers,
   * OMITTED from the array - never dashed, never zeroed - when none does.
   */
  describe("headerStats", () => {
    it("renders lifetime and this-month counts in order, pattern B", () => {
      const view = deriveCbtHomeView(inputs({ lifetimeRecordCount: 24, monthRecordCount: 4 }));
      expect(view.headerStats).toEqual([
        { value: "24", label: "home.statRecords(count=24)" },
        { value: "4", label: "home.statThisMonth" },
      ]);
    });

    it("renders an em dash, not a zero, while a count is in flight", () => {
      const view = deriveCbtHomeView(
        inputs({ lifetimeRecordCount: undefined, monthRecordCount: undefined }),
      );
      expect(view.headerStats[0].value).toBe("home.statLoadingValue");
      expect(view.headerStats[1].value).toBe("home.statLoadingValue");
      // Only the label falls back to 0 - it needs some count to pluralise against.
      expect(view.headerStats[0].label).toBe("home.statRecords(count=0)");
    });

    it("appends the mean belief shift, signed after - before, label carrying the magnitude", () => {
      const view = deriveCbtHomeView(
        inputs({
          lifetimeRecordCount: 3,
          monthRecordCount: 3,
          // Shifts: -45 and -25 -> mean -35.
          thoughtRecords: [pairedRecord("r1", 85, 40), pairedRecord("r2", 60, 35)],
        }),
      );
      expect(view.headerStats).toHaveLength(3);
      expect(view.headerStats[2]).toEqual({
        value: "-35",
        label: "home.statBeliefShift(count=35)",
      });
    });

    it("omits stat 3 from the array when no record carries both numbers", () => {
      const view = deriveCbtHomeView(
        inputs({
          lifetimeRecordCount: 2,
          monthRecordCount: 2,
          thoughtRecords: [
            // A before with no after, and an after with no before: neither counts.
            record("r1", {
              nats: [{ text: "t", beliefRating: 80, isHotThought: true }],
              beliefAfter: null,
            }),
            record("r2", {
              nats: [{ text: "t", beliefRating: null, isHotThought: true }],
              beliefAfter: 40,
            }),
          ],
        }),
      );
      expect(view.headerStats).toHaveLength(2);
    });

    it("still renders stat 3 at a mean of exactly 0, and signs a positive mean", () => {
      const zero = deriveCbtHomeView(inputs({ thoughtRecords: [pairedRecord("r1", 50, 50)] }));
      expect(zero.headerStats[2]).toEqual({
        value: "0",
        label: "home.statBeliefShift(count=0)",
      });

      const positive = deriveCbtHomeView(inputs({ thoughtRecords: [pairedRecord("r1", 40, 52)] }));
      expect(positive.headerStats[2]).toEqual({
        value: "+12",
        label: "home.statBeliefShift(count=12)",
      });
    });

    it("excludes records created before the month start from the mean", () => {
      const view = deriveCbtHomeView(
        inputs({
          thoughtRecords: [
            pairedRecord("r1", 85, 40), // -45, in month
            record("r2", {
              nats: [{ text: "t", beliefRating: 90, isHotThought: true }],
              beliefAfter: 0, // -90, but last month - must not drag the mean
              createdAt: "2025-12-15T12:00:00.000Z",
            }),
          ],
        }),
      );
      expect(view.headerStats[2].value).toBe("-45");
    });

    it("omits stat 3 while the record list itself is still loading", () => {
      const view = deriveCbtHomeView(inputs({ thoughtRecords: undefined }));
      expect(view.headerStats).toHaveLength(2);
    });
  });
});
