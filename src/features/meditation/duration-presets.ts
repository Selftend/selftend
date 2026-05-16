import type { StageNumber } from "@/src/features/meditation/types";

const BASE = [10, 15, 20, 30] as const;
const ADEPT_EXTENSION = [45, 60, 90] as const;

/**
 * Adept practitioners (Stages 8+) get longer presets unlocked. No upsell,
 * no badges — they simply appear in the chip row.
 */
export function durationPresetsForStage(stage: StageNumber): number[] {
  if (stage >= 8) return [...BASE, ...ADEPT_EXTENSION];
  return [...BASE];
}
