import type { UserPreferences } from "@/src/features/modules/types";

/**
 * The seven programme-state transitions, as pure `user_preferences` patch
 * builders. One copy for the three programmes: `use-cbt-program.ts`,
 * `use-act-program.ts` and `use-dbt-program.ts` shipped these payloads
 * token-identical modulo the `cbt|act|dbt` prefix (#2810), and the prefix is
 * exactly what a `ProgramPreferenceKeys` map carries.
 *
 * These are the ONLY writers of programme state. Keeping them pure keeps the
 * ADR-0012 contract testable as data: `test/programme-fossil-contract.test.ts`
 * asserts the exact shape of every patch built here, which a source-regex over
 * three hook bodies never could.
 */

type TimestampPreferenceKey = {
  [K in keyof UserPreferences]: UserPreferences[K] extends string | null ? K : never;
}[keyof UserPreferences];

type CounterPreferenceKey = {
  [K in keyof UserPreferences]: UserPreferences[K] extends number ? K : never;
}[keyof UserPreferences];

/** The six `user_preferences` columns one programme's whole state lives in. */
export interface ProgramPreferenceKeys {
  startedAt: TimestampPreferenceKey;
  completedAt: TimestampPreferenceKey;
  promptDismissedAt: TimestampPreferenceKey;
  phaseIndex: CounterPreferenceKey;
  phaseStartedAt: TimestampPreferenceKey;
  graduationDismissedAt: TimestampPreferenceKey;
}

export const CBT_PROGRAM_KEYS: ProgramPreferenceKeys = {
  startedAt: "cbtProgramStartedAt",
  completedAt: "cbtProgramCompletedAt",
  promptDismissedAt: "cbtProgramPromptDismissedAt",
  phaseIndex: "cbtProgramPhaseIndex",
  phaseStartedAt: "cbtProgramPhaseStartedAt",
  graduationDismissedAt: "cbtGraduationDismissedAt",
};

export const ACT_PROGRAM_KEYS: ProgramPreferenceKeys = {
  startedAt: "actProgramStartedAt",
  completedAt: "actProgramCompletedAt",
  promptDismissedAt: "actProgramPromptDismissedAt",
  phaseIndex: "actProgramPhaseIndex",
  phaseStartedAt: "actProgramPhaseStartedAt",
  graduationDismissedAt: "actGraduationDismissedAt",
};

export const DBT_PROGRAM_KEYS: ProgramPreferenceKeys = {
  startedAt: "dbtProgramStartedAt",
  completedAt: "dbtProgramCompletedAt",
  promptDismissedAt: "dbtProgramPromptDismissedAt",
  phaseIndex: "dbtProgramPhaseIndex",
  phaseStartedAt: "dbtProgramPhaseStartedAt",
  graduationDismissedAt: "dbtGraduationDismissedAt",
};

export function startProgramPatch(
  keys: ProgramPreferenceKeys,
  now: string,
): Partial<UserPreferences> {
  return {
    [keys.startedAt]: now,
    // ☠️ `completedAt` is deliberately NOT nulled here. It means the last time
    // this person finished the programme, and the fresh `startedAt` above
    // retires it by itself (ADR-0012, #2530).
    [keys.promptDismissedAt]: null,
    [keys.phaseIndex]: 0,
    [keys.phaseStartedAt]: now,
    [keys.graduationDismissedAt]: null,
  } as Partial<UserPreferences>;
}

// ☠️ Same payload as `startProgramPatch` on purpose: the previous completion
// stays. Replaying is a new run, not a retraction of the one that finished
// (ADR-0012).
export function replayProgramPatch(
  keys: ProgramPreferenceKeys,
  now: string,
): Partial<UserPreferences> {
  return startProgramPatch(keys, now);
}

export function dismissProgramPromptPatch(
  keys: ProgramPreferenceKeys,
  now: string,
): Partial<UserPreferences> {
  return { [keys.promptDismissedAt]: now } as Partial<UserPreferences>;
}

export function showProgramPromptPatch(keys: ProgramPreferenceKeys): Partial<UserPreferences> {
  return { [keys.promptDismissedAt]: null } as Partial<UserPreferences>;
}

/**
 * ☠️ **What this payload leaves out is the point.** `phaseIndex` and
 * `phaseStartedAt` stay exactly where they were, and that pair surviving
 * beside a null `startedAt` is the ONLY record that this run ever existed and
 * how far it got - the **fossil** (ADR-0012, #2530).
 *
 * ⚠️ So do not "finish the job" by nulling them. It reads like a tidy-up and
 * it is the whole of #2386: someone who reached phase 4 and stopped would
 * become indistinguishable from someone who never opened the module, with no
 * way to recover the difference afterwards. #2530 refused to keep the dates a
 * run would otherwise carry, and that refusal only holds because this survives.
 *
 * Records are untouched too: leaving the programme is leaving a path, not
 * deleting the work done on it - and the copy says so.
 *
 * `test/programme-fossil-contract.test.ts` pins this patch's exact shape.
 */
export function abandonProgramPatch(
  keys: ProgramPreferenceKeys,
  now: string,
): Partial<UserPreferences> {
  return {
    [keys.startedAt]: null,
    // ☠️ `completedAt` is deliberately NOT nulled: leaving a programme must
    // not erase that you once finished it (ADR-0012).
    [keys.promptDismissedAt]: now,
  } as Partial<UserPreferences>;
}

/** The last phase's advance latches `completedAt` instead of incrementing. */
export function advancePhasePatch(
  keys: ProgramPreferenceKeys,
  phaseIndex: number,
  totalPhases: number,
  now: string,
): Partial<UserPreferences> {
  return phaseIndex >= totalPhases - 1
    ? ({ [keys.completedAt]: now } as Partial<UserPreferences>)
    : ({
        [keys.phaseIndex]: phaseIndex + 1,
        [keys.phaseStartedAt]: now,
      } as Partial<UserPreferences>);
}

export function dismissGraduationPatch(
  keys: ProgramPreferenceKeys,
  now: string,
): Partial<UserPreferences> {
  return { [keys.graduationDismissedAt]: now } as Partial<UserPreferences>;
}
