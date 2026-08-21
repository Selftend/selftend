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
  /**
   * How strongly the hot thought is believed after working the record, 0-100
   * (#1376). Null on every record written before the column existed, and on any
   * record whose author left the rating untouched - nothing may assume it is
   * present. Compare against the hot thought's own `beliefRating` to get the
   * shift; the pair is the only reason this is plaintext rather than another
   * value inside the encrypted `nats` blob, which SQL cannot aggregate.
   */
  beliefAfter: number | null;
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
  /** How strongly the hot thought is believed afterwards, 0-100; null when unrated. */
  beliefAfter: number | null;
  /**
   * Create mode only, and always sent as a pair: the instant the record was
   * written and the UTC offset in force at that instant. Editing an existing
   * record sends neither, so its captured day is never re-stamped.
   */
  createdAt?: string;
  createdOffsetMinutes?: number;
}
