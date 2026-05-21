import type { StageNumber, TmiTechnique } from "@/src/features/meditation/types";

export type StagePhase = "novice" | "skilled" | "transition" | "adept";

export interface StageDefinition {
  number: StageNumber;
  phase: StagePhase;
  titleKey: string;
  shortTitleKey: string;
  goalKey: string;
  obstaclesKey: string;
  skillsKey: string;
  masteryKey: string;
  reflectionPromptKeys: string[];
  suggestedTechniques: TmiTechnique[];
  /** Milestone reached at the END of this stage, if any. */
  milestoneAtEnd?: 1 | 2 | 3 | 4;
}

export const STAGES: StageDefinition[] = [
  {
    number: 1,
    phase: "novice",
    titleKey: "stages.s1.title",
    shortTitleKey: "stages.s1.short",
    goalKey: "stages.s1.goal",
    obstaclesKey: "stages.s1.obstacles",
    skillsKey: "stages.s1.skills",
    masteryKey: "stages.s1.mastery",
    reflectionPromptKeys: [
      "stages.s1.prompts.didSit",
      "stages.s1.prompts.duration",
      "stages.s1.prompts.note",
    ],
    suggestedTechniques: ["breathAtNose"],
  },
  {
    number: 2,
    phase: "novice",
    titleKey: "stages.s2.title",
    shortTitleKey: "stages.s2.short",
    goalKey: "stages.s2.goal",
    obstaclesKey: "stages.s2.obstacles",
    skillsKey: "stages.s2.skills",
    masteryKey: "stages.s2.mastery",
    reflectionPromptKeys: [
      "stages.s2.prompts.wanderingCount",
      "stages.s2.prompts.shortening",
      "stages.s2.prompts.pulledHard",
    ],
    suggestedTechniques: ["breathAtNose"],
  },
  {
    number: 3,
    phase: "novice",
    titleKey: "stages.s3.title",
    shortTitleKey: "stages.s3.short",
    goalKey: "stages.s3.goal",
    obstaclesKey: "stages.s3.obstacles",
    skillsKey: "stages.s3.skills",
    masteryKey: "stages.s3.mastery",
    reflectionPromptKeys: [
      "stages.s3.prompts.lostBreath",
      "stages.s3.prompts.sleepiness",
      "stages.s3.prompts.checkIn",
    ],
    suggestedTechniques: ["followingTheBreath", "connecting"],
    milestoneAtEnd: 1,
  },
  {
    number: 4,
    phase: "skilled",
    titleKey: "stages.s4.title",
    shortTitleKey: "stages.s4.short",
    goalKey: "stages.s4.goal",
    obstaclesKey: "stages.s4.obstacles",
    skillsKey: "stages.s4.skills",
    masteryKey: "stages.s4.mastery",
    reflectionPromptKeys: [
      "stages.s4.prompts.grossDistraction",
      "stages.s4.prompts.faintBreath",
      "stages.s4.prompts.charged",
    ],
    suggestedTechniques: ["followingTheBreath"],
  },
  {
    number: 5,
    phase: "skilled",
    titleKey: "stages.s5.title",
    shortTitleKey: "stages.s5.short",
    goalKey: "stages.s5.goal",
    obstaclesKey: "stages.s5.obstacles",
    skillsKey: "stages.s5.skills",
    masteryKey: "stages.s5.mastery",
    reflectionPromptKeys: [
      "stages.s5.prompts.vivid",
      "stages.s5.prompts.peripheral",
      "stages.s5.prompts.bodyScan",
    ],
    suggestedTechniques: ["bodyScan"],
  },
  {
    number: 6,
    phase: "skilled",
    titleKey: "stages.s6.title",
    shortTitleKey: "stages.s6.short",
    goalKey: "stages.s6.goal",
    obstaclesKey: "stages.s6.obstacles",
    skillsKey: "stages.s6.skills",
    masteryKey: "stages.s6.mastery",
    reflectionPromptKeys: ["stages.s6.prompts.subtleFade", "stages.s6.prompts.wholeBody"],
    suggestedTechniques: ["wholeBodyWithBreath", "metacognitiveAwareness"],
    milestoneAtEnd: 2,
  },
  {
    number: 7,
    phase: "transition",
    titleKey: "stages.s7.title",
    shortTitleKey: "stages.s7.short",
    goalKey: "stages.s7.goal",
    obstaclesKey: "stages.s7.obstacles",
    skillsKey: "stages.s7.skills",
    masteryKey: "stages.s7.mastery",
    reflectionPromptKeys: [
      "stages.s7.prompts.droppedEffort",
      "stages.s7.prompts.whatHappened",
      "stages.s7.prompts.sensations",
    ],
    suggestedTechniques: ["effortlessness"],
    milestoneAtEnd: 3,
  },
  {
    number: 8,
    phase: "adept",
    titleKey: "stages.s8.title",
    shortTitleKey: "stages.s8.short",
    goalKey: "stages.s8.goal",
    obstaclesKey: "stages.s8.obstacles",
    skillsKey: "stages.s8.skills",
    masteryKey: "stages.s8.mastery",
    reflectionPromptKeys: ["stages.s8.prompts.unusual", "stages.s8.prompts.comfort"],
    suggestedTechniques: ["effortlessness", "metacognitiveAwareness"],
  },
  {
    number: 9,
    phase: "adept",
    titleKey: "stages.s9.title",
    shortTitleKey: "stages.s9.short",
    goalKey: "stages.s9.goal",
    obstaclesKey: "stages.s9.obstacles",
    skillsKey: "stages.s9.skills",
    masteryKey: "stages.s9.mastery",
    reflectionPromptKeys: ["stages.s9.prompts.joyShape", "stages.s9.prompts.equanimity"],
    suggestedTechniques: ["effortlessness"],
  },
  {
    number: 10,
    phase: "adept",
    titleKey: "stages.s10.title",
    shortTitleKey: "stages.s10.short",
    goalKey: "stages.s10.goal",
    obstaclesKey: "stages.s10.obstacles",
    skillsKey: "stages.s10.skills",
    masteryKey: "stages.s10.mastery",
    reflectionPromptKeys: ["stages.s10.prompts.carried", "stages.s10.prompts.pulledOut"],
    suggestedTechniques: ["effortlessness"],
    milestoneAtEnd: 4,
  },
];

export function getStage(stage: number): StageDefinition {
  const found = STAGES.find((s) => s.number === stage);
  return found ?? STAGES[0];
}

export function suggestStageFromAssessment(answers: {
  hasDailyHabit: boolean;
  breathFocusLength: "seconds" | "aboutAMinute" | "severalMinutes" | "continuously";
  fallsAsleep: boolean;
  catchesDistractionEarly: boolean;
  extendedNoThoughts: boolean;
}): StageNumber {
  // Conservative mapping: always land the user one stage below their best self-report.
  if (!answers.hasDailyHabit) return 1;
  if (answers.fallsAsleep) return 3;

  let candidate: StageNumber = 2;
  if (answers.breathFocusLength === "aboutAMinute") candidate = 3;
  if (answers.breathFocusLength === "severalMinutes") candidate = 3;
  if (answers.breathFocusLength === "continuously") candidate = 4;
  if (answers.catchesDistractionEarly && candidate < 3) candidate = 3;
  if (answers.extendedNoThoughts && candidate < 4) candidate = 4;

  // Cap at 4 from onboarding - practitioners beyond Stage 4 can self-promote later.
  if (candidate > 4) return 4;
  return candidate;
}
