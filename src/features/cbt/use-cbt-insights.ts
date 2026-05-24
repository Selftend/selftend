import { useActivities } from "@/src/features/activities/queries";
import type { ActivityCategory } from "@/src/features/activities/types";
import { useAngerLogs } from "@/src/features/anger/queries";
import { useCoreBeliefs } from "@/src/features/beliefs/queries";
import type { CoreBelief } from "@/src/features/beliefs/types";
import { useThoughtRecords } from "@/src/features/cbt/queries";
import { useAllExposureItems } from "@/src/features/exposure/queries";
import { useGratitudeEntries } from "@/src/features/gratitude/queries";
import { useMoodLogs } from "@/src/features/mood/queries";
import { useRecoveryPlan } from "@/src/features/recovery/queries";
import { useSelfCareLogs } from "@/src/features/self-care/queries";
import { useSleepLogs } from "@/src/features/sleep/queries";

export interface TopDistortion {
  key: string;
  count: number;
}

export interface ExerciseMoodLift {
  withExercise: number;
  withoutExercise: number;
}

export interface ActivityMoodLift {
  category: ActivityCategory;
  averageLift: number;
  count: number;
}

export interface RecurringThoughtSuggestion {
  thought: string;
  count: number;
}

export interface SelfCareTrend {
  totalDays: number;
  exerciseDays: number;
  socialDays: number;
  gratitudeDays: number;
  averageSleepHours: number | null;
}

export interface AngerPattern {
  averageArousal: number;
  timeOutsTaken: number;
  totalLogs: number;
  commonUrge: string | null;
}

export interface ExposureProgress {
  completed: number;
  total: number;
}

