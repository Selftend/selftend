export type ActivityCategory = "pleasure" | "mastery";

export interface ActivityLog {
  id: string;
  userId: string;
  activityName: string;
  category: ActivityCategory;
  scheduledAt: string | null;
  completedAt: string | null;
  moodBefore: number | null;
  moodAfter: number | null;
  notes: string;
  createdAt: string;
  updatedAt: string;
}

export interface ActivityInput {
  activityName: string;
  category: ActivityCategory;
  scheduledAt: string | null;
  moodBefore: number | null;
  notes: string;
}
