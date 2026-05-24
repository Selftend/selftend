export interface SelfCareLog {
  id: string;
  userId: string;
  logDate: string;
  exerciseDone: boolean;
  exerciseMinutes: number | null;
  exerciseType: string;
  mealsStructured: number | null;
  emotionalEating: boolean;
  socialConnectionMade: boolean;
  socialNotes: string;
  meaningfulActivity: string;
  createdAt: string;
  updatedAt: string;
}

export interface SelfCareLogInput {
  logDate: string;
  exerciseDone: boolean;
  exerciseMinutes: number | null;
  exerciseType: string;
  mealsStructured: number | null;
  emotionalEating: boolean;
  socialConnectionMade: boolean;
  socialNotes: string;
  meaningfulActivity: string;
}
