import { hueRampClass } from "@/src/lib/design-tokens";

/**
 * Tailwind background-tone class for a 1-5 mood score. Shared by the entry
 * card and the detail hero. The steps are the app-wide 5-step ramp
 * (HUE_RAMP_CLASSES, same alphas as the heatmap's hueRamp) on mood's be hue:
 * intensity of the module hue instead of red→green — a low day is a faint
 * wash, never an alarm color. The emoji face stays the valence carrier.
 */
export function scoreToneClass(score: number): string {
  if (!Number.isInteger(score) || score < 1 || score > 5) return "bg-muted";
  return hueRampClass("be", score);
}
