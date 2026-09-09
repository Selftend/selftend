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
import { useUpdateUserPreferences, useUserPreferences } from "@/src/features/settings/queries";
import { useSelectedDate } from "@/src/stores/selected-date-store";

/**
 * The DBT programme's state and its six transitions (spec §4).
 *
 * A per-module fork of `use-act-program.ts`, with the shipped semantics
 * unchanged: advancing is a manual button, the last phase's button latches
 * `completed_at`, replay resets to phase one with a fresh `started_at`, and
 * abandoning leaves every record where it is.
 *
 * ☠️ **No encrypted singleton table.** ACT has `act_program_state` because ACT
 * has an onboarding to remember; DBT has none, so the whole of this programme's
 * state is six `user_preferences` columns.
 */
interface UseDbtProgramResult {
  program: DbtProgramView;
  isLoading: boolean;
  startProgram: () => void;
  dismissProgramPrompt: () => void;
  showProgramPrompt: () => void;
  abandonProgram: () => void;
  replayProgram: () => void;
  advancePhase: () => void;
  dismissGraduation: () => void;
  promptDismissedAt: string | null;
  graduationDismissedAt: string | null;
  isUpdating: boolean;
}

export function useDbtProgram(userId: string | null): UseDbtProgramResult {
  const { data: preferences, isLoading: prefsLoading } = useUserPreferences(userId);
  const updatePreferences = useUpdateUserPreferences(userId);
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

  const advancePhase = () => {
    if (!preferences) return;
    const index = preferences.dbtProgramPhaseIndex ?? 0;
    const last = program.totalPhases - 1;
    void updatePreferences
      .mutateAsync(
        index >= last
          ? { dbtProgramCompletedAt: new Date().toISOString() }
          : {
              dbtProgramPhaseIndex: index + 1,
              dbtProgramPhaseStartedAt: new Date().toISOString(),
            },
      )
      .catch(() => undefined);
  };

  const startProgram = () => {
    if (!preferences) return;
    void updatePreferences
      .mutateAsync({
        dbtProgramStartedAt: new Date().toISOString(),
        dbtProgramCompletedAt: null,
        dbtProgramPromptDismissedAt: null,
        dbtProgramPhaseIndex: 0,
        dbtProgramPhaseStartedAt: new Date().toISOString(),
        dbtGraduationDismissedAt: null,
      })
      .catch(() => undefined);
  };

  const dismissProgramPrompt = () => {
    if (!preferences) return;
    void updatePreferences
      .mutateAsync({ dbtProgramPromptDismissedAt: new Date().toISOString() })
      .catch(() => undefined);
  };

  const showProgramPrompt = () => {
    if (!preferences) return;
    void updatePreferences
      .mutateAsync({ dbtProgramPromptDismissedAt: null })
      .catch(() => undefined);
  };

  const abandonProgram = () => {
    if (!preferences) return;
    // ☠️ Records are untouched. Leaving the programme is leaving a path, not
    // deleting the work done on it - and the copy says so.
    void updatePreferences
      .mutateAsync({
        dbtProgramStartedAt: null,
        dbtProgramCompletedAt: null,
        dbtProgramPromptDismissedAt: new Date().toISOString(),
      })
      .catch(() => undefined);
  };

  const replayProgram = () => {
    if (!preferences) return;
    // A fresh `started_at`, so the first phase asks the person to revisit their
    // coping plan rather than counting the one they built a year ago.
    void updatePreferences
      .mutateAsync({
        dbtProgramStartedAt: new Date().toISOString(),
        dbtProgramCompletedAt: null,
        dbtProgramPromptDismissedAt: null,
        dbtProgramPhaseIndex: 0,
        dbtProgramPhaseStartedAt: new Date().toISOString(),
        dbtGraduationDismissedAt: null,
      })
      .catch(() => undefined);
  };

  const dismissGraduation = () => {
    if (!preferences) return;
    void updatePreferences
      .mutateAsync({ dbtGraduationDismissedAt: new Date().toISOString() })
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
    dismissGraduation,
    promptDismissedAt: preferences?.dbtProgramPromptDismissedAt ?? null,
    graduationDismissedAt: preferences?.dbtGraduationDismissedAt ?? null,
    isUpdating: updatePreferences.isPending,
  };
}
