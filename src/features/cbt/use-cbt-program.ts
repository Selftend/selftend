import { useMemo } from "react";

import { useActivities } from "@/src/features/activities/queries";
import { useCoreBeliefs } from "@/src/features/beliefs/queries";
import { useThoughtRecords } from "@/src/features/cbt/queries";
import { deriveCbtProgram, type CbtProgramView } from "@/src/features/cbt/derive-cbt-program";
import { useHierarchies } from "@/src/features/exposure/queries";
import { useGoals } from "@/src/features/goals/queries";
import { useMeditationSessions } from "@/src/features/meditation/queries";
import { useMoodHistory } from "@/src/features/mood/queries";
import {} from "@/src/features/modules/types";
import { useRecoveryPlan } from "@/src/features/recovery/queries";
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
  dismissGraduation: () => void;
  promptDismissedAt: string | null;
  graduationDismissedAt: string | null;
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

  const advancePhase = () => {
    if (!preferences) return;
    const idx = preferences.cbtProgramPhaseIndex ?? 0;
    const last = program.totalPhases - 1;
    void updatePreferences
      .mutateAsync(
        idx >= last
          ? { cbtProgramCompletedAt: new Date().toISOString() }
          : {
              cbtProgramPhaseIndex: idx + 1,
              cbtProgramPhaseStartedAt: new Date().toISOString(),
            },
      )
      .catch(() => undefined);
  };

  const startProgram = () => {
    if (!preferences) return;
    void updatePreferences
      .mutateAsync({
        cbtProgramStartedAt: new Date().toISOString(),
        // ☠️ `cbtProgramCompletedAt` is deliberately NOT nulled here. It means
        // the last time this person finished CBT, and the fresh `startedAt`
        // above retires it by itself (ADR-0012, #2530).
        cbtProgramPromptDismissedAt: null,
        cbtGraduationDismissedAt: null,
        cbtProgramPhaseIndex: 0,
        cbtProgramPhaseStartedAt: new Date().toISOString(),
      })
      .catch(() => undefined);
  };

  const dismissProgramPrompt = () => {
    if (!preferences) return;
    void updatePreferences
      .mutateAsync({
        cbtProgramPromptDismissedAt: new Date().toISOString(),
      })
      .catch(() => undefined);
  };

  const showProgramPrompt = () => {
    if (!preferences) return;
    void updatePreferences
      .mutateAsync({
        cbtProgramPromptDismissedAt: null,
      })
      .catch(() => undefined);
  };

  /**
   * ☠️ **What this payload leaves out is the point.** `cbtProgramPhaseIndex` and
   * `cbtProgramPhaseStartedAt` stay exactly where they were, and that pair
   * surviving beside a null `cbtProgramStartedAt` is the ONLY record that this
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
    void updatePreferences
      .mutateAsync({
        cbtProgramStartedAt: null,
        // ☠️ `cbtProgramCompletedAt` is deliberately NOT nulled: leaving a
        // programme must not erase that you once finished it (ADR-0012).
        cbtProgramPromptDismissedAt: new Date().toISOString(),
      })
      .catch(() => undefined);
  };

  const replayProgram = () => {
    if (!preferences) return;
    void updatePreferences
      .mutateAsync({
        cbtProgramStartedAt: new Date().toISOString(),
        // ☠️ Same as `startProgram`: the previous completion stays. Replaying
        // is a new run, not a retraction of the one that finished (ADR-0012).
        cbtProgramPromptDismissedAt: null,
        cbtGraduationDismissedAt: null,
        cbtProgramPhaseIndex: 0,
        cbtProgramPhaseStartedAt: new Date().toISOString(),
      })
      .catch(() => undefined);
  };

  const dismissGraduation = () => {
    if (!preferences) return;
    void updatePreferences
      .mutateAsync({
        cbtGraduationDismissedAt: new Date().toISOString(),
      })
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
    promptDismissedAt: preferences?.cbtProgramPromptDismissedAt ?? null,
    graduationDismissedAt: preferences?.cbtGraduationDismissedAt ?? null,
    isUpdating: updatePreferences.isPending,
  };
}
