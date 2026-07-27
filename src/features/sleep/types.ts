import type { CapturedOffsetMinutes } from "@/src/lib/occurrence-time";

export interface SleepLog {
  id: string;
  userId: string;
  durationMinutes: number;
  quality: number;
  notes: string;
  loggedAt: string;
  loggedOffsetMinutes: CapturedOffsetMinutes;
  /**
   * The civil day this entry belongs to (`YYYY-MM-DD`), resolved once in the
   * repository. Day-scoped surfaces group on this and never convert the
   * timestamp themselves — see the lint guard in eslint.config.js (#250).
   */
  dayKey: string;
  createdAt: string;
}

export interface SleepInput {
  durationMinutes: number;
  quality: number;
  notes: string;
  loggedAt?: string;
  /** Null preserves "not captured" on an edit; see the editor's offset handling. */
  loggedOffsetMinutes?: CapturedOffsetMinutes;
}
