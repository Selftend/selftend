// Tailwind background class for a sleep bar by quality 1..5 (ink-hue ramp).
// Class literals are written out so NativeWind compiles them.
const TINTS = ["bg-ink/20", "bg-ink/35", "bg-ink/50", "bg-ink/70", "bg-ink"] as const;

export function qualityTint(quality: number): string {
  if (quality <= 1) return TINTS[0];
  if (quality >= 5) return TINTS[4];
  return TINTS[quality - 1];
}
