export type ACTPrinciple =
  | "defusion"
  | "expansion"
  | "connection"
  | "observingSelf"
  | "values"
  | "committedAction";

export type ACTConcern =
  | "anxiety"
  | "depression"
  | "anger"
  | "urgesAddiction"
  | "selfCriticism"
  | "procrastination"
  | "grief"
  | "other";

export type ACTLifeDomain = "work" | "leisure" | "relationships" | "personalGrowth";

export type ThoughtCategory =
  | "selfJudgment"
  | "worry"
  | "pastRegret"
  | "prediction"
  | "ruleStatement"
  | "other";

export type DefusionTechnique =
  | "havingTheThoughtThat"
  | "musicalThoughts"
  | "namingTheStory"
  | "thankingYourMind"
  | "sillyVoices"
  | "televisionScreen"
  | "subtitles";

export interface ACTProgramState {
  userId: string;
  activePrinciples: ACTPrinciple[];
  primaryConcerns: ACTConcern[];
  mythsAcknowledged: boolean;
  onboardingCompletedAt: string | null;
  lastCheckInAt: string | null;
  preferredCheckInTime: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ACTProgramStateInput {
  activePrinciples?: ACTPrinciple[];
  primaryConcerns?: ACTConcern[];
  mythsAcknowledged?: boolean;
  onboardingCompletedAt?: string | null;
  lastCheckInAt?: string | null;
  preferredCheckInTime?: string | null;
}

export interface DefusionLog {
  id: string;
  userId: string;
  fusedThought: string;
  thoughtCategory: ThoughtCategory;
  fusionLevelBefore: number | null;
  techniqueUsed: DefusionTechnique;
  defusedVersion: string;
  fusionLevelAfter: number | null;
  notes: string;
  createdAt: string;
  updatedAt: string;
}

export interface DefusionLogInput {
  fusedThought: string;
  thoughtCategory: ThoughtCategory;
  fusionLevelBefore?: number | null;
  techniqueUsed: DefusionTechnique;
  defusedVersion?: string;
  fusionLevelAfter?: number | null;
  notes?: string;
}

export const DEFUSION_TECHNIQUES: DefusionTechnique[] = [
  "havingTheThoughtThat",
  "musicalThoughts",
  "namingTheStory",
  "thankingYourMind",
  "sillyVoices",
  "televisionScreen",
  "subtitles",
];

export const THOUGHT_CATEGORIES: ThoughtCategory[] = [
  "selfJudgment",
  "worry",
  "pastRegret",
  "prediction",
  "ruleStatement",
  "other",
];

export const ACT_CONCERNS: ACTConcern[] = [
  "anxiety",
  "depression",
  "selfCriticism",
  "urgesAddiction",
  "procrastination",
  "anger",
  "grief",
  "other",
];

export const ACT_LIFE_DOMAINS: ACTLifeDomain[] = [
  "work",
  "leisure",
  "relationships",
  "personalGrowth",
];

export type ExpansionTechnique = "fourStepExpansion" | "acceptanceSelfTalk" | "acceptanceImagery";

export type DiscomfortType = "clean" | "dirty";

export interface ExpansionLog {
  id: string;
  userId: string;
  emotion: string;
  bodySensation: string;
  intensityBefore: number | null;
  struggleSwitchOn: boolean | null;
  discomfortType: DiscomfortType | null;
  techniqueUsed: ExpansionTechnique;
  intensityAfter: number | null;
  notes: string;
  createdAt: string;
  updatedAt: string;
}

export interface ExpansionLogInput {
  emotion: string;
  bodySensation?: string;
  intensityBefore?: number | null;
  struggleSwitchOn?: boolean | null;
  discomfortType?: DiscomfortType | null;
  techniqueUsed: ExpansionTechnique;
  intensityAfter?: number | null;
  notes?: string;
}

export interface UrgeSurfLog {
  id: string;
  userId: string;
  urgeDescription: string;
  trigger: string;
  peakIntensity: number | null;
  surfingNotes: string;
  urgeActedOn: boolean;
  completedAt: string;
  createdAt: string;
  updatedAt: string;
}

export interface UrgeSurfLogInput {
  urgeDescription: string;
  trigger?: string;
  peakIntensity?: number | null;
  surfingNotes?: string;
  urgeActedOn?: boolean;
  completedAt?: string;
}

export type ConnectionTechnique = "noticeFiveThings" | "mindfulActivity" | "tenDeepBreaths";

export interface ConnectionLog {
  id: string;
  userId: string;
  technique: ConnectionTechnique;
  activityContext: string;
  noticesFromSenses: string;
  durationMinutes: number | null;
  moodAfter: number | null;
  notes: string;
  createdAt: string;
  updatedAt: string;
}

export interface ConnectionLogInput {
  technique: ConnectionTechnique;
  activityContext?: string;
  noticesFromSenses?: string;
  durationMinutes?: number | null;
  moodAfter?: number | null;
  notes?: string;
}

export type ObservingTechnique = "tenDeepBreaths" | "observingFromBoard" | "bodyAwareness";

export interface ObservingSelfSession {
  id: string;
  userId: string;
  techniqueUsed: ObservingTechnique;
  whatWasObserved: string;
  durationMinutes: number | null;
  moodAfter: number | null;
  notes: string;
  createdAt: string;
  updatedAt: string;
}

export interface ObservingSelfSessionInput {
  techniqueUsed: ObservingTechnique;
  whatWasObserved?: string;
  durationMinutes?: number | null;
  moodAfter?: number | null;
  notes?: string;
}

export interface ValueEntry {
  id: string;
  userId: string;
  lifeDomain: ACTLifeDomain;
  valueStatement: string;
  importanceRating: number | null;
  currentAlignmentRating: number | null;
  currentActionsNote: string;
  desiredActionsNote: string;
  barriers: string;
  createdAt: string;
  updatedAt: string;
}

export interface ValueEntryInput {
  lifeDomain: ACTLifeDomain;
  valueStatement?: string;
  importanceRating?: number | null;
  currentAlignmentRating?: number | null;
  currentActionsNote?: string;
  desiredActionsNote?: string;
  barriers?: string;
}

export interface BullsEyeSnapshot {
  id: string;
  userId: string;
  domain: ACTLifeDomain;
  alignmentRating: number;
  reviewedAt: string;
  createdAt: string;
}

export interface BullsEyeSnapshotInput {
  domain: ACTLifeDomain;
  alignmentRating: number;
  reviewedAt?: string;
}

export const CONNECTION_TECHNIQUES: ConnectionTechnique[] = [
  "noticeFiveThings",
  "mindfulActivity",
  "tenDeepBreaths",
];

export const OBSERVING_TECHNIQUES: ObservingTechnique[] = [
  "tenDeepBreaths",
  "observingFromBoard",
  "bodyAwareness",
];

export const EXPANSION_TECHNIQUES: ExpansionTechnique[] = [
  "fourStepExpansion",
  "acceptanceSelfTalk",
  "acceptanceImagery",
];

export type ActionStatus = "active" | "completed" | "abandoned";

export interface CommittedAction {
  id: string;
  userId: string;
  lifeDomain: ACTLifeDomain;
  title: string;
  description: string;
  status: ActionStatus;
  targetDate: string | null;
  obstacles: string;
  createdAt: string;
  updatedAt: string;
}

export interface CommittedActionInput {
  lifeDomain: ACTLifeDomain;
  title: string;
  description?: string;
  status?: ActionStatus;
  targetDate?: string | null;
  obstacles?: string;
}

export interface CommittedActionPatch {
  title?: string;
  description?: string;
  status?: ActionStatus;
  targetDate?: string | null;
  obstacles?: string;
}

export interface ActionStep {
  id: string;
  userId: string;
  actionId: string;
  description: string;
  isCompleted: boolean;
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ActionStepInput {
  actionId: string;
  description: string;
}

export const RECOMMENDED_PRINCIPLE: Record<ACTConcern, ACTPrinciple> = {
  anxiety: "defusion",
  depression: "values",
  selfCriticism: "defusion",
  urgesAddiction: "expansion",
  procrastination: "committedAction",
  anger: "defusion",
  grief: "expansion",
  other: "defusion",
};
