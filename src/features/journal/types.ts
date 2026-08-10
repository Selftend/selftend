import type { CapturedOffsetMinutes } from "@/src/lib/occurrence-time";

export interface JournalEntry {
  id: string;
  userId: string;
  title: string;
  body: string;
  occurredAt?: string;
  occurredOffsetMinutes: CapturedOffsetMinutes;
  /**
   * The civil day this entry belongs to (`YYYY-MM-DD`), resolved once in the
   * repository. Day-scoped surfaces group on this and never convert the
   * timestamp themselves — see the lint guard in eslint.config.js (#250).
   */
  dayKey: string;
  createdAt: string;
  updatedAt: string;
}

export type JournalWritingRange = 7 | 30 | 90 | "all";

export type JournalWritingBucketUnit = "day" | "week" | "month" | "year";

export interface JournalWritingBucket {
  /** Inclusive captured-civil-day bounds for this rendered bar. */
  startDayKey: string;
  endDayKey: string;
  /** Exact words across every entry in the bucket. */
  wordCount: number;
  unit: JournalWritingBucketUnit;
  /** Inclusive bounds for the whole selected range, repeated by the RPC. */
  rangeStartDayKey: string;
  rangeEndDayKey: string;
}

export interface JournalInput {
  title: string;
  body: string;
  occurredAt?: string;
  /** Null preserves "not captured" on an edit; see the editor's offset handling. */
  occurredOffsetMinutes?: CapturedOffsetMinutes;
  /** Compatibility alias for older callers; persisted as occurred_at, never created_at. */
  createdAt?: string;
}
