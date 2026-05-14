export interface RecoveryPlan {
  id: string;
  userId: string;
  recoveryKeys: string[];
  personalSlogan: string;
  strategyIntegrationNotes: Record<string, string>;
  maintenanceCommitments: string[];
  createdAt: string;
  updatedAt: string;
}

export interface RecoveryPlanInput {
  recoveryKeys: string[];
  personalSlogan: string;
  strategyIntegrationNotes: Record<string, string>;
  maintenanceCommitments: string[];
}

export interface ChallengePlan {
  id: string;
  recoveryPlanId: string;
  userId: string;
  challengeDescription: string;
  copingSteps: string[];
  createdAt: string;
  updatedAt: string;
}

export interface ChallengePlanInput {
  challengeDescription: string;
  copingSteps: string[];
}
