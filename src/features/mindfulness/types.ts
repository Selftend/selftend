export interface MindfulnessSession {
  id: string;
  userId: string;
  exerciseName: string;
  durationMinutes: number;
  reflection: string;
  moodAfter: number | null;
  feelingAfter: string | null;
  completedAt: string;
  createdAt: string;
  // Breathing-only metrics (null for other session types).
  cycles: number | null;
  durationSeconds: number | null;
}

export interface MindfulnessSessionInput {
  exerciseName: string;
  durationMinutes: number;
  reflection: string;
  feelingAfter: string | null;
  cycles?: number | null;
  durationSeconds?: number | null;
}
