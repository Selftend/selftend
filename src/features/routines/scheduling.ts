import type { Routine } from "@/src/features/routines/types";

/**
 * Whether the routine's cadence puts it on the schedule for `date` (#96/#97).
 * Mirrors the habits helper (src/features/habits/scheduling.ts): daily runs
 * every day, weekdays Mon-Fri, custom on the chosen getDay() numbers
 * (0=Sun..6=Sat) - and on-demand routines are NEVER scheduled: they only run
 * manually and never nudge. "Automatic today" is derived from this, not
 * stored.
 */
export function isScheduledOn(
  routine: Pick<Routine, "cadence" | "customDays">,
  date: Date,
): boolean {
  if (routine.cadence === "on-demand") return false;
  if (routine.cadence === "daily") return true;
  const dow = date.getDay();
  if (routine.cadence === "weekdays") return dow >= 1 && dow <= 5;
  return routine.customDays.includes(dow);
}
