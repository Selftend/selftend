import type { DbtSessionVariant } from "@/src/features/dbt/types";

/**
 * The muscle-relaxation session's shape (spec §3.1.3).
 *
 * Pure, and separate from the screen, for the same reason breathing's
 * `schedule.ts` is: the question "where is this session at 214 seconds in" has
 * one right answer, and a test should be able to ask it without mounting a
 * timer. The screen ticks a clock and reads this; nothing else derives time.
 *
 * **Tense five seconds, release twenty-five, twice per group.** The book's
 * three tensing levels and its cue-phrase pairing are NOT built (decision 6):
 * the copy says *gently* and stops. Sixty seconds per group means the full
 * variant runs twelve minutes and the short one five, which is the length the
 * spec names in each case.
 */

/** Seconds spent tensing one group, once. */
export const TENSE_SECONDS = 5;
/** Seconds spent letting go, once - the part that does the work. */
export const RELEASE_SECONDS = 25;
/** Tense-and-release rounds per group. */
export const ROUNDS_PER_GROUP = 2;

/**
 * The twelve groups of the full run, head to toe after the hands - the order
 * the book teaches, which starts somewhere easy to feel.
 */
export const FULL_GROUPS = [
  "hands",
  "forearms",
  "upperArms",
  "shoulders",
  "neck",
  "face",
  "chest",
  "stomach",
  "back",
  "hips",
  "thighs",
  "calvesAndFeet",
] as const;

/** The five combined poses of the short run. */
export const SHORT_GROUPS = [
  "handsAndArms",
  "faceAndNeck",
  "chestAndStomach",
  "backAndHips",
  "legsAndFeet",
] as const;

export type MuscleGroup = (typeof FULL_GROUPS)[number] | (typeof SHORT_GROUPS)[number];

export function groupsFor(variant: DbtSessionVariant): readonly MuscleGroup[] {
  return variant === "short" ? SHORT_GROUPS : FULL_GROUPS;
}

/** One beat of the run: which group, tensing or releasing, and for how long. */
export interface MuscleStep {
  group: MuscleGroup;
  /** 0-based index of the group within the run. */
  groupIndex: number;
  phase: "tense" | "release";
  /** 1-based round within the group. */
  round: number;
  durationSeconds: number;
}

export function buildSteps(variant: DbtSessionVariant): MuscleStep[] {
  const steps: MuscleStep[] = [];
  groupsFor(variant).forEach((group, groupIndex) => {
    for (let round = 1; round <= ROUNDS_PER_GROUP; round += 1) {
      steps.push({ group, groupIndex, phase: "tense", round, durationSeconds: TENSE_SECONDS });
      steps.push({ group, groupIndex, phase: "release", round, durationSeconds: RELEASE_SECONDS });
    }
  });
  return steps;
}

/** The whole run's length, in seconds. */
export function plannedSeconds(variant: DbtSessionVariant): number {
  return groupsFor(variant).length * ROUNDS_PER_GROUP * (TENSE_SECONDS + RELEASE_SECONDS);
}

export interface MuscleSessionState {
  done: boolean;
  step: MuscleStep | null;
  /** 0-based index of the step on screen, or the step count once done. */
  stepIndex: number;
  /** 1-based group the person is in, for "Group 3 of 12". */
  groupNumber: number;
  /** Whole seconds left in the current step - the numeral on screen. */
  stepRemainingSeconds: number;
  /** Whole seconds left in the whole run. */
  totalRemainingSeconds: number;
}

/**
 * Pure: where is the run at `elapsedSeconds`? The same shape breathing's
 * `scheduleStateAt` returns, and for the same reason - the screen renders a
 * state rather than mutating one, so a tick that arrives late (a backgrounded
 * app, a slow frame) lands on the right beat instead of drifting.
 */
export function sessionStateAt(steps: MuscleStep[], elapsedSeconds: number): MuscleSessionState {
  const planned = steps.reduce((sum, step) => sum + step.durationSeconds, 0);
  const doneState: MuscleSessionState = {
    done: true,
    step: null,
    stepIndex: steps.length,
    groupNumber: steps.length === 0 ? 0 : steps[steps.length - 1]!.groupIndex + 1,
    stepRemainingSeconds: 0,
    totalRemainingSeconds: 0,
  };

  if (steps.length === 0 || planned <= 0 || elapsedSeconds >= planned) return doneState;

  let acc = 0;
  for (let index = 0; index < steps.length; index += 1) {
    const step = steps[index]!;
    if (elapsedSeconds < acc + step.durationSeconds) {
      return {
        done: false,
        step,
        stepIndex: index,
        groupNumber: step.groupIndex + 1,
        stepRemainingSeconds: Math.ceil(acc + step.durationSeconds - elapsedSeconds),
        totalRemainingSeconds: Math.ceil(planned - elapsedSeconds),
      };
    }
    acc += step.durationSeconds;
  }

  return doneState;
}

/** The elapsed seconds at which a given group starts - what Back and Next hop to. */
export function groupStartSeconds(steps: MuscleStep[], groupIndex: number): number {
  let acc = 0;
  for (const step of steps) {
    if (step.groupIndex === groupIndex) return acc;
    acc += step.durationSeconds;
  }
  return acc;
}
