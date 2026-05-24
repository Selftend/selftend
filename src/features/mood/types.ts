export interface MoodLog {
  id: string;
  userId: string;
  moodScore: number;
  emotions: string[];
  notes: string;
  linkedStrategy: string | null;
  loggedAt: string;
  createdAt: string;
  situation: string;
  thoughts: string;
  behaviours: string;
  bodilySensations: string;
}

export interface MoodInput {
  moodScore: number;
  emotions: string[];
  notes: string;
  linkedStrategy: string | null;
  loggedAt?: string; // ISO string; defaults to now if omitted
  situation: string;
  thoughts: string;
  behaviours: string;
  bodilySensations: string;
}
