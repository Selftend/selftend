export interface CoreBelief {
  id: string;
  userId: string;
  beliefStatement: string;
  triggeringSituations: string[];
  evidenceFor: string[];
  evidenceAgainst: string[];
  alternativeBelief: string;
  originalBeliefStrength: number;
  alternativeBeliefStrength: number;
  reinforcementPlan: string;
  nextReviewDate: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CoreBeliefInput {
  beliefStatement: string;
  triggeringSituations: string[];
  evidenceFor: string[];
  evidenceAgainst: string[];
  alternativeBelief: string;
  originalBeliefStrength: number;
  alternativeBeliefStrength: number;
  reinforcementPlan: string;
  nextReviewDate: string | null;
}
