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
 */
export function selectRecordTitle(
  record: Pick<ThoughtRecord, "nats" | "situation">,
  fallback: string,
): string {
  return resolveHotThought(record.nats)?.text.trim() || record.situation.trim() || fallback;
}
