import { resolveHotThought } from "@/src/features/cbt/thought-record-form";
import type { ThoughtRecord } from "@/src/features/cbt/types";

/**
 * The one title chain for a thought record: the hot thought, else the
 * highest-rated one (`resolveHotThought`'s own fallback), else the situation the
 * record was written about, else a placeholder.
 *
 * There used to be two chains - the history screen's `getRecordTitle` walked
 * `find(isHotThought) ?? nats[0]` and then the situation, while the overview's
 * `selectDisplayThought` stopped at `nats[0]` and rendered an empty title for a
 * record with no thoughts. They disagreed on both ends. One row grammar (#1386)
 * gets one chain, and `resolveHotThought` is the one the form, the completion
 * screen and the detail screen already use, so a record's headline is now the
 * same sentence everywhere it appears.
 *
 * ⚠️ **One visible behaviour change, stated rather than slipped in:** for a
 * record with several thoughts and none flagged, the history screen used to
 * title itself from the FIRST thought and now titles itself from the
 * highest-rated one. That set is small by construction - the form auto-flags a
 * hot thought on save, so an unflagged record is a legacy or hand-written row -
 * and the new answer is the one every other screen showing that record already
 * gives.
 */
export function selectRecordTitle(
  record: Pick<ThoughtRecord, "nats" | "situation">,
  fallback: string,
): string {
  return resolveHotThought(record.nats)?.text.trim() || record.situation.trim() || fallback;
}
