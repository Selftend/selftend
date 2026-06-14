export interface DistortionDefinition {
  key: string;
  title: string;
  shortDescription: string;
  reflectionPrompt: string;
}

export interface NegativeAutomaticThought {
  text: string;
  beliefRating: number | null; // 0-100; how strongly the user believes this thought
  isHotThought: boolean;
}

export interface ThoughtRecord {
  id: string;
  userId: string;
  situation: string;
  nats: NegativeAutomaticThought[];
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
  nats: NegativeAutomaticThought[];
  emotions: string[];
  emotionIntensityBefore: number | null;
  distortions: string[];
  evidenceFor: string[];
  evidenceAgainst: string[];
  balancedThought: string;
  emotionIntensityAfter: number | null;
  outcomeNotes: string;
  createdAt?: string;
}
