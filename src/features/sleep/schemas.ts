import { z } from "zod";

import type { SleepWindow } from "@/src/features/sleep/types";

export const SLEEP_DURATION_OPTIONS = [
  240, 270, 300, 330, 360, 390, 420, 450, 480, 510, 540, 570, 600, 630,
] as const;
export const SLEEP_NOTES_MAX = 1000;

/** The database rejects windows past 24 hours; validate before it does. */
export const SLEEP_WINDOW_MAX_MINUTES = 24 * 60;

export const sleepLogSchema = z.object({
  durationMinutes: z.number().int().positive(),
  quality: z.number().int().min(1).max(5),
  notes: z.string().max(SLEEP_NOTES_MAX),
});

/**
 * The decrypted window payload — parsed from the view's `sleep_window` JSON on
 * read, and the shape the write path serializes back. Offsets mirror the
 * ±14-hour bound `validate_occurrence_time` enforces server-side.
 */
export const sleepWindowSchema = z.object({
  startedAt: z.string().refine((v) => !Number.isNaN(Date.parse(v)), "Invalid start"),
  startedOffsetMinutes: z.number().int().min(-840).max(840),
  endedAt: z.string().refine((v) => !Number.isNaN(Date.parse(v)), "Invalid end"),
  endedOffsetMinutes: z.number().int().min(-840).max(840),
});

/**
 * Whole minutes between the two bounds, or null when the order is wrong or
 * either instant is unparseable. Mirrors the database's derivation exactly
 * (`round(epoch / 60)`), because the write path rejects a duration that
 * disagrees with its own window — the two computations must never drift.
 */
export function deriveWindowDurationMinutes(
  window: Pick<SleepWindow, "startedAt" | "endedAt">,
): number | null {
  const started = Date.parse(window.startedAt);
  const ended = Date.parse(window.endedAt);
  if (Number.isNaN(started) || Number.isNaN(ended)) return null;
  const minutes = Math.round((ended - started) / 60_000);
  return minutes >= 1 ? minutes : null;
}
