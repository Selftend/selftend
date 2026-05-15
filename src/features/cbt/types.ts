export interface DistortionDefinition {
  key: string;
  title: string;
  shortDescription: string;
  reflectionPrompt: string;
}

export interface ThoughtRecord {
  id: string;
  userId: string;
  situation: string;
  automaticThought: string;
  emotions: string[];
  emotionIntensityBefore: number | null;
  distortions: string[];
  evidenceFor: string[];
  evidenceAgainst: string[];
  balancedThought: string;
  emotionIntensityAfter: number | null;
  outcomeNotes: string;
  createdAt: string;
  updatedAt: string;
  archivedAt: string | null;
}

export interface ThoughtRecordInput {
  situation: string;
  automaticThought: string;
  emotions: string[];
  emotionIntensityBefore: number | null;
  distortions: string[];
  evidenceFor: string[];
  evidenceAgainst: string[];
  balancedThought: string;
  emotionIntensityAfter: number | null;
  outcomeNotes: string;
}

export type ThoughtRecordFormValues = ThoughtRecordInput;
