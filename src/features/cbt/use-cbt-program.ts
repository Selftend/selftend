import { useMemo } from "react";

import { useActivities } from "@/src/features/activities/queries";
import { useCoreBeliefs } from "@/src/features/beliefs/queries";
import { useThoughtRecords } from "@/src/features/cbt/queries";
import { deriveCbtProgram, type CbtProgramView } from "@/src/features/cbt/derive-cbt-program";
import { useHierarchies } from "@/src/features/exposure/queries";
import { useGoals } from "@/src/features/goals/queries";
import { useMeditationSessions } from "@/src/features/meditation/queries";
import { CBT_PROGRAM_KEYS } from "@/src/features/modules/program-patches";
import { useProgramActions, type ProgramActions } from "@/src/features/modules/use-program-actions";
import { useMoodHistory } from "@/src/features/mood/queries";
import { useRecoveryPlan } from "@/src/features/recovery/queries";
import { useUserPreferences } from "@/src/features/settings/queries";
import { useValuesProfile } from "@/src/features/values/queries";
import { useSelectedDate } from "@/src/stores/selected-date-store";

interface UseCbtProgramResult extends ProgramActions {
  program: CbtProgramView;
  isLoading: boolean;
}

export function useCbtProgram(userId: string | null): UseCbtProgramResult {
  const { data: preferences, isLoading: prefsLoading } = useUserPreferences(userId);
  const { selectedDate } = useSelectedDate();

  const goals = useGoals(userId);
  const valuesProfile = useValuesProfile(userId);
  const thoughtRecords = useThoughtRecords(userId);
  const beliefs = useCoreBeliefs(userId);
  const activities = useActivities(userId);
  const exposures = useHierarchies(userId);
  const meditationSessions = useMeditationSessions(userId);
  const moodLogs = useMoodHistory(userId, 180);
  const recoveryPlan = useRecoveryPlan(userId);

  // deriveCbtProgram iterates over goals, thought records, up to 180 mood logs, beliefs,
  // activities, etc. Memoize so the frequent Today-screen re-renders (layout, edit-mode,
  // drag) don't recompute it when the underlying query data is unchanged.
  const program = useMemo(
    () =>
      deriveCbtProgram({
        startedAt: preferences?.cbtProgramStartedAt ?? null,
        completedAt: preferences?.cbtProgramCompletedAt ?? null,
        selectedDate,
        phaseIndex: preferences?.cbtProgramPhaseIndex ?? 0,
        phaseStartedAt:
          preferences?.cbtProgramPhaseStartedAt ?? preferences?.cbtProgramStartedAt ?? null,
        goals: goals.data ?? [],
        valuesProfile: valuesProfile.data ?? null,
        thoughtRecords: thoughtRecords.data ?? [],
        beliefs: beliefs.data ?? [],
        activities: activities.data ?? [],
        exposures: exposures.data ?? [],
        meditationSessions: meditationSessions.data ?? [],
        moodLogs: moodLogs.data ?? [],
        recoveryPlan: recoveryPlan.data ?? null,
      }),
    [
      preferences,
      selectedDate,
      goals.data,
      valuesProfile.data,
      thoughtRecords.data,
      beliefs.data,
      activities.data,
      exposures.data,
      meditationSessions.data,
      moodLogs.data,
      recoveryPlan.data,
    ],
  );

  // The seven transitions, their payloads and their failure handling live in
  // useProgramActions/program-patches (#2810, ADR-0012) - one copy for the
  // three programmes.
  const actions = useProgramActions(userId, CBT_PROGRAM_KEYS, program.totalPhases);

  return {
    program,
    isLoading: prefsLoading,
    ...actions,
  };
}
