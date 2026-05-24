export type WorryCategory = "hypothetical" | "real_problem";

export interface WorryEntry {
  id: string;
  userId: string;
  worryStatement: string;
  worryCategory: WorryCategory;
  probabilityEstimate: number | null;
  evidenceFor: string[];
  evidenceAgainst: string[];
  copingStatement: string;
  actionSteps: string[];
  resolved: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface WorryEntryInput {
  worryStatement: string;
  worryCategory: WorryCategory;
  probabilityEstimate: number | null;
  evidenceFor: string[];
  evidenceAgainst: string[];
  copingStatement: string;
  actionSteps: string[];
  createdAt?: string;
}
