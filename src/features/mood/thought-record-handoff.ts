import { DEFAULT_EMOTIONS } from "@/src/constants/emotions";

const BUILTIN_EMOTION_IDS = new Set(DEFAULT_EMOTIONS.map((emotion) => emotion.id));

/**
 * The emotions a check-in can hand to a thought record (#739, decided on #698).
 *
 * Emotions are the ONE exact mapping between the two features - `thought_records.emotions`
 * is a `text[]` over the same id space check-in writes. The note is deliberately not mapped
 * to `situation` (a note is not a situation) and nothing else crosses over.
 *
 * Two filters, both load-bearing:
 *
 * - **Custom emotions are dropped.** The thought-record emotions step renders `EMOTION_GROUPS`
 *   only, so a seeded custom id would arrive checked, invisible, and impossible to uncheck -
 *   it would ride into a saved record the user never agreed to.
 * - **Legacy capitalised ids are lowercased** where that lands on a builtin. Check-in stored
 *   `"Anxious"` before the id-based system; `use-emotion-display.ts` still resolves those, so
 *   an entry written in 2025 must hand off as cleanly as one written today.
 */
export function seedEmotionsForThoughtRecord(emotionIds: readonly string[]): string[] {
  const seeded: string[] = [];

  for (const raw of emotionIds) {
    const id = BUILTIN_EMOTION_IDS.has(raw) ? raw : raw.toLowerCase();
    if (!BUILTIN_EMOTION_IDS.has(id)) continue;
    if (seeded.includes(id)) continue;
    seeded.push(id);
  }

  return seeded;
}

/**
 * Parse the `emotions` route param the check-in handoff writes.
 *
 * Same filtering as the writer, applied again on the read side: the param is a URL the user
 * can edit, and an unknown id would sit checked-but-unrenderable in the wizard.
 */
export function parseSeededEmotionsParam(value: string | string[] | undefined): string[] {
  const raw = Array.isArray(value) ? value[0] : value;
  if (!raw) return [];
  return seedEmotionsForThoughtRecord(raw.split(","));
}
