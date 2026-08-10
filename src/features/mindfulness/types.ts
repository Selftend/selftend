import type { CapturedOffsetMinutes } from "@/src/lib/occurrence-time";

export interface MindfulnessSession {
  id: string;
  userId: string;
  exerciseName: string;
  durationMinutes: number;
  reflection: string;
  moodAfter: number | null;
  feelingAfter: string | null;
  completedAt: string;
  /** Minutes east of UTC where the session was finished; null when never captured. */
  completedOffsetMinutes: CapturedOffsetMinutes;
  /**
   * The civil day the session belongs to, resolved once here. Breathing and
   * grounding share this table, so both tools bucket off the same key (#330).
   */
  dayKey: string;
  createdAt: string;
  // Breathing-only metrics (null for other session types).
  cycles: number | null;
  durationSeconds: number | null;
  // Grounding-only progress (null for breathing and legacy grounding sessions).
  stepsCompleted: number | null;
  stepsTotal: number | null;
}

export interface MindfulnessSessionInput {
  exerciseName: string;
  durationMinutes: number;
  reflection: string;
  feelingAfter: string | null;
  cycles?: number | null;
  durationSeconds?: number | null;
  stepsCompleted?: number | null;
  stepsTotal?: number | null;
}
