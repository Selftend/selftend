export interface AngerLog {
  id: string;
  userId: string;
  triggerText: string;
  interpretation: string;
  arousalLevel: number;
  urge: string;
  behaviorChosen: string;
  consequence: string;
  timeOutTaken: boolean;
  alternativeInterpretation: string;
  outcomeRating: number | null;
  notes: string;
  createdAt: string;
  updatedAt: string;
}

export interface AngerLogInput {
  triggerText: string;
  interpretation: string;
  arousalLevel: number;
  urge: string;
  behaviorChosen: string;
  consequence: string;
  timeOutTaken: boolean;
  alternativeInterpretation: string;
  outcomeRating: number | null;
  notes: string;
  createdAt?: string;
}
