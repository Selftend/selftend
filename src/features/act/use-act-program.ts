import { useMemo } from "react";

import {
  useAllActionSteps,
  useChoicePoints,
  useCommittedActions,
  useConnectionLogs,
  useDefusionLogs,
  useExpansionLogs,
  useObservingSelfSessions,
  useUrgeSurfLogs,
  useValueEntries,
} from "@/src/features/act/queries";
import { deriveActProgram, type ActProgramView } from "@/src/features/act/derive-act-program";
import { mergeUserPreferences } from "@/src/features/modules/types";
import { useUpdateUserPreferences, useUserPreferences } from "@/src/features/settings/queries";
import { useSelectedDate } from "@/src/stores/selected-date-store";

interface UseActProgramResult {
  program: ActProgramView;
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

export function useActProgram(userId: string | null): UseActProgramResult {
  const { data: preferences, isLoading: prefsLoading } = useUserPreferences(userId);
  const updatePreferences = useUpdateUserPreferences(userId);
  const { selectedDate } = useSelectedDate();

  const choicePoints = useChoicePoints(userId);
  const valueEntries = useValueEntries(userId);
  const connectionLogs = useConnectionLogs(userId);
  const observingSessions = useObservingSelfSessions(userId);
  const defusionLogs = useDefusionLogs(userId);
  const expansionLogs = useExpansionLogs(userId);
  const urgeSurfLogs = useUrgeSurfLogs(userId);
  const committedActions = useCommittedActions(userId);
  const actionSteps = useAllActionSteps(userId);

  // Memoize the derivation so frequent Today-screen re-renders don't recompute it
  // when the underlying ACT query data is unchanged.
  const program = useMemo(
    () =>
      deriveActProgram({
        startedAt: preferences?.actProgramStartedAt ?? null,
        completedAt: preferences?.actProgramCompletedAt ?? null,
        selectedDate,
        phaseIndex: preferences?.actProgramPhaseIndex ?? 0,
        phaseStartedAt:
          preferences?.actProgramPhaseStartedAt ?? preferences?.actProgramStartedAt ?? null,
        choicePoints: choicePoints.data ?? [],
        valueEntries: valueEntries.data ?? [],
        connectionLogs: connectionLogs.data ?? [],
        observingSessions: observingSessions.data ?? [],
        defusionLogs: defusionLogs.data ?? [],
        expansionLogs: expansionLogs.data ?? [],
        urgeSurfLogs: urgeSurfLogs.data ?? [],
        committedActions: committedActions.data ?? [],
        actionSteps: actionSteps.data ?? [],
      }),
    [
      preferences,
      selectedDate,
      choicePoints.data,
      valueEntries.data,
      connectionLogs.data,
      observingSessions.data,
      defusionLogs.data,
      expansionLogs.data,
      urgeSurfLogs.data,
      committedActions.data,
      actionSteps.data,
    ],
  );

  const advancePhase = () => {
    if (!preferences) return;
    const idx = preferences.actProgramPhaseIndex ?? 0;
    const last = program.totalPhases - 1;
    void updatePreferences
      .mutateAsync(
        idx >= last
          ? mergeUserPreferences(preferences, { actProgramCompletedAt: new Date().toISOString() })
          : mergeUserPreferences(preferences, {
              actProgramPhaseIndex: idx + 1,
              actProgramPhaseStartedAt: new Date().toISOString(),
            }),
      )
      .catch(() => undefined);
  };

  const startProgram = () => {
    if (!preferences) return;
    void updatePreferences
      .mutateAsync(
        mergeUserPreferences(preferences, {
          actProgramStartedAt: new Date().toISOString(),
          actProgramCompletedAt: null,
          actProgramPromptDismissedAt: null,
          actOnboardingCompleted: true,
          actProgramPhaseIndex: 0,
          actProgramPhaseStartedAt: new Date().toISOString(),
        }),
      )
      .catch(() => undefined);
  };

  const dismissProgramPrompt = () => {
    if (!preferences) return;
    void updatePreferences
      .mutateAsync(
        mergeUserPreferences(preferences, {
          actProgramPromptDismissedAt: new Date().toISOString(),
        }),
      )
      .catch(() => undefined);
  };

  const showProgramPrompt = () => {
    if (!preferences) return;
    void updatePreferences
      .mutateAsync(mergeUserPreferences(preferences, { actProgramPromptDismissedAt: null }))
      .catch(() => undefined);
  };

  const abandonProgram = () => {
    if (!preferences) return;
    void updatePreferences
      .mutateAsync(
        mergeUserPreferences(preferences, {
          actProgramStartedAt: null,
          actProgramCompletedAt: null,
          actProgramPromptDismissedAt: new Date().toISOString(),
        }),
      )
      .catch(() => undefined);
  };

  const replayProgram = () => {
    if (!preferences) return;
    void updatePreferences
      .mutateAsync(
        mergeUserPreferences(preferences, {
          actProgramStartedAt: new Date().toISOString(),
          actProgramCompletedAt: null,
          actProgramPromptDismissedAt: null,
          actProgramPhaseIndex: 0,
          actProgramPhaseStartedAt: new Date().toISOString(),
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
    promptDismissedAt: preferences?.actProgramPromptDismissedAt ?? null,
    isUpdating: updatePreferences.isPending,
  };
}
