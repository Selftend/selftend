import type { CapturedOffsetMinutes } from "@/src/lib/occurrence-time";

export interface MoodLog {
  id: string;
  userId: string;
  moodScore: number;
  emotions: string[];
  notes: string;
  linkedStrategy: string | null;
  loggedAt: string;
  loggedOffsetMinutes: CapturedOffsetMinutes;
  /**
   * The civil day this log belongs to (`YYYY-MM-DD`), resolved once in the
   * repository. Day-scoped surfaces group on this and never convert `loggedAt`
   * themselves — see the lint guard in eslint.config.js.
   */
  dayKey: string;
  createdAt: string;
  situation: string;
  thoughts: string;
  behaviours: string;
  bodilySensations: string;
}

export interface MoodInput {
  moodScore: number;
  emotions: string[];
  notes: string;
  linkedStrategy: string | null;
  loggedAt?: string; // ISO string; defaults to now if omitted
  /** Null preserves "not captured" on an edit; see the editor's offset handling. */
  loggedOffsetMinutes?: CapturedOffsetMinutes;
  situation: string;
  thoughts: string;
  behaviours: string;
  bodilySensations: string;
}
