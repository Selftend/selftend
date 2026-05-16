import { z } from "zod";

export const GRATITUDE_ITEM_MAX = 240;
export const GRATITUDE_NOTE_MAX = 2000;
export const GRATITUDE_ITEM_COUNT = 5;
export const GRATITUDE_LIFE_ITEM_COUNT = 3;
export const GRATITUDE_EVENT_COUNT = 3;

const nonEmptyString = z
  .string()
  .max(GRATITUDE_ITEM_MAX)
  .refine((v) => v.trim().length > 0, { message: "Cannot be empty" });

export const gratitudeEntrySchema = z.object({
  items: z.array(nonEmptyString).min(1).max(GRATITUDE_ITEM_COUNT),
  note: z.string().max(GRATITUDE_NOTE_MAX),
});

export type GratitudeEntrySchema = z.infer<typeof gratitudeEntrySchema>;
