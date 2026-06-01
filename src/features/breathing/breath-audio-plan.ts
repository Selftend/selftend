import type { PhaseLabel } from "@/src/constants/breathing";
import type { BreathSound } from "@/src/constants/breathing-sounds";

/**
 * Which breath clip (if any) should play for a phase. Holds use the optional hold cue
 * (only set for guided voice sounds); looped textures leave it null, so their holds are silent.
 * 'none' / a null label are silent.
 */
export function breathClipFor(
  label: PhaseLabel | null,
  sound: BreathSound | undefined,
): number | null {
  if (!label || !sound) return null;
  if (label === "inhale") return sound.inhaleAsset;
  if (label === "exhale") return sound.exhaleAsset;
  if (label === "hold" || label === "holdOut") return sound.holdAsset ?? null;
  return null;
}
