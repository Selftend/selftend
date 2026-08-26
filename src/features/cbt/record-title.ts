import type { NegativeAutomaticThought } from "@/src/features/cbt/types";

/**
 * The one thought a record is headlined by: the hot thought, or the first one
 * when no flag was ever set (legacy records predate the derived flag, #1381).
 *
 * Exported beside the title chain so the detail screen can keep its thoughts
 * row to the OTHER thoughts - the headline one already reads as the H1, and
 * repeating it as a row would show one fact twice (#1384).
 */
export function getTitleThought(
  nats: NegativeAutomaticThought[],
): NegativeAutomaticThought | undefined {
  return nats.find((n) => n.isHotThought) ?? nats[0];
}

/**
 * The single heading fallback chain for a thought record - hot thought, first
 * thought, situation, then the caller's generic fallback. The history list and
 * the detail screen both read it from here so the two can never disagree about
 * what a record is called (#1228 decision 6: reuse the chain, don't write a
 * second).
 */
export function getRecordTitle(
  record: { nats: NegativeAutomaticThought[]; situation: string },
  fallback: string,
) {
  const titleNat = getTitleThought(record.nats);
  return titleNat?.text.trim() || record.situation.trim() || fallback;
}
