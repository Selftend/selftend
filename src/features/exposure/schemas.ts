import { z } from "zod";

import { userText } from "@/src/lib/zod-fields";

// Messages are i18n KEYS (resolved in the "cbt" namespace at render time via t()),
// not literals - so validation errors follow the in-app language, not English only.
export const exposureItemSchema = z.object({
  description: userText(2000, { min: 3, message: "exposure.validation.itemDescription" }),
  sudsRating: z.number().min(0).max(100),
});

export const exposureHierarchyFormSchema = z.object({
  title: userText(2000, { min: 3, message: "exposure.validation.title" }),
  anxietyType: userText(2000, { min: 2, message: "exposure.validation.anxietyType" }),
  items: z.array(exposureItemSchema).min(1, "exposure.validation.items"),
});

export type ExposureHierarchyFormSchema = z.infer<typeof exposureHierarchyFormSchema>;

export const exposureSessionFormSchema = z.object({
  preSuds: z.number().min(0).max(100),
  postSuds: z.number().min(0).max(100),
  durationMinutes: z.number().min(0),
  safetyBehaviorsUsed: z.boolean(),
  safetyBehaviorDescription: userText(4000),
  notes: userText(4000),
});
