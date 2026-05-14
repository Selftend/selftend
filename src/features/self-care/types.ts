export interface SelfCareLog {
  id: string;
  userId: string;
  logDate: string;
  sleepHours: number | null;
  sleepQuality: number | null;
  exerciseDone: boolean;
  exerciseMinutes: number | null;
  exerciseType: string;
  mealsStructured: number | null;
  emotionalEating: boolean;
  socialConnectionMade: boolean;
  socialNotes: string;
  meaningfulActivity: string;
  gratitude: string[];
  createdAt: string;
  updatedAt: string;
}

export interface SelfCareLogInput {
  logDate: string;
  sleepHours: number | null;
  sleepQuality: number | null;
  exerciseDone: boolean;
  exerciseMinutes: number | null;
  exerciseType: string;
  mealsStructured: number | null;
  emotionalEating: boolean;
  socialConnectionMade: boolean;
  socialNotes: string;
  meaningfulActivity: string;
  gratitude: string[];
}
