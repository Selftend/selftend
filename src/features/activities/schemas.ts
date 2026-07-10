import { z } from "zod";

import { userText } from "@/src/lib/zod-fields";

// Messages are i18n KEYS (resolved in the "cbt" namespace at render time via t()),
// not literals - so validation errors follow the in-app language, not English only.
export const activityFormSchema = z.object({
  activityName: userText(2000, { min: 2, message: "activities.validation.activityName" }),
  category: z.enum(["pleasure", "mastery"]),
  paceCategory: z.enum(["physical", "achievement", "connection", "enjoyment"]).nullable(),
  scheduledAt: z.string().nullable(),
  moodBefore: z.number().min(1).max(5).nullable(),
  notes: userText(4000),
});

export type ActivityFormSchema = z.infer<typeof activityFormSchema>;
