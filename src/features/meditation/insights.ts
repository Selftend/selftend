import type { MeditationSession, StageNumber } from "@/src/features/meditation/types";

interface StageDistributionEntry {
  stage: StageNumber;
  sessionCount: number;
  totalMinutes: number;
}

export interface MeditationInsights {
  totalSessions: number;
  totalMinutes: number;
  longestSitMinutes: number;
  averageMoodAfter: number | null;
  stageDistribution: StageDistributionEntry[];
  /**
   * Average mind-wandering count in the last 14 days minus the prior 14 days
   * (so a negative number means catches are happening less often, which is
   * the direction practice tends in at Stages 2-3). Null if either window has
   * fewer than three sits with a logged count.
   */
  mindWanderingTrend: number | null;
}

const RECENT_WINDOW_MS = 14 * 24 * 60 * 60 * 1000;
const MIN_SAMPLES_FOR_TREND = 3;

export function computeMeditationInsights(
  sessions: MeditationSession[],
  now: Date = new Date(),
): MeditationInsights {
  if (sessions.length === 0) {
    return {
      totalSessions: 0,
      totalMinutes: 0,
      longestSitMinutes: 0,
      averageMoodAfter: null,
      stageDistribution: [],
      mindWanderingTrend: null,
    };
  }

  const totalMinutes = sessions.reduce((sum, s) => sum + s.durationMinutes, 0);
  const longestSitMinutes = sessions.reduce(
    (max, s) => (s.durationMinutes > max ? s.durationMinutes : max),
    0,
  );

  const moodValues = sessions
    .map((s) => s.moodAfter)
    .filter((m): m is number => typeof m === "number");
  const averageMoodAfter =
    moodValues.length > 0 ? moodValues.reduce((sum, m) => sum + m, 0) / moodValues.length : null;

  const byStage = new Map<StageNumber, StageDistributionEntry>();
  for (const session of sessions) {
    const stage = session.stageAtSession;
    const existing = byStage.get(stage);
    if (existing) {
      existing.sessionCount += 1;
      existing.totalMinutes += session.durationMinutes;
    } else {
      byStage.set(stage, {
        stage,
        sessionCount: 1,
        totalMinutes: session.durationMinutes,
      });
    }
  }
  const stageDistribution = Array.from(byStage.values()).sort((a, b) => a.stage - b.stage);

  const nowMs = now.getTime();
  const recentSamples: number[] = [];
  const priorSamples: number[] = [];
  for (const session of sessions) {
    if (session.mindWanderingEpisodes === null) continue;
    const completedAt = new Date(session.completedAt).getTime();
    const age = nowMs - completedAt;
    if (age < 0) continue;
    if (age <= RECENT_WINDOW_MS) {
      recentSamples.push(session.mindWanderingEpisodes);
    } else if (age <= RECENT_WINDOW_MS * 2) {
      priorSamples.push(session.mindWanderingEpisodes);
    }
  }
  const mindWanderingTrend =
    recentSamples.length >= MIN_SAMPLES_FOR_TREND && priorSamples.length >= MIN_SAMPLES_FOR_TREND
      ? avg(recentSamples) - avg(priorSamples)
      : null;

  return {
    totalSessions: sessions.length,
    totalMinutes,
    longestSitMinutes,
    averageMoodAfter,
    stageDistribution,
    mindWanderingTrend,
  };
}

function avg(numbers: number[]): number {
  return numbers.reduce((sum, n) => sum + n, 0) / numbers.length;
}
