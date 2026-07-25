/**
 * Tailwind background-tone class for a 1-5 mood score. Shared by the entry
 * card and the detail hero. The steps are the same 5-step be-hue alpha ramp
 * the heatmap uses (hueRamp alphas 0.16 → 1): one score encoding module-wide,
 * intensity of the module hue instead of red→green — a low day is a faint
 * wash, never an alarm color. The emoji face stays the valence carrier.
 */
export function scoreToneClass(score: number): string {
  switch (score) {
    case 1:
      return "bg-be/[0.16]";
    case 2:
      return "bg-be/[0.32]";
    case 3:
      return "bg-be/[0.52]";
    case 4:
      return "bg-be/[0.74]";
    case 5:
      return "bg-be";
    default:
      return "bg-muted";
  }
}
