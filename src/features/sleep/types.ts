export interface SleepLog {
  id: string;
  userId: string;
  durationMinutes: number;
  quality: number;
  notes: string;
  loggedAt: string;
  createdAt: string;
}

export interface SleepInput {
  durationMinutes: number;
  quality: number;
  notes: string;
  loggedAt?: string;
}
