import type { ThoughtRecordFormSchema } from "@/src/features/cbt/schemas";
import { hasAnyThought } from "@/src/features/cbt/thought-record-form";

/**
 * The six parts of the thought-record column, in the order they appear down
 * the page. They are PARTS, not steps: nothing here has to be done before
 * anything else, and the rail names them rather than counting them (#1381).
 *
 * This module used to define the wizard's eight steps and their per-step
 * validation field map; the column validates at save, so the field map's job
 * is now the rail's - saying which fields make a part count as filled.
 *
 * Patterns sit BEFORE evidence, against both the shipped step order and the
 * drawn five-stop rail: naming the pattern is what makes the evidence
 * findable (#1224). "Thoughts" covers the NATs list AND the hot-thought
 * choice - two screens in the wizard, one question on the rail.
 */
export const THOUGHT_RECORD_PARTS = [
  "situation",
  "thoughts",
  "feelings",
  "patterns",
  "evidence",
  "balanced",
] as const;

export type ThoughtRecordPart = (typeof THOUGHT_RECORD_PARTS)[number];

/**
 * Which schema fields belong to which part. Exported for the coverage test:
 * a field added to the schema and forgotten here could be filled without the
 * rail ever saying so.
 */
export const THOUGHT_RECORD_PART_FIELDS: Record<
  ThoughtRecordPart,
  readonly (keyof ThoughtRecordFormSchema)[]
> = {
  situation: ["situation"],
  thoughts: ["nats"],
  feelings: ["emotions", "emotionIntensityBefore"],
  patterns: ["distortions"],
  evidence: ["evidenceFor", "evidenceAgainst"],
  balanced: ["balancedThought", "beliefAfter", "emotionIntensityAfter", "outcomeNotes"],
};

function hasEvidenceLine(lines: string[]): boolean {
  // The evidence textareas split on newlines without trimming ("" becomes
  // [""]), so presence means a non-blank LINE, not a non-empty array.
  return lines.some((line) => line.trim().length > 0);
}

/**
 * Which parts hold something the user put there.
 *
 * ☠️ Per part, never a prefix. A prefix count ("the furthest part reached")
 * lies the moment the form is filled out of order - which is the whole point
 * of a column - and it would report a form with only the last part filled as
 * finished. Each part answers for itself and nothing else (#1380's rule).
 *
 * Nothing in this form arrives pre-answered at a database default, so unlike
 * the defusion column there is no null-until-answered dance here. The one
 * seeded value - emotions handed over from a mood check-in (#739) - IS the
 * user's own answer, picked by hand in the other form, so it counts.
 */
export function filledThoughtRecordParts(
  values: ThoughtRecordFormSchema,
): Record<ThoughtRecordPart, boolean> {
  return {
    situation: values.situation.trim().length > 0,
    // The hot-thought flag alone can never light this: a flag only exists on a
    // NAT, and a NAT only exists once the user wrote its text.
    thoughts: hasAnyThought(values.nats),
    feelings: values.emotions.length > 0 || values.emotionIntensityBefore !== null,
    patterns: values.distortions.length > 0,
    evidence: hasEvidenceLine(values.evidenceFor) || hasEvidenceLine(values.evidenceAgainst),
    balanced:
      values.balancedThought.trim().length > 0 ||
      // `beliefAfter` is `.nullish()`: a draft from before the field existed
      // restores with the key absent, which is as unanswered as null.
      values.beliefAfter != null ||
      values.emotionIntensityAfter !== null ||
      values.outcomeNotes.trim().length > 0,
  };
}
