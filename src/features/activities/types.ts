export type ActivityCategory = "pleasure" | "mastery";

export type PACECategory = "physical" | "achievement" | "connection" | "enjoyment";

export interface ActivityLog {
  id: string;
  userId: string;
  activityName: string;
  category: ActivityCategory;
  paceCategory: PACECategory | null;
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
  paceCategory: PACECategory | null;
  scheduledAt: string | null;
  moodBefore: number | null;
  notes: string;
}
