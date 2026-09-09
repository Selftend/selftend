import type { CapturedOffsetMinutes } from "@/src/lib/occurrence-time";

/**
 * The DBT module's records (spec docs/modules/dbt-mckay-skills-workbook.md §5).
 *
 * Every dated record carries the offset captured with its instant and the
 * `dayKey` the repository resolved from it once - the module is born in the
 * captured frame, so a surface groups on `dayKey` and never re-derives a day
 * through the viewer's zone (`src/features/dbt/**` sits in the ESLint
 * captured-frame gate).
 */

// ── Coping plan ────────────────────────────────────────────────────────────────

export type CopingPlanSection = "distract" | "soothe" | "remind";
export type CopingPlanItemKind = "pick" | "own";

/**
 * One line on the plan. A pick stores a registry key (never a label) so copy can
 * change under a saved plan; an own line is the person's words, 1–120 characters.
 */
export interface CopingPlanItem {
  id: string;
  section: CopingPlanSection;
  kind: CopingPlanItemKind;
  pickKey?: string;
  text?: string;
  homeOnly: boolean;
  position: number;
}

/** The whole plan, stored as one encrypted document (#1992 §4). */
export interface CopingPlanDocument {
  items: CopingPlanItem[];
  /** 3–6 item ids, in the order the person would try them. */
  fallback: string[];
}

export interface CopingPlan {
  id: string;
  userId: string;
  plan: CopingPlanDocument;
  createdAt: string;
  /** The programme's "touched since the phase began" fact (#1990). */
  updatedAt: string;
}

// ── Sessions ───────────────────────────────────────────────────────────────────

/** Widened per slice; the database CHECK enumerates the same set. */
export type DbtSessionSlug = "muscle-relaxation";
export type DbtSessionVariant = "full" | "short";

export interface DbtSession {
  id: string;
  userId: string;
  sessionSlug: DbtSessionSlug;
  variant: DbtSessionVariant | null;
  durationSeconds: number;
  completedAt: string;
  completedOffsetMinutes: CapturedOffsetMinutes;
  dayKey: string;
  createdAt: string;
  updatedAt: string;
}

export interface DbtSessionInput {
  sessionSlug: DbtSessionSlug;
  variant?: DbtSessionVariant | null;
  durationSeconds: number;
  completedAt: string;
  completedOffsetMinutes: number;
}

// ── Wise mind check-in ─────────────────────────────────────────────────────────

export interface WiseMindCheckin {
  id: string;
  userId: string;
  question: string;
  emotionMind: string;
  reason: string;
  wiseMind: string;
  createdAt: string;
  createdOffsetMinutes: CapturedOffsetMinutes;
  dayKey: string;
  updatedAt: string;
}

export interface WiseMindCheckinInput {
  question: string;
  emotionMind?: string;
  reason?: string;
  wiseMind?: string;
  createdAt: string;
  createdOffsetMinutes: number;
}

// ── Judgement record ───────────────────────────────────────────────────────────

export type JudgementValence = "negative" | "positive";

export interface Judgement {
  id: string;
  userId: string;
  judgement: string;
  restatement: string;
  valence: JudgementValence;
  createdAt: string;
  createdOffsetMinutes: CapturedOffsetMinutes;
  dayKey: string;
  updatedAt: string;
}

export interface JudgementInput {
  judgement: string;
  restatement?: string;
  valence: JudgementValence;
  createdAt: string;
  createdOffsetMinutes: number;
}

// ── Emotion record ─────────────────────────────────────────────────────────────

export interface EmotionRecord {
  id: string;
  userId: string;
  whatHappened: string;
  meaning: string;
  /** Ids on the check-in's emotion id space, custom ids included. */
  primaryEmotions: string[];
  secondaryEmotions: string[];
  /** The check-in's comma-joined free-text chips. */
  bodySensations: string;
  urges: string;
  didAndSaid: string;
  afterwards: string;
  createdAt: string;
  createdOffsetMinutes: CapturedOffsetMinutes;
  dayKey: string;
  updatedAt: string;
}

export interface EmotionRecordInput {
  whatHappened: string;
  meaning?: string;
  primaryEmotions: string[];
  secondaryEmotions?: string[];
  bodySensations?: string;
  urges?: string;
  didAndSaid?: string;
  afterwards?: string;
  createdAt: string;
  createdOffsetMinutes: number;
}

// ── Opposite-action plan ───────────────────────────────────────────────────────

export interface OppositeActionPlan {
  id: string;
  userId: string;
  emotion: string;
  pull: string;
  oppositeAction: string;
  holdFor: string;
  whatShifted: string;
  createdAt: string;
  createdOffsetMinutes: CapturedOffsetMinutes;
  /** The created day - the list groups on it. */
  dayKey: string;
  doneAt: string | null;
  doneOffsetMinutes: CapturedOffsetMinutes;
  /** The DONE day - the programme's, routines' and Looking back's fact (#1988). Null while open. */
  doneDayKey: string | null;
  updatedAt: string;
}

export interface OppositeActionPlanInput {
  emotion: string;
  pull: string;
  oppositeAction: string;
  holdFor?: string;
  createdAt: string;
  createdOffsetMinutes: number;
}

/** The one UPDATE a plan ever takes: Done from its detail, with an optional note. */
export interface OppositeActionDoneInput {
  doneAt: string;
  doneOffsetMinutes: number;
  whatShifted?: string;
}

// ── Script ─────────────────────────────────────────────────────────────────────

export type ScriptWantChanged = "moreOf" | "lessOf" | "stop" | "start";

export interface Script {
  id: string;
  userId: string;
  situation: string;
  wantChanged: ScriptWantChanged | null;
  iThink: string;
  emotion: string | null;
  iFeel: string;
  iWant: string;
  selfCare: string;
  /** 0–100 in steps of ten; read by the list's order only (#1989). */
  difficulty: number | null;
  whenWhere: string;
  howItWent: string;
  createdAt: string;
  createdOffsetMinutes: CapturedOffsetMinutes;
  dayKey: string;
  doneAt: string | null;
  doneOffsetMinutes: CapturedOffsetMinutes;
  doneDayKey: string | null;
  updatedAt: string;
}

export interface ScriptInput {
  situation: string;
  wantChanged?: ScriptWantChanged | null;
  iThink: string;
  emotion?: string | null;
  iFeel?: string;
  iWant: string;
  selfCare?: string;
  difficulty?: number | null;
  whenWhere?: string;
  createdAt: string;
  createdOffsetMinutes: number;
}

/** The one UPDATE a script ever takes: Done from its card, with an optional note. */
export interface ScriptDoneInput {
  doneAt: string;
  doneOffsetMinutes: number;
  howItWent?: string;
}
