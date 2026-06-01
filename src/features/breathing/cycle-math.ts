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
 * Whole minutes actually breathed, for the session log. Clamps negative
 * remaining to 0 elapsed and floors the result at 1 minute.
 */
export function elapsedMinutes(plannedSeconds: number, remainingSeconds: number): number {
  const elapsed = plannedSeconds - Math.max(0, remainingSeconds);
  return Math.max(1, Math.round(elapsed / 60));
}
