import type { TFunction } from "i18next";

import type { CbtInsights } from "@/src/features/cbt/use-cbt-insights";

export interface InsightCardModel {
  key: string;
  title: string;
  description?: string;
}

/**
 * Builds the ordered list of insight cards rendered on the CBT home screen.
 * Each card is emitted only when its underlying datum is present, so
 * `cards.length > 0` is an exact stand-in for the former hand-maintained
 * `hasInsights` OR-gate. Card order matches the previous inline DOM order.
 */
export function buildInsightCards(insights: CbtInsights, t: TFunction<"cbt">): InsightCardModel[] {
  const {
    activityMoodLiftByCategory,
    angerPattern,
    beliefReviewSuggestions,
    exerciseMoodLift,
    exposureProgress,
    recurringThoughtSuggestions,
    selfCareTrend,
    topDistortions,
  } = insights;

  const topDistortion = topDistortions[0] ?? null;
  const otherDistortions = topDistortions.slice(1);
  const topRecurringThought = recurringThoughtSuggestions[0] ?? null;

  const cards: InsightCardModel[] = [];

  if (topDistortion) {
    cards.push({
      key: "topDistortion",
      title: t("dashboard.insights.topDistortion", {
        name: t(`distortions.${topDistortion.key}.title`, {
          defaultValue: topDistortion.key,
        }),
        count: topDistortion.count,
      }),
      description:
        otherDistortions.length > 0
          ? t("dashboard.insights.topDistortionDetail", {
              names: otherDistortions
                .map((distortion) =>
                  t("dashboard.insights.distortionSummaryItem", {
                    name: t(`distortions.${distortion.key}.title`, {
                      defaultValue: distortion.key,
                    }),
                    count: distortion.count,
                  }),
                )
                .join(", "),
            })
          : undefined,
    });
  }

  if (exerciseMoodLift) {
    cards.push({
      key: "exerciseMood",
      title: t("dashboard.insights.exerciseMood", {
        withExercise: exerciseMoodLift.withExercise,
        withoutExercise: exerciseMoodLift.withoutExercise,
      }),
      description: t("dashboard.insights.exerciseMoodDetail"),
    });
  }

  if (beliefReviewSuggestions.length > 0) {
    cards.push({
      key: "reviewBelief",
      title: t("dashboard.insights.reviewBelief", {
        count: beliefReviewSuggestions.length,
      }),
      description: t("dashboard.insights.reviewBeliefDetail"),
    });
  }

  if (activityMoodLiftByCategory.length > 0) {
    cards.push({
      key: "activityMoodLift",
      title: t("dashboard.insights.activityMoodLift"),
      description: t("dashboard.insights.activityMoodLiftDetail", {
        summary: activityMoodLiftByCategory
          .map((item) =>
            t("dashboard.insights.activityMoodLiftItem", {
              category: t(`activities.category.${item.category}`),
              lift: item.averageLift,
              count: item.count,
            }),
          )
          .join(", "),
      }),
    });
  }

  if (topRecurringThought) {
    cards.push({
      key: "recurringThought",
      title: t("dashboard.insights.recurringThought", {
        thought: topRecurringThought.thought,
      }),
      description: t("dashboard.insights.recurringThoughtDetail", {
        count: topRecurringThought.count,
      }),
    });
  }

  if (selfCareTrend) {
    cards.push({
      key: "selfCareTrend",
      title: t("dashboard.insights.selfCareTrend", {
        exerciseDays: selfCareTrend.exerciseDays,
        totalDays: selfCareTrend.totalDays,
      }),
      description: t("dashboard.insights.selfCareTrendDetail", {
        socialDays: selfCareTrend.socialDays,
        gratitudeDays: selfCareTrend.gratitudeDays,
        averageSleep:
          selfCareTrend.averageSleepHours === null
            ? t("dashboard.insights.noSleepAverage")
            : t("dashboard.insights.sleepAverage", {
                hours: selfCareTrend.averageSleepHours,
              }),
      }),
    });
  }

  if (angerPattern) {
    cards.push({
      key: "angerPattern",
      title: t("dashboard.insights.angerPattern", {
        averageArousal: angerPattern.averageArousal,
      }),
      description: t("dashboard.insights.angerPatternDetail", {
        commonUrge: angerPattern.commonUrge ?? t("dashboard.insights.noCommonUrge"),
        timeOutsTaken: angerPattern.timeOutsTaken,
        totalLogs: angerPattern.totalLogs,
      }),
    });
  }

  if (exposureProgress) {
    cards.push({
      key: "exposureProgress",
      title: t("dashboard.insights.exposureProgress", {
        completed: exposureProgress.completed,
        total: exposureProgress.total,
      }),
      description: t("dashboard.insights.exposureProgressDetail"),
    });
  }

  return cards;
}
