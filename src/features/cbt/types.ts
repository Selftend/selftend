import type { CapturedOffsetMinutes } from "@/src/lib/occurrence-time";

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
  /** Minutes east of UTC where the record was written; null when never captured. */
  createdOffsetMinutes: CapturedOffsetMinutes;
  /**
   * The civil day the record belongs to, resolved once here. A thought record
   * captures the moment a thought was caught, so its day is the day it was where
   * it was written - travelling afterwards must never move it (#330).
   */
  dayKey: string;
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
  /**
   * Create mode only, and always sent as a pair: the instant the record was
   * written and the UTC offset in force at that instant. Editing an existing
   * record sends neither, so its captured day is never re-stamped.
   */
  createdAt?: string;
  createdOffsetMinutes?: number;
}
