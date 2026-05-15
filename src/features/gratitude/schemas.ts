import { z } from "zod";

export const GRATITUDE_ITEM_MAX = 240;
export const GRATITUDE_NOTE_MAX = 2000;
export const GRATITUDE_ITEM_COUNT = 3;

export const gratitudeEntrySchema = z.object({
  items: z
    .array(
      z
        .string()
        .max(GRATITUDE_ITEM_MAX)
        .refine((value) => value.trim().length > 0, {
          message: "Gratitude item cannot be empty",
        }),
    )
    .min(1)
    .max(GRATITUDE_ITEM_COUNT),
  note: z.string().max(GRATITUDE_NOTE_MAX),
});

export type GratitudeEntrySchema = z.infer<typeof gratitudeEntrySchema>;
