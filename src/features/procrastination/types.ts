export type TaskStatus = "active" | "completed" | "abandoned";

export interface ProcrastinationTask {
  id: string;
  userId: string;
  taskDescription: string;
  avoidanceReason: string;
  fearThought: string;
  challengedThought: string;
  deadline: string | null;
  reward: string;
  status: TaskStatus;
  createdAt: string;
  updatedAt: string;
}

export interface TaskStep {
  id: string;
  taskId: string;
  userId: string;
  description: string;
  estimatedMinutes: number | null;
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ProcrastinationTaskInput {
  taskDescription: string;
  avoidanceReason: string;
  fearThought: string;
  challengedThought: string;
  deadline: string | null;
  reward: string;
}

export interface TaskStepInput {
  description: string;
  estimatedMinutes: number | null;
}
