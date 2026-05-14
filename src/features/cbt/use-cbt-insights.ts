import { useMemo } from "react";

import { useCoreBeliefs } from "@/src/features/beliefs/queries";
import type { CoreBelief } from "@/src/features/beliefs/types";
import { useThoughtRecords } from "@/src/features/cbt/queries";
import { useMoodLogs } from "@/src/features/mood/queries";
import { useRecoveryPlan } from "@/src/features/recovery/queries";
import { useSelfCareLogs } from "@/src/features/self-care/queries";

export interface TopDistortion {
  key: string;
  count: number;
}

export interface ExerciseMoodLift {
  withExercise: number;
  withoutExercise: number;
}

function average(values: number[]) {
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function roundedTenth(value: number) {
  return Math.round(value * 10) / 10;
}

export function useCbtInsights(userId: string | null) {
  const { data: thoughtRecords } = useThoughtRecords(userId);
  const { data: selfCareLogs } = useSelfCareLogs(userId);
  const { data: moodLogs } = useMoodLogs(userId, 60);
  const { data: coreBeliefs } = useCoreBeliefs(userId);
  const { data: recoveryPlan } = useRecoveryPlan(userId);

  const topDistortions = useMemo<TopDistortion[]>(() => {
    if (!thoughtRecords || thoughtRecords.length < 5) {
      return [];
    }

    const counts = new Map<string, number>();
    for (const record of thoughtRecords) {
      for (const distortion of record.distortions) {
        counts.set(distortion, (counts.get(distortion) ?? 0) + 1);
      }
    }

    return [...counts.entries()]
      .map(([key, count]) => ({ key, count }))
      .sort((a, b) => b.count - a.count || a.key.localeCompare(b.key))
      .slice(0, 3);
  }, [thoughtRecords]);

  const exerciseMoodLift = useMemo<ExerciseMoodLift | null>(() => {
    if (!selfCareLogs || selfCareLogs.length < 7 || !moodLogs) {
      return null;
    }

    const moodScoresByDate = new Map<string, number[]>();
    for (const moodLog of moodLogs) {
      const logDate = moodLog.loggedAt.slice(0, 10);
      moodScoresByDate.set(logDate, [...(moodScoresByDate.get(logDate) ?? []), moodLog.moodScore]);
    }

    const averageMoodByDate = new Map<string, number>();
    for (const [logDate, scores] of moodScoresByDate.entries()) {
      averageMoodByDate.set(logDate, average(scores));
    }

    const withExercise: number[] = [];
    const withoutExercise: number[] = [];

    for (const selfCareLog of selfCareLogs) {
      const moodAverage = averageMoodByDate.get(selfCareLog.logDate);
      if (moodAverage === undefined) {
        continue;
      }

      if (selfCareLog.exerciseDone) {
        withExercise.push(moodAverage);
      } else {
        withoutExercise.push(moodAverage);
      }
    }

    if (withExercise.length === 0 || withoutExercise.length === 0) {
      return null;
    }

    return {
      withExercise: roundedTenth(average(withExercise)),
      withoutExercise: roundedTenth(average(withoutExercise)),
    };
  }, [moodLogs, selfCareLogs]);

  const beliefReviewSuggestions = useMemo<CoreBelief[]>(() => {
    if (!coreBeliefs || coreBeliefs.length < 3) {
      return [];
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const reviewSoonCutoff = new Date(today);
    reviewSoonCutoff.setDate(reviewSoonCutoff.getDate() + 7);

    return coreBeliefs.filter((belief) => {
      const reviewDate = belief.nextReviewDate
        ? new Date(`${belief.nextReviewDate}T00:00:00`)
        : null;
      const isDueForReview = reviewDate ? reviewDate <= reviewSoonCutoff : false;
      return isDueForReview || belief.alternativeBeliefStrength <= 30;
    });
  }, [coreBeliefs]);

  const slogan = recoveryPlan?.personalSlogan.trim() ?? "";

  return {
    topDistortions,
    exerciseMoodLift,
    beliefReviewSuggestions,
    slogan,
  };
}
