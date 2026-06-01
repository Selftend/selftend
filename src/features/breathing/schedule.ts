import type { BreathingPhase } from "@/src/constants/breathing";

export interface ScheduleState {
  done: boolean;
  /** Absolute phase index across all cycles (0-based), or total count when done. */
  phaseIndex: number;
  phase: BreathingPhase | null;
  /** 1-based cycle the user is in. */
  cycleNumber: number;
  /** Whole seconds left in the current phase (ceil). */
  phaseRemainingSeconds: number;
  /** Whole seconds left in the whole session (ceil). */
  totalRemainingSeconds: number;
}

/**
 * Pure: where are we at `elapsedSeconds` into a session of `cycles` repetitions of `phases`?
 * `elapsedSeconds` may be fractional; phase durations may be fractional. Phases passed in
 * are the non-zero phases of one cycle, in order.
 */
export function scheduleStateAt(
  phases: BreathingPhase[],
  cycles: number,
  elapsedSeconds: number,
): ScheduleState {
  const cycleLength = phases.reduce((sum, p) => sum + p.durationSeconds, 0);
  const planned = cycleLength * cycles;
  const totalPhases = phases.length * cycles;

  if (phases.length === 0 || cycleLength <= 0 || elapsedSeconds >= planned) {
    return {
      done: true,
      phaseIndex: totalPhases,
      phase: null,
      cycleNumber: cycles,
      phaseRemainingSeconds: 0,
      totalRemainingSeconds: 0,
    };
  }

  let acc = 0;
  for (let idx = 0; idx < totalPhases; idx++) {
    const phase = phases[idx % phases.length];
    if (elapsedSeconds < acc + phase.durationSeconds) {
      return {
        done: false,
        phaseIndex: idx,
        phase,
        cycleNumber: Math.floor(idx / phases.length) + 1,
        phaseRemainingSeconds: Math.ceil(acc + phase.durationSeconds - elapsedSeconds),
        totalRemainingSeconds: Math.ceil(planned - elapsedSeconds),
      };
    }
    acc += phase.durationSeconds;
  }

  return {
    done: true,
    phaseIndex: totalPhases,
    phase: null,
    cycleNumber: cycles,
    phaseRemainingSeconds: 0,
    totalRemainingSeconds: 0,
  };
}
