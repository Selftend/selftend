import { useMemo } from "react";

import { deriveDbtProgram, type DbtProgramView } from "@/src/features/dbt/derive-dbt-program";
import {
  useCopingPlan,
  useDbtSessions,
  useEmotionRecords,
  useJudgements,
  useOppositeActionPlans,
  useScripts,
  useWiseMindCheckins,
} from "@/src/features/dbt/queries";
import { DBT_PROGRAM_KEYS } from "@/src/features/modules/program-patches";
import { useProgramActions, type ProgramActions } from "@/src/features/modules/use-program-actions";
import { useUserPreferences } from "@/src/features/settings/queries";
import { useSelectedDate } from "@/src/stores/selected-date-store";

/**
 * The DBT programme's state and its transitions (spec §4), with the shipped
 * semantics unchanged: advancing is a manual button, the last phase's button
 * latches `completed_at`, replay resets to phase one with a fresh `started_at`,
 * and abandoning leaves every record where it is. The transitions themselves
 * are the shared `useProgramActions` (#2810).
 *
 * ☠️ **No encrypted singleton table.** ACT has `act_program_state` because ACT
 * has an onboarding to remember; DBT has none, so the whole of this programme's
 * state is six `user_preferences` columns.
 */
interface UseDbtProgramResult extends ProgramActions {
  program: DbtProgramView;
  isLoading: boolean;
}

export function useDbtProgram(userId: string | null): UseDbtProgramResult {
  const { data: preferences, isLoading: prefsLoading } = useUserPreferences(userId);
  const { selectedDate } = useSelectedDate();

  const copingPlan = useCopingPlan(userId);
  const sessions = useDbtSessions(userId);
  const wiseMindCheckins = useWiseMindCheckins(userId);
  const judgements = useJudgements(userId);
  const emotionRecords = useEmotionRecords(userId);
  const oppositeActionPlans = useOppositeActionPlans(userId);
  const scripts = useScripts(userId);

  // Memoised so a re-render with unchanged query data does not recompute the
  // whole derivation - this card sits on a screen that also holds seven lists.
  const program = useMemo(
    () =>
      deriveDbtProgram({
        startedAt: preferences?.dbtProgramStartedAt ?? null,
        completedAt: preferences?.dbtProgramCompletedAt ?? null,
        selectedDate,
        phaseIndex: preferences?.dbtProgramPhaseIndex ?? 0,
        phaseStartedAt:
          preferences?.dbtProgramPhaseStartedAt ?? preferences?.dbtProgramStartedAt ?? null,
        copingPlan: copingPlan.data ?? null,
        sessions: sessions.data ?? [],
        wiseMindCheckins: wiseMindCheckins.data ?? [],
        judgements: judgements.data ?? [],
        emotionRecords: emotionRecords.data ?? [],
        oppositeActionPlans: oppositeActionPlans.data ?? [],
        scripts: scripts.data ?? [],
      }),
    [
      preferences,
      selectedDate,
      copingPlan.data,
      sessions.data,
      wiseMindCheckins.data,
      judgements.data,
      emotionRecords.data,
      oppositeActionPlans.data,
      scripts.data,
    ],
  );

  const actions = useProgramActions(userId, DBT_PROGRAM_KEYS, program.totalPhases);

  return {
    program,
    isLoading: prefsLoading,
    ...actions,
  };
}