function average(values: number[]) {
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function roundedTenth(value: number) {
  return Math.round(value * 10) / 10;
}

function normalizeThought(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[.,!?;:"()[\]{}]/g, "")
    .replace(/\s+/g, " ");
}

function normalizeLabel(value: string) {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

export function useCbtInsights(userId: string | null) {
  const { data: activities } = useActivities(userId);
  const { data: angerLogs } = useAngerLogs(userId);
  const { data: thoughtRecords } = useThoughtRecords(userId);
  const { data: exposureItems } = useAllExposureItems(userId);
  const { data: selfCareLogs } = useSelfCareLogs(userId);
  const { data: moodLogs } = useMoodLogs(userId, 60);
  const { data: sleepLogs } = useSleepLogs(userId, 50);
  const { data: gratitudeEntries } = useGratitudeEntries(userId, 50);
  const { data: coreBeliefs } = useCoreBeliefs(userId);
  const { data: recoveryPlan } = useRecoveryPlan(userId);

  const topDistortions: TopDistortion[] = (() => {
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
  })();

  const exerciseMoodLift: ExerciseMoodLift | null = (() => {
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
  })();

  const activityMoodLiftByCategory: ActivityMoodLift[] = (() => {
    const completedWithMood =
      activities?.filter(
        (activity) => activity.moodBefore !== null && activity.moodAfter !== null,
      ) ?? [];

    if (completedWithMood.length < 3) {
      return [];
    }

    const liftsByCategory = new Map<ActivityCategory, number[]>();
    for (const activity of completedWithMood) {
      const moodBefore = activity.moodBefore;
      const moodAfter = activity.moodAfter;
      if (moodBefore === null || moodAfter === null) {
        continue;
      }

      liftsByCategory.set(activity.category, [
        ...(liftsByCategory.get(activity.category) ?? []),
        moodAfter - moodBefore,
      ]);
    }

    return [...liftsByCategory.entries()]
      .map(([category, lifts]) => ({
        category,
        averageLift: roundedTenth(average(lifts)),
        count: lifts.length,
      }))
      .sort((a, b) => b.averageLift - a.averageLift || b.count - a.count);
  })();

  const beliefReviewSuggestions: CoreBelief[] = (() => {
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
  })();

  const recurringThoughtSuggestions: RecurringThoughtSuggestion[] = (() => {
    if (!thoughtRecords || thoughtRecords.length < 5) {
      return [];
    }

    const beliefText = (coreBeliefs ?? [])
      .map((belief) => normalizeThought(belief.beliefStatement))
      .join(" ");
    const counts = new Map<string, { count: number; thought: string }>();

    for (const record of thoughtRecords) {
      const hotNat = record.nats.find((n) => n.isHotThought) ?? record.nats[0];
      if (!hotNat) continue;
      const normalized = normalizeThought(hotNat.text);
      if (normalized.length < 8 || (beliefText && beliefText.includes(normalized))) {
        continue;
      }

      const existing = counts.get(normalized);
      counts.set(normalized, {
        count: (existing?.count ?? 0) + 1,
        thought: existing?.thought ?? hotNat.text.trim(),
      });
    }

    return [...counts.values()]
      .filter((item) => item.count >= 2)
      .sort((a, b) => b.count - a.count || a.thought.localeCompare(b.thought))
      .slice(0, 2);
  })();

  const selfCareTrend: SelfCareTrend | null = (() => {
    if (!selfCareLogs || selfCareLogs.length < 5) {
      return null;
    }

    const recentLogs = [...selfCareLogs]
      .sort((a, b) => b.logDate.localeCompare(a.logDate))
      .slice(0, 7);

    // Bound the sleep/gratitude lookups to the same date span as the recent
    // self-care logs so the trend stays comparable across tools.
    const windowStart = recentLogs[recentLogs.length - 1]?.logDate ?? "";
    const windowEnd = recentLogs[0]?.logDate ?? "";
    const inWindow = (loggedAt: string) => {
      const day = loggedAt.slice(0, 10);
      return day >= windowStart && day <= windowEnd;
    };
    const sleepDurations = (sleepLogs ?? [])
      .filter((s) => inWindow(s.loggedAt))
      .map((s) => s.durationMinutes / 60);
    const gratitudeDayKeys = new Set(
      (gratitudeEntries ?? [])
        .filter((g) => inWindow(g.loggedAt))
        .map((g) => g.loggedAt.slice(0, 10)),
    );

    return {
      totalDays: recentLogs.length,
      exerciseDays: recentLogs.filter((log) => log.exerciseDone).length,
      socialDays: recentLogs.filter((log) => log.socialConnectionMade).length,
      gratitudeDays: gratitudeDayKeys.size,
      averageSleepHours: sleepDurations.length > 0 ? roundedTenth(average(sleepDurations)) : null,
    };
  })();

  const angerPattern: AngerPattern | null = (() => {
    if (!angerLogs || angerLogs.length < 3) {
      return null;
    }

    const urgeCounts = new Map<string, { count: number; label: string }>();
    for (const log of angerLogs) {
      const label = log.urge.trim();
      const normalized = normalizeLabel(label);
      if (!normalized) {
        continue;
      }

      const existing = urgeCounts.get(normalized);
      urgeCounts.set(normalized, {
        count: (existing?.count ?? 0) + 1,
        label: existing?.label ?? label,
      });
    }

    const commonUrge =
      [...urgeCounts.values()].sort(
        (a, b) => b.count - a.count || a.label.localeCompare(b.label),
      )[0]?.label ?? null;

    return {
      averageArousal: roundedTenth(average(angerLogs.map((log) => log.arousalLevel))),
      timeOutsTaken: angerLogs.filter((log) => log.timeOutTaken).length,
      totalLogs: angerLogs.length,
      commonUrge,
    };
  })();

  const exposureProgress: ExposureProgress | null = (() => {
    if (!exposureItems || exposureItems.length === 0) {
      return null;
    }

    return {
      completed: exposureItems.filter((item) => item.completedAt).length,
      total: exposureItems.length,
    };
  })();

  const slogan = recoveryPlan?.personalSlogan.trim() ?? "";

  return {
    topDistortions,
    exerciseMoodLift,
    activityMoodLiftByCategory,
    beliefReviewSuggestions,
    recurringThoughtSuggestions,
    selfCareTrend,
    angerPattern,
    exposureProgress,
    slogan,
  };
}
