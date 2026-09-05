/**
 * The emotion record's six parts (spec §3.3.1) - the book's "recognising your
 * emotions" slowed down into one column.
 *
 * ☠️ **A column, not a wizard, and the reason is the content.** A person
 * recalling an episode does not recall it in order: the thing they can say
 * first is often what they did, or how it felt afterwards. The thought record
 * learned this (#1381) and this form inherits it - every part on screen at
 * once, filled in any order, validated at save.
 *
 * Pure, and separate from the screen, so the rail's "N of 6 parts filled in"
 * can be tested without mounting a form.
 */
export const EMOTION_RECORD_PARTS = [
  "whatHappened",
  "meaning",
  "feelings",
  "urges",
  "didAndSaid",
  "afterwards",
] as const;

export type EmotionRecordPart = (typeof EMOTION_RECORD_PARTS)[number];

/** The values the rail reads. A subset of the form, named so the caller cannot pass the wrong shape. */
export interface EmotionRecordPartValues {
  whatHappened: string;
  meaning: string;
  primaryEmotions: string[];
  secondaryEmotions: string[];
  bodySensations: string;
  urges: string;
  didAndSaid: string;
  afterwards: string;
}

/**
 * Which parts have something in them. **Feelings** counts as filled once a
 * first feeling is chosen - the two optional halves beside it (feelings about
 * the feeling, and where it sat in the body) do not gate the segment, because
 * a part that only lights when every optional field is answered would read as
 * a demand rather than a summary.
 */
export function filledEmotionRecordParts(
  values: EmotionRecordPartValues,
): Record<EmotionRecordPart, boolean> {
  const filled = (value: string) => value.trim().length > 0;
  return {
    whatHappened: filled(values.whatHappened),
    meaning: filled(values.meaning),
    feelings:
      values.primaryEmotions.length > 0 ||
      values.secondaryEmotions.length > 0 ||
      filled(values.bodySensations),
    urges: filled(values.urges),
    didAndSaid: filled(values.didAndSaid),
    afterwards: filled(values.afterwards),
  };
}

/** An empty record, for a fresh form and for resetting a discarded draft. */
export function emptyEmotionRecordValues(): EmotionRecordPartValues {
  return {
    whatHappened: "",
    meaning: "",
    primaryEmotions: [],
    secondaryEmotions: [],
    bodySensations: "",
    urges: "",
    didAndSaid: "",
    afterwards: "",
  };
}
