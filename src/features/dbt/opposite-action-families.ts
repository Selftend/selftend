/**
 * The per-emotion guidance behind the opposite-action plan (spec §3.3.2, from
 * the book's 8.3 table).
 *
 * Four families, keyed off the check-in's own built-in emotion ids. The lines
 * render as HINTS under the two text fields once a feeling is picked, and in
 * full on the emotion-regulation learn page.
 *
 * ☠️ **Hints, never rules.** No `should` anywhere in this copy, and nothing
 * branches on the answer: picking `angry` changes which sentence is shown and
 * nothing else. The tool does not decide whether a feeling "fits the facts" -
 * that judgement is the person's, and opening the tool is them making it.
 *
 * A pleasant built-in or a custom emotion resolves to NO family, and the hints
 * simply do not render. Guessing at guidance for a word the app has never seen
 * would be inventing advice about a feeling it cannot know.
 */
export type OppositeActionFamily = "anger" | "fear" | "sadness" | "guiltShame";

const FAMILY_BY_EMOTION: Record<string, OppositeActionFamily> = {
  angry: "anger",
  frustrated: "anger",
  irritated: "anger",
  anxious: "fear",
  fearful: "fear",
  overwhelmed: "fear",
  sad: "sadness",
  lonely: "sadness",
  hopeless: "sadness",
  numb: "sadness",
  ashamed: "guiltShame",
  guilty: "guiltShame",
};

/** The family a feeling belongs to, or null when the app has no line for it. */
export function familyForEmotion(
  emotionId: string | null | undefined,
): OppositeActionFamily | null {
  if (!emotionId) return null;
  return FAMILY_BY_EMOTION[emotionId] ?? null;
}

/** The four families, in the order the learn page lists them. */
export const OPPOSITE_ACTION_FAMILIES: OppositeActionFamily[] = [
  "anger",
  "fear",
  "sadness",
  "guiltShame",
];

/** Every built-in id that carries a hint - the set the tests pin. */
export const EMOTIONS_WITH_GUIDANCE = Object.keys(FAMILY_BY_EMOTION);
