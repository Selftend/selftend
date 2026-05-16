export type PlanFrequency = "daily" | "weekly" | "as_needed";

export interface CarePlanItem {
  id: string;
  userId: string;
  title: string;
  description?: string;
  toolId: string;
  moduleId?: string;
  route: string;
  frequency: PlanFrequency;
  reminderEnabled: boolean;
  order: number;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export type CarePlanItemInput = Omit<CarePlanItem, "id" | "userId" | "createdAt" | "updatedAt">;
