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
}

export interface MindfulnessSessionInput {
  exerciseName: string;
  durationMinutes: number;
  reflection: string;
  feelingAfter: string | null;
}
