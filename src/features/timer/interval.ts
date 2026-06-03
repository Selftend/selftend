export const DEFAULT_INTERVAL_MINUTES = 5;

/** Selectable interval-bell options, in minutes. `0` means the interval bell is off. */
export const INTERVAL_OPTIONS_MINUTES = [0, 5, 10, 15] as const;

/**
 * True when an interval bell should sound at this point in a sit. Fires on every
 * whole interval boundary after the start, never at elapsed 0 and never when the
 * interval is off (`intervalSeconds <= 0`). The caller is responsible for not
 * calling this on the final tick (where the end bell plays instead).
 */
export function isIntervalTick(elapsedSeconds: number, intervalSeconds: number): boolean {
  return intervalSeconds > 0 && elapsedSeconds > 0 && elapsedSeconds % intervalSeconds === 0;
}
