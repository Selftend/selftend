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
import { ACT_PROGRAM_KEYS } from "@/src/features/modules/program-patches";
import { useProgramActions, type ProgramActions } from "@/src/features/modules/use-program-actions";
import { useUserPreferences } from "@/src/features/settings/queries";
import { useSelectedDate } from "@/src/stores/selected-date-store";

interface UseActProgramResult extends ProgramActions {
  program: ActProgramView;
  isLoading: boolean;
}

export function useActProgram(userId: string | null): UseActProgramResult {
  const { data: preferences, isLoading: prefsLoading } = useUserPreferences(userId);
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

  // The seven transitions, their payloads and their failure handling live in
  // useProgramActions/program-patches (#2810, ADR-0012) - one copy for the
  // three programmes.
  const actions = useProgramActions(userId, ACT_PROGRAM_KEYS, program.totalPhases);

  return {
    program,
    isLoading: prefsLoading,
    ...actions,
  };
}
