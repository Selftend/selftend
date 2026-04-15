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
  distortions: string[];
  balancedThought: string;
  createdAt: string;
  updatedAt: string;
  archivedAt: string | null;
}

export interface ThoughtRecordInput {
  situation: string;
  automaticThought: string;
  emotions: string[];
  distortions: string[];
  balancedThought: string;
}

export interface ThoughtRecordFormValues extends ThoughtRecordInput {}
