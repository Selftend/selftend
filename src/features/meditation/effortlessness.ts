/**
 * Stage 7 - mid-sit effortlessness nudge.
 *
 * The book recommends periodically relaxing effort to see whether vigilance
 * is still necessary. The tool surfaces this as a quiet banner around the
 * one-third and two-thirds marks of the sit.
 */

const PROMPT_FRACTIONS = [1 / 3, 2 / 3] as const;

/** Window (in seconds) around each fraction during which the banner is shown. */
const WINDOW_SECONDS = 15;

export type EffortlessnessWindow = 0 | 1;

/**
 * Returns the active prompt window (0 = around 1/3, 1 = around 2/3) if the
 * elapsed time is within `WINDOW_SECONDS` of one of the prompt points.
 * Returns null otherwise. Returns null for sits shorter than 3 minutes -
 * the prompts would overlap.
 */
export function activeEffortlessnessWindow(
  elapsedSeconds: number,
  totalSeconds: number,
): EffortlessnessWindow | null {
  if (totalSeconds < 180) return null;
  for (let i = 0; i < PROMPT_FRACTIONS.length; i += 1) {
    const mark = totalSeconds * PROMPT_FRACTIONS[i];
    if (Math.abs(elapsedSeconds - mark) <= WINDOW_SECONDS) {
      return i as EffortlessnessWindow;
    }
  }
  return null;
}
