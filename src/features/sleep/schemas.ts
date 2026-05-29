import { z } from "zod";

export const SLEEP_DURATION_OPTIONS = [
  240, 270, 300, 330, 360, 390, 420, 450, 480, 510, 540, 570, 600, 630,
] as const;
export const SLEEP_NOTES_MAX = 1000;

export const sleepLogSchema = z.object({
  durationMinutes: z.number().int().positive(),
  quality: z.number().int().min(1).max(5),
  notes: z.string().max(SLEEP_NOTES_MAX),
});
