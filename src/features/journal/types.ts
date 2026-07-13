export interface JournalEntry {
  id: string;
  userId: string;
  title: string;
  body: string;
  occurredAt?: string;
  occurredOffsetMinutes?: number;
  createdAt: string;
  updatedAt: string;
}

export interface JournalInput {
  title: string;
  body: string;
  occurredAt?: string;
  occurredOffsetMinutes?: number;
  /** Compatibility alias for older callers; persisted as occurred_at, never created_at. */
  createdAt?: string;
}
