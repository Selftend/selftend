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
        // ☠️ `dbtProgramCompletedAt` is deliberately NOT nulled here. It means
        // the last time this person finished DBT, and the fresh `startedAt`
        // above retires it by itself (ADR-0012, #2530).
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

  /**
   * ☠️ **What this payload leaves out is the point.** `dbtProgramPhaseIndex` and
   * `dbtProgramPhaseStartedAt` stay exactly where they were, and that pair
   * surviving beside a null `dbtProgramStartedAt` is the ONLY record that this
   * run ever existed and how far it got - the **fossil** (ADR-0012, #2530).
   *
   * ⚠️ So do not "finish the job" by nulling them. It reads like a tidy-up and
   * it is the whole of #2386: someone who reached phase 4 and stopped would
   * become indistinguishable from someone who never opened the module, with no
   * way to recover the difference afterwards. #2530 refused to keep the dates a
   * run would otherwise carry, and that refusal only holds because this survives.
   *
   * `test/programme-fossil-contract.test.ts` fails if anything nulls it.
   */
  const abandonProgram = () => {
    if (!preferences) return;
    // ☠️ Records are untouched. Leaving the programme is leaving a path, not
    // deleting the work done on it - and the copy says so.
    void updatePreferences
      .mutateAsync({
        dbtProgramStartedAt: null,
        // ☠️ `dbtProgramCompletedAt` is deliberately NOT nulled: leaving a
        // programme must not erase that you once finished it (ADR-0012).
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
        // ☠️ Same as `startProgram`: the previous completion stays. Replaying
        // is a new run, not a retraction of the one that finished (ADR-0012).
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
