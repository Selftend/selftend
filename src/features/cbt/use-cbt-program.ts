import { useEffect } from "react";

import { useActivities } from "@/src/features/activities/queries";
import { useCoreBeliefs } from "@/src/features/beliefs/queries";
import { useThoughtRecords } from "@/src/features/cbt/queries";
import { deriveCbtProgram, type CbtProgramView } from "@/src/features/cbt/derive-program";
import { useHierarchies } from "@/src/features/exposure/queries";
import { useGoals } from "@/src/features/goals/queries";
import { useMindfulnessSessions } from "@/src/features/mindfulness/queries";
import { useMoodLogs } from "@/src/features/mood/queries";
import { mergeUserPreferences } from "@/src/features/modules/types";
import { useTasks } from "@/src/features/procrastination/queries";
import { useRecoveryPlan } from "@/src/features/recovery/queries";
import { useSelfCareLogs } from "@/src/features/self-care/queries";
import { useUpdateUserPreferences, useUserPreferences } from "@/src/features/settings/queries";
import { useValuesProfiles } from "@/src/features/values/queries";

export interface UseCbtProgramResult {
  program: CbtProgramView;
  isLoading: boolean;
  startProgram: () => void;
  dismissProgramPrompt: () => void;
  showProgramPrompt: () => void;
  abandonProgram: () => void;
  replayProgram: () => void;
  promptDismissedAt: string | null;
  isUpdating: boolean;
}

export function useCbtProgram(userId: string | null): UseCbtProgramResult {
  const { data: preferences, isLoading: prefsLoading } = useUserPreferences(userId);
  const updatePreferences = useUpdateUserPreferences(userId);

  const goals = useGoals(userId);
  const values = useValuesProfiles(userId);
  const thoughtRecords = useThoughtRecords(userId);
  const beliefs = useCoreBeliefs(userId);
  const activities = useActivities(userId);
  const exposures = useHierarchies(userId);
  const tasks = useTasks(userId);
  const mindfulnessSessions = useMindfulnessSessions(userId);
  const selfCareLogs = useSelfCareLogs(userId);
  const moodLogs = useMoodLogs(userId, 180);
  const recoveryPlan = useRecoveryPlan(userId);

  const program = deriveCbtProgram({
    startedAt: preferences?.cbtProgramStartedAt ?? null,
    completedAt: preferences?.cbtProgramCompletedAt ?? null,
    now: Date.now(),
    goals: goals.data ?? [],
    values: values.data ?? [],
    thoughtRecords: thoughtRecords.data ?? [],
    beliefs: beliefs.data ?? [],
    activities: activities.data ?? [],
    exposures: exposures.data ?? [],
    tasks: tasks.data ?? [],
    mindfulnessSessions: mindfulnessSessions.data ?? [],
    selfCareLogs: selfCareLogs.data ?? [],
    moodLogs: moodLogs.data ?? [],
    recoveryPlan: recoveryPlan.data ?? null,
  });

  // Latch graduation: once every week is complete, persist completedAt once.
  useEffect(() => {
    if (!preferences) return;
    if (updatePreferences.isPending) return;
    if (preferences.cbtProgramCompletedAt) return;
    if (program.status === "in_progress" && program.allWeeksComplete) {
      void updatePreferences
        .mutateAsync(
          mergeUserPreferences(preferences, {
            cbtProgramCompletedAt: new Date().toISOString(),
          }),
        )
        .catch(() => undefined);
    }
    // updatePreferences is stable; intentionally excluded to avoid re-fires.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [preferences, program.status, program.allWeeksComplete]);

  const startProgram = () => {
    if (!preferences) return;
    void updatePreferences
      .mutateAsync(
        mergeUserPreferences(preferences, {
          cbtProgramStartedAt: new Date().toISOString(),
          cbtProgramCompletedAt: null,
          cbtProgramPromptDismissedAt: null,
          cbtOnboardingCompleted: true,
        }),
      )
      .catch(() => undefined);
  };

  const dismissProgramPrompt = () => {
    if (!preferences) return;
    void updatePreferences
      .mutateAsync(
        mergeUserPreferences(preferences, {
          cbtProgramPromptDismissedAt: new Date().toISOString(),
        }),
      )
      .catch(() => undefined);
  };

  const showProgramPrompt = () => {
    if (!preferences) return;
    void updatePreferences
      .mutateAsync(
        mergeUserPreferences(preferences, {
          cbtProgramPromptDismissedAt: null,
        }),
      )
      .catch(() => undefined);
  };

  const abandonProgram = () => {
    if (!preferences) return;
    void updatePreferences
      .mutateAsync(
        mergeUserPreferences(preferences, {
          cbtProgramStartedAt: null,
          cbtProgramCompletedAt: null,
          cbtProgramPromptDismissedAt: new Date().toISOString(),
        }),
      )
      .catch(() => undefined);
  };

  const replayProgram = () => {
    if (!preferences) return;
    void updatePreferences
      .mutateAsync(
        mergeUserPreferences(preferences, {
          cbtProgramStartedAt: new Date().toISOString(),
          cbtProgramCompletedAt: null,
          cbtProgramPromptDismissedAt: null,
        }),
      )
      .catch(() => undefined);
  };

  return {
    program,
    isLoading: prefsLoading,
    startProgram,
    dismissProgramPrompt,
    showProgramPrompt,
    abandonProgram,
    replayProgram,
    promptDismissedAt: preferences?.cbtProgramPromptDismissedAt ?? null,
    isUpdating: updatePreferences.isPending,
  };
}
