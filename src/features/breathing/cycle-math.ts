import type { BreathingPhase } from "@/src/constants/breathing";

/** Total seconds in a single cycle (sum of all phase durations). */
export function cycleSeconds(phases: BreathingPhase[]): number {
  return phases.reduce((sum, phase) => sum + phase.durationSeconds, 0);
}

/** Total seconds for a session of `cycles` repetitions. */
export function totalSeconds(phases: BreathingPhase[], cycles: number): number {
  return cycleSeconds(phases) * cycles;
}

/** "M:SS" under an hour, "HH:MM:SS" at an hour or more. */
export function formatClock(seconds: number): string {
  const whole = Math.max(0, Math.round(seconds));
  const hours = Math.floor(whole / 3600);
  const minutes = Math.floor((whole % 3600) / 60);
  const secs = whole % 60;
  const pad = (n: number) => n.toString().padStart(2, "0");
  return hours > 0 ? `${pad(hours)}:${pad(minutes)}:${pad(secs)}` : `${minutes}:${pad(secs)}`;
}

/**
 * The five length buttons on session setup (`4b`) and on the new-pattern
 * editor's "Default length" row (`4d`). They pick a MINUTE TARGET; the cycle
 * count is derived from it and the pattern's own cycle length, which is why a
 * 2-minute box-breathing session is 8 cycles and a 2-minute 4-7-8 session is 6.
 */
export const SESSION_LENGTH_MINUTES = [1, 2, 3, 5, 10] as const;

/**
 * Cycles that come closest to `minutes` for a pattern whose cycle is
 * `secondsPerCycle` long. Always at least one cycle: a 1-minute target against
 * a 76-second cycle rounds to 1, not 0.
 *
 * `secondsPerCycle` of 0 cannot happen for a saved pattern (the schema refuses
 * one with neither an inhale nor an exhale) but is guarded anyway, because the
 * editor calls this on in-progress input that can transiently be all zeros.
 */
export function cyclesForMinutes(secondsPerCycle: number, minutes: number): number {
  if (secondsPerCycle <= 0) return 1;
  return Math.max(1, Math.round((minutes * 60) / secondsPerCycle));
}

/**
 * Whole minutes actually breathed, for the session log. Clamps negative
 * remaining to 0 elapsed and floors the result at 1 minute.
 */
export function elapsedMinutes(plannedSeconds: number, remainingSeconds: number): number {
  const elapsed = plannedSeconds - Math.max(0, remainingSeconds);
  return Math.max(1, Math.round(elapsed / 60));
}
