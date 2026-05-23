import { useEffect } from "react";

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

export interface UseActProgramResult {
  program: ActProgramView;
  isLoading: boolean;
  startProgram: () => void;
  dismissProgramPrompt: () => void;
  showProgramPrompt: () => void;
  abandonProgram: () => void;
  replayProgram: () => void;
  promptDismissedAt: string | null;
  isUpdating: boolean;
}

export function useActProgram(userId: string | null): UseActProgramResult {
  const { data: preferences, isLoading: prefsLoading } = useUserPreferences(userId);
  const updatePreferences = useUpdateUserPreferences(userId);

  const choicePoints = useChoicePoints(userId);
  const valueEntries = useValueEntries(userId);
  const connectionLogs = useConnectionLogs(userId);
  const observingSessions = useObservingSelfSessions(userId);
  const defusionLogs = useDefusionLogs(userId);
  const expansionLogs = useExpansionLogs(userId);
  const urgeSurfLogs = useUrgeSurfLogs(userId);
  const committedActions = useCommittedActions(userId);
  const actionSteps = useAllActionSteps(userId);

  const program = deriveActProgram({
    startedAt: preferences?.actProgramStartedAt ?? null,
    completedAt: preferences?.actProgramCompletedAt ?? null,
    now: Date.now(),
    choicePoints: choicePoints.data ?? [],
    valueEntries: valueEntries.data ?? [],
    connectionLogs: connectionLogs.data ?? [],
    observingSessions: observingSessions.data ?? [],
    defusionLogs: defusionLogs.data ?? [],
    expansionLogs: expansionLogs.data ?? [],
    urgeSurfLogs: urgeSurfLogs.data ?? [],
    committedActions: committedActions.data ?? [],
    actionSteps: actionSteps.data ?? [],
  });

  useEffect(() => {
    if (!preferences) return;
    if (updatePreferences.isPending) return;
    if (preferences.actProgramCompletedAt) return;
    if (program.status === "in_progress" && program.allWeeksComplete) {
      void updatePreferences
        .mutateAsync(
          mergeUserPreferences(preferences, {
            actProgramCompletedAt: new Date().toISOString(),
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
          actProgramStartedAt: new Date().toISOString(),
          actProgramCompletedAt: null,
          actProgramPromptDismissedAt: null,
          actOnboardingCompleted: true,
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
    promptDismissedAt: preferences?.actProgramPromptDismissedAt ?? null,
    isUpdating: updatePreferences.isPending,
  };
}
