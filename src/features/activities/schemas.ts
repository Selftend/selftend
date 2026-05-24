import { z } from "zod";

export const activityFormSchema = z.object({
  activityName: z.string().trim().min(2, "Name the activity."),
  category: z.enum(["pleasure", "mastery"]),
  paceCategory: z.enum(["physical", "achievement", "connection", "enjoyment"]).nullable(),
  scheduledAt: z.string().nullable(),
  moodBefore: z.number().min(1).max(5).nullable(),
  notes: z.string(),
});

export type ActivityFormSchema = z.infer<typeof activityFormSchema>;
