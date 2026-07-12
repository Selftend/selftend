import { useActivities } from "@/src/features/activities/queries";
import { useAngerLogs } from "@/src/features/anger/queries";
import { useCoreBeliefs } from "@/src/features/beliefs/queries";
import { useThoughtRecords } from "@/src/features/cbt/queries";
import { useAllExposureItems, useHierarchies } from "@/src/features/exposure/queries";
import { useGoals } from "@/src/features/goals/queries";
import { useMindfulnessSessions } from "@/src/features/mindfulness/queries";
import { useMoodLogs } from "@/src/features/mood/queries";
import { useTasks } from "@/src/features/procrastination/queries";
import {
  useChallengePlans,
  useDeleteChallengePlan,
  useRecoveryPlan,
  useSaveChallengePlan,
  useUpsertRecoveryPlan,
} from "@/src/features/recovery/queries";
import type { RecoverySources } from "@/src/features/recovery/sources";
import { useSelfCareLogs } from "@/src/features/self-care/queries";
import { useUserPreferences } from "@/src/features/settings/queries";
import { useValuesProfile } from "@/src/features/values/queries";
import { useWorryEntries } from "@/src/features/worry/queries";

/**
 * Aggregates every cross-feature query the recovery screen depends on: the recovery
 * plan + challenge plans, the three recovery mutations, user preferences, and the 13
 * record sources that feed stats / timeline / active-strategy derivation.
 *
 * Wiring is moved verbatim from the screen — each query is passed `userId` exactly as
 * before, and the `sources` object is assembled in the same shape.
 */
export function useRecoverySources(userId: string | null) {
  const { data: preferences } = useUserPreferences(userId);
  const { data: recoveryPlan, isLoading: isRecoveryLoading } = useRecoveryPlan(userId);
  const { data: challengePlans } = useChallengePlans(userId);
  const upsertRecoveryMutation = useUpsertRecoveryPlan(userId);
  const saveChallengeMutation = useSaveChallengePlan(userId);
  const deleteChallengeMutation = useDeleteChallengePlan(userId);

  const { data: goals } = useGoals(userId);
  const { data: activities } = useActivities(userId);
  const { data: thoughtRecords } = useThoughtRecords(userId);
  const { data: valuesProfile } = useValuesProfile(userId);
  const { data: beliefs } = useCoreBeliefs(userId);
  const { data: hierarchies } = useHierarchies(userId);
  const { data: exposureItems } = useAllExposureItems(userId);
  const { data: moodLogs } = useMoodLogs(userId, 365);
  const { data: worries } = useWorryEntries(userId);
  const { data: mindfulnessSessions } = useMindfulnessSessions(userId);
  const { data: tasks } = useTasks(userId);
  const { data: angerLogs } = useAngerLogs(userId);
  const { data: selfCareLogs } = useSelfCareLogs(userId);

  const sources: RecoverySources = {
    goals,
    activities,
    thoughtRecords,
    valuesProfile,
    beliefs,
    hierarchies,
    exposureItems,
    moodLogs,
    worries,
    mindfulnessSessions,
    tasks,
    angerLogs,
    selfCareLogs,
  };

  return {
    sources,
    preferences,
    recoveryPlan,
    isRecoveryLoading,
    challengePlans,
    upsertRecoveryMutation,
    saveChallengeMutation,
    deleteChallengeMutation,
  };
}
