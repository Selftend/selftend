import type { ThoughtRecordFormSchema } from "@/src/features/cbt/schemas";
import type { NegativeAutomaticThought } from "@/src/features/cbt/types";
import type { OccurrenceTime } from "@/src/lib/occurrence-time";

export const defaultValues: ThoughtRecordFormSchema = {
  situation: "",
  nats: [],
  emotions: [],
  emotionIntensityBefore: null,
  distortions: [],
  evidenceFor: [],
  evidenceAgainst: [],
  balancedThought: "",
  emotionIntensityAfter: null,
  outcomeNotes: "",
};

export function listToText(values: string[]) {
  return values.join("\n");
}

// NOTE: preserves exact semantics - "" splits to [""] (a single empty element,
// not []). Blank-line cleanup happens later via cleanList at save time.
export function textToList(value: string) {
  return value.split("\n");
}

export function cleanList(values: string[]) {
  return values.map((value) => value.trim()).filter((value) => value.length > 0);
}

export type ThoughtRecordStepKey =
  | "situation"
  | "nats"
  | "hotThought"
  | "emotions"
  | "evidence"
  | "distortions"
  | "balancedThought"
  | "outcome";

// Returns the index of the NAT with the highest beliefRating (null treated as
// -1), first-on-ties, and 0 for an empty list.
export function selectHotThoughtIndex(nats: NegativeAutomaticThought[]): number {
  let bestIndex = 0;
  for (let i = 1; i < nats.length; i++) {
    if ((nats[i].beliefRating ?? -1) > (nats[bestIndex].beliefRating ?? -1)) {
      bestIndex = i;
    }
  }
  return bestIndex;
}

// Returns a new array with exactly the NAT at `index` flagged as the hot thought.
export function markHotThought(
  nats: NegativeAutomaticThought[],
  index: number,
): NegativeAutomaticThought[] {
  return nats.map((n, i) => ({ ...n, isHotThought: i === index }));
}

// Returns the flagged NAT, falling back to the first NAT when none is flagged.
export function resolveHotThought(
  nats: NegativeAutomaticThought[],
): NegativeAutomaticThought | undefined {
  return nats.find((n) => n.isHotThought) ?? nats[0];
}

export function hasAnyThought(nats: NegativeAutomaticThought[]): boolean {
  return nats.some((n) => n.text.trim().length > 0);
}

// Sanitizes the raw form values into the save input: trims evidence lists and
// outcome notes, and attaches the occurrence ONLY in create mode (recordId
// null), so editing never overwrites the original timestamp - nor the captured
// offset that fixes the record's civil day (#330). The instant and the offset
// travel together, from one `occurrenceTimeFromDate` call: they describe one
// moment, so they can never be sourced from two separate clock readings.
export function buildThoughtRecordInput(
  values: ThoughtRecordFormSchema,
  { recordId, occurrence }: { recordId: string | null; occurrence: OccurrenceTime },
): ThoughtRecordFormSchema & { createdAt?: string; createdOffsetMinutes?: number } {
  const input: ThoughtRecordFormSchema = {
    ...values,
    evidenceAgainst: cleanList(values.evidenceAgainst),
    evidenceFor: cleanList(values.evidenceFor),
    outcomeNotes: values.outcomeNotes.trim(),
  };
  return !recordId
    ? {
        ...input,
        createdAt: occurrence.occurredAt,
        createdOffsetMinutes: occurrence.occurredOffsetMinutes,
      }
    : input;
}
