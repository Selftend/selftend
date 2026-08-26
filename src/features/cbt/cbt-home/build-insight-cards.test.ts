import type { TFunction } from "i18next";

import { buildInsightCards } from "./build-insight-cards";
import type { CbtInsights } from "@/src/features/cbt/use-cbt-insights";

// Fake translator: echoes the key with a serialized interpolation payload so
// tests can assert both which card was emitted and which values were passed.
const t = ((key: string, opts?: Record<string, unknown>) => {
  if (opts && "defaultValue" in opts) {
    return String(opts.defaultValue);
  }
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

describe("buildInsightCards", () => {
  it("returns no cards when there are no insights", () => {
    expect(buildInsightCards(baseInsights(), t)).toEqual([]);
  });

  it("emits the top-distortion card without a description when there is only one distortion", () => {
    const cards = buildInsightCards(
      { ...baseInsights(), topDistortions: [{ key: "catastrophizing", count: 4 }] },
      t,
    );
    expect(cards).toHaveLength(1);
    expect(cards[0].key).toBe("topDistortion");
    expect(cards[0].title).toBe("dashboard.insights.topDistortion(name=catastrophizing,count=4)");
    expect(cards[0].description).toBeUndefined();
  });

  it("includes the other-distortions detail when more than one distortion exists", () => {
    const cards = buildInsightCards(
      {
        ...baseInsights(),
        topDistortions: [
          { key: "catastrophizing", count: 4 },
          { key: "mindReading", count: 2 },
        ],
      },
      t,
    );
    expect(cards[0].description).toContain("dashboard.insights.topDistortionDetail");
    expect(cards[0].description).toContain("mindReading");
  });

  it("uses the no-sleep-average label when averageSleepHours is null", () => {
    const cards = buildInsightCards(
      {
        ...baseInsights(),
        selfCareTrend: {
          totalDays: 7,
          exerciseDays: 3,
          socialDays: 2,
          gratitudeDays: 1,
          averageSleepHours: null,
        },
      },
      t,
    );
    const card = cards.find((c) => c.key === "selfCareTrend");
    expect(card?.description).toContain("averageSleep=dashboard.insights.noSleepAverage");
  });

  it("uses the sleep-average label with hours when averageSleepHours is set", () => {
    const cards = buildInsightCards(
      {
        ...baseInsights(),
        selfCareTrend: {
          totalDays: 7,
          exerciseDays: 3,
          socialDays: 2,
          gratitudeDays: 1,
          averageSleepHours: 7.5,
        },
      },
      t,
    );
    const card = cards.find((c) => c.key === "selfCareTrend");
    expect(card?.description).toContain("dashboard.insights.sleepAverage(hours=7.5)");
  });

  it("falls back to the no-common-urge label when commonUrge is null", () => {
    const cards = buildInsightCards(
      {
        ...baseInsights(),
        angerPattern: {
          averageArousal: 6,
          timeOutsTaken: 1,
          totalLogs: 4,
          commonUrge: null,
        },
      },
      t,
    );
    const card = cards.find((c) => c.key === "angerPattern");
    expect(card?.description).toContain("commonUrge=dashboard.insights.noCommonUrge");
  });

  it("passes the common urge through when present", () => {
    const cards = buildInsightCards(
      {
        ...baseInsights(),
        angerPattern: {
          averageArousal: 6,
          timeOutsTaken: 1,
          totalLogs: 4,
          commonUrge: "yell",
        },
      },
      t,
    );
    const card = cards.find((c) => c.key === "angerPattern");
    expect(card?.description).toContain("commonUrge=yell");
  });

  it("emits all cards in the fixed DOM order when every insight is present", () => {
    const cards = buildInsightCards(
      {
        topDistortions: [{ key: "catastrophizing", count: 4 }],
        exerciseMoodLift: { withExercise: 7, withoutExercise: 5 },
        activityMoodLiftByCategory: [{ category: "pleasure", averageLift: 2, count: 3 }],
        beliefReviewSuggestions: [{}, {}] as unknown as CbtInsights["beliefReviewSuggestions"],
        recurringThoughtSuggestions: [{ thought: "I always fail", count: 3 }],
        selfCareTrend: {
          totalDays: 7,
          exerciseDays: 3,
          socialDays: 2,
          gratitudeDays: 1,
          averageSleepHours: 7,
        },
        angerPattern: { averageArousal: 6, timeOutsTaken: 1, totalLogs: 4, commonUrge: "yell" },
        exposureProgress: { completed: 2, total: 5 },
      },
      t,
    );
    expect(cards.map((c) => c.key)).toEqual([
      "topDistortion",
      "exerciseMood",
      "reviewBelief",
      "activityMoodLift",
      "recurringThought",
      "selfCareTrend",
      "angerPattern",
      "exposureProgress",
    ]);
  });
});
