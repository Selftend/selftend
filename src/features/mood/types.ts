export interface MoodLog {
  id: string;
  userId: string;
  moodScore: number;
  emotions: string[];
  notes: string;
  linkedStrategy: string | null;
  loggedAt: string;
  createdAt: string;
}

export interface MoodInput {
  moodScore: number;
  emotions: string[];
  notes: string;
  linkedStrategy: string | null;
}
