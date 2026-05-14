export type GoalStatus = "active" | "completed" | "paused" | "abandoned";

export interface Goal {
  id: string;
  userId: string;
  title: string;
  description: string;
  lifeDomain: string;
  goalType: string;
  targetDate: string | null;
  status: GoalStatus;
  createdAt: string;
  updatedAt: string;
}

export interface Milestone {
  id: string;
  goalId: string;
  userId: string;
  description: string;
  targetDate: string | null;
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface GoalInput {
  title: string;
  description: string;
  lifeDomain: string;
  goalType: string;
  targetDate: string | null;
}

export interface MilestoneInput {
  description: string;
  targetDate: string | null;
}
