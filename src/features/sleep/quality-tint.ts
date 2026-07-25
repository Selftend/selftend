import { hueRampClass } from "@/src/lib/design-tokens";

/**
 * Tailwind background class for a sleep bar by quality 1..5 — the app-wide
 * 5-step ramp (HUE_RAMP_CLASSES) on sleep's ink hue. Out-of-range values
 * clamp to the ends.
 */
export function qualityTint(quality: number): string {
  return hueRampClass("ink", quality);
}
