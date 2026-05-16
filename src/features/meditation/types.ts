export type StageNumber = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10;

export type DullnessLevel = "none" | "subtle" | "strong";

export type DistractionLevel = "none" | "subtle" | "gross";

export type TmiTechnique =
  | "breathAtNose"
  | "followingTheBreath"
  | "connecting"
  | "bodyScan"
  | "wholeBodyWithBreath"
  | "metacognitiveAwareness"
  | "effortlessness";

export type MeditationObstacleTag =
  | "resistance"
  | "procrastination"
  | "fatigue"
  | "impatience"
  | "boredom"
  | "mindWandering"
  | "monkeyMind"
  | "forgetting"
  | "sleepiness"
  | "grossDistraction"
  | "subtleDullness"
  | "strongDullness"
  | "pain"
  | "intellectualInsights"
  | "chargedMemories"
  | "subtleDistraction"
  | "restlessness"
  | "doubt"
  | "bizarreSensations"
  | "energyCurrents"
  | "meditativeJoyIntensity";

export interface MeditationSession {
  id: string;
  userId: string;
  stageAtSession: StageNumber;
  durationMinutes: number;
  completedAt: string;
  createdAt: string;
  mindWanderingEpisodes: number | null;
  dullnessLevel: DullnessLevel | null;
  distractionLevel: DistractionLevel | null;
  obstacleTags: MeditationObstacleTag[];
  reflection: string;
  moodAfter: number | null;
  techniqueUsed: TmiTechnique | null;
}

export interface MeditationSessionInput {
  stageAtSession: StageNumber;
  durationMinutes: number;
  mindWanderingEpisodes?: number | null;
  dullnessLevel?: DullnessLevel | null;
  distractionLevel?: DistractionLevel | null;
  obstacleTags?: MeditationObstacleTag[];
  reflection?: string;
  moodAfter?: number | null;
  techniqueUsed?: TmiTechnique | null;
}

export interface MeditationProgramState {
  userId: string;
  currentStage: StageNumber;
  assessedStage: StageNumber;
  milestonesReached: number[];
  onboardingCompletedAt: string | null;
  lastSessionAt: string | null;
  preferredDurationMinutes: number | null;
  preferredTimeOfDay: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface MeditationProgramStateInput {
  currentStage?: StageNumber;
  assessedStage?: StageNumber;
  milestonesReached?: number[];
  onboardingCompletedAt?: string | null;
  lastSessionAt?: string | null;
  preferredDurationMinutes?: number | null;
  preferredTimeOfDay?: string | null;
}

export interface StagePracticeNote {
  id: string;
  userId: string;
  stage: StageNumber;
  note: string;
  createdAt: string;
  updatedAt: string;
}

export const MILESTONE_AFTER_STAGE: Record<number, number> = {
  3: 1,
  6: 2,
  7: 3,
  10: 4,
};
