import type { CapturedOffsetMinutes } from "@/src/lib/occurrence-time";

import type { GratitudeLevel } from "@/src/features/modules/types";

export interface GratitudeEntry {
  id: string;
  userId: string;
  level: GratitudeLevel;
  items: string[];
  note: string;
  loggedAt: string;
  loggedOffsetMinutes: CapturedOffsetMinutes;
  /**
   * The civil day this entry belongs to (`YYYY-MM-DD`), resolved once in the
   * repository. Day-scoped surfaces group on this and never convert the
   * timestamp themselves — see the lint guard in eslint.config.js (#250).
   */
  dayKey: string;
  createdAt: string;
  updatedAt: string;
  events: string[];
  goodMoment: string;
  missIfGone: string;
  hiddenGood: string;
  lifeItems: string[];
  starred: boolean;
}

export interface GratitudeInput {
  level: GratitudeLevel;
  items: string[];
  note: string;
  loggedAt?: string;
  /** Null preserves "not captured" on an edit; see the editor's offset handling. */
  loggedOffsetMinutes?: CapturedOffsetMinutes;
  events?: string[];
  goodMoment?: string;
  missIfGone?: string;
  hiddenGood?: string;
  lifeItems?: string[];
}
