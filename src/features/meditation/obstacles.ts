import type { MeditationObstacleTag, StageNumber } from "@/src/features/meditation/types";

const STAGE_OBSTACLE_TAGS: Record<StageNumber, MeditationObstacleTag[]> = {
  1: ["resistance", "procrastination", "fatigue", "impatience", "boredom"],
  2: ["mindWandering", "monkeyMind", "impatience"],
  3: ["forgetting", "mindWandering", "sleepiness"],
  4: ["grossDistraction", "strongDullness", "pain", "intellectualInsights", "chargedMemories"],
  5: ["subtleDullness", "pain"],
  6: ["subtleDistraction", "subtleDullness"],
  7: ["restlessness", "doubt", "boredom", "bizarreSensations", "energyCurrents"],
  8: ["bizarreSensations", "energyCurrents", "meditativeJoyIntensity"],
  9: ["meditativeJoyIntensity"],
  10: [],
};

export function obstacleTagsForStage(stage: StageNumber): MeditationObstacleTag[] {
  return STAGE_OBSTACLE_TAGS[stage] ?? [];
}
