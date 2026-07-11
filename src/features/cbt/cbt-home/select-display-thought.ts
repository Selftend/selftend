import type { ThoughtRecord } from "@/src/features/cbt/types";

export interface DisplayThought {
  natText: string;
  balancedThought: string;
}

/**
 * Picks the text to surface for a thought record on the CBT home screen: the hot
 * thought if one is flagged, otherwise the first NAT, otherwise an empty string.
 * Mirrors the inline selection previously in the recent-thought-record block.
 */
export function selectDisplayThought(record: ThoughtRecord): DisplayThought {
  const natText = (record.nats.find((n) => n.isHotThought) ?? record.nats[0])?.text ?? "";
  return {
    natText,
    balancedThought: record.balancedThought,
  };
}
