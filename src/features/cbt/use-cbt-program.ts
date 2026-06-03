import { useMemo } from "react";

import { useActivities } from "@/src/features/activities/queries";
import { useCoreBeliefs } from "@/src/features/beliefs/queries";
import { useThoughtRecords } from "@/src/features/cbt/queries";
import { deriveCbtProgram, type CbtProgramView } from "@/src/features/cbt/derive-cbt-program";
import { useHierarchies } from "@/src/features/exposure/queries";
import { useGoals } from "@/src/features/goals/queries";
import { useMeditationSessions } from "@/src/features/meditation/queries";
import { useMoodLogs } from "@/src/features/mood/queries";
import { mergeUserPreferences } from "@/src/features/modules/types";
import { useRecoveryPlan } from "@/src/features/recovery/queries";
import { useSelfCareLogs } from "@/src/features/self-care/queries";
import { useUpdateUserPreferences, useUserPreferences } from "@/src/features/settings/queries";
import { useValuesProfile } from "@/src/features/values/queries";
import { useSelectedDate } from "@/src/stores/selected-date-store";

interface UseCbtProgramResult {
  program: CbtProgramView;
  isLoading: boolean;
  startProgram: () => void;
  dismissProgramPrompt: () => void;
  showProgramPrompt: () => void;
  abandonProgram: () => void;
  replayProgram: () => void;
  advancePhase: () => void;
  promptDismissedAt: string | null;
  isUpdating: boolean;
}

export function useCbtProgram(userId: string | null): UseCbtProgramResult {
  const { data: preferences, isLoading: prefsLoading } = useUserPreferences(userId);
  const updatePreferences = useUpdateUserPreferences(userId);
  const { selectedDate } = useSelectedDate();

  const goals = useGoals(userId);
  const valuesProfile = useValuesProfile(userId);
  const thoughtRecords = useThoughtRecords(userId);
  const beliefs = useCoreBeliefs(userId);
  const activities = useActivities(userId);
  const exposures = useHierarchies(userId);
  const meditationSessions = useMeditationSessions(userId);
  const selfCareLogs = useSelfCareLogs(userId);
  const moodLogs = useMoodLogs(userId, 180);
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
        selfCareLogs: selfCareLogs.data ?? [],
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
      selfCareLogs.data,
      moodLogs.data,
      recoveryPlan.data,
    ],
  );

  const advancePhase = () => {
    if (!preferences) return;
    const idx = preferences.cbtProgramPhaseIndex ?? 0;
    const last = program.totalPhases - 1;
    void updatePreferences
      .mutateAsync(
        idx >= last
          ? mergeUserPreferences(preferences, { cbtProgramCompletedAt: new Date().toISOString() })
          : mergeUserPreferences(preferences, {
              cbtProgramPhaseIndex: idx + 1,
              cbtProgramPhaseStartedAt: new Date().toISOString(),
            }),
      )
      .catch(() => undefined);
  };

  const startProgram = () => {
    if (!preferences) return;
    void updatePreferences
      .mutateAsync(
        mergeUserPreferences(preferences, {
          cbtProgramStartedAt: new Date().toISOString(),
          cbtProgramCompletedAt: null,
          cbtProgramPromptDismissedAt: null,
          cbtOnboardingCompleted: true,
          cbtProgramPhaseIndex: 0,
          cbtProgramPhaseStartedAt: new Date().toISOString(),
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
          cbtProgramPhaseIndex: 0,
          cbtProgramPhaseStartedAt: new Date().toISOString(),
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
    advancePhase,
    promptDismissedAt: preferences?.cbtProgramPromptDismissedAt ?? null,
    isUpdating: updatePreferences.isPending,
  };
}
