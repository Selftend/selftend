/** Minimal i18next-compatible translate fn (so builders stay pure & testable). */
export type Translate = (key: string, opts?: Record<string, unknown>) => string;

export type AppThemePref = "light" | "dark" | "system";

export interface Clickable {
  label: string;
  /** Full in-app deep-link path incl. query params, e.g. "/tools/check-in/new?score=3". */
  path: string;
}

export interface CardCta {
  label: string;
  /** Full in-app deep-link path incl. query params. */
  path: string;
  /** Material icon name (in-app hyphenated form, e.g. "arrow-forward"). */
  icon?: string;
}

export interface MoodCheckinCardPayload {
  kind: "mood-checkin";
  title: string;
  /** Shown when `today` is null (stale snapshot ⇒ nothing logged today). */
  emptyPrompt: string;
  today: { score: number | null; summary: string } | null;
}

export interface StatTilesCardPayload {
  kind: "stat-tiles";
  title: string;
  tiles: { label: string; value: string; dim?: boolean }[];
  openCta: CardCta;
}

export interface BreathingCardPayload {
  kind: "breathing";
  title: string;
  hint: string;
  startCta: CardCta;
  openCta: CardCta;
  today: { badge: string } | null;
}

export interface StatsCardPayload {
  kind: "stats";
  title: string;
  /** null ⇒ render emptyText instead (grounding with no sessions). */
  stats: { value: string; label: string }[] | null;
  emptyText?: string;
  primaryCta?: CardCta;
  openCta: CardCta;
  today: { badge: string } | null;
}

/**
 * Scheduled CBT behavioural-activation activities for the day. Named "habits" until
 * #330 - the registry id `habits-today` keeps that name because it is a storage key,
 * but nothing here reads habit data.
 */
export interface ActivitiesCardPayload {
  kind: "activities";
  title: string;
  hintText: string;
  allDoneText: string;
  newCta: CardCta;
  openCta: CardCta;
  today: {
    badge: string | null;
    first: { name: string; openLabel: string; path: string } | null;
    scheduled: number;
  } | null;
}

export interface CommittedActionsCardPayload {
  kind: "committed-actions";
  title: string;
  moduleLabel: string;
  actions: { title: string; steps: string | null; path: string }[];
  emptyText: string;
  openCta: CardCta;
}

export interface DefusionCardPayload {
  kind: "defusion";
  title: string;
  moduleLabel: string;
  lastLabel: string;
  technique: string | null;
  tryItText: string;
  cta: CardCta;
}

export interface ShortcutCardPayload {
  kind: "shortcut";
  title: string;
  moduleLabel: string;
  description: string;
  cta: CardCta;
}

export interface PromptCardPayload {
  kind: "prompt";
  title: string;
  moduleLabel: string;
  prompt: string;
  cta: CardCta;
}

export interface ProgrammeCardPayload {
  kind: "programme";
  title: string;
  moduleLabel: string;
  state: "not-enrolled" | "in-progress" | "completed";
  message: string | null;
  goals: { label: string; done: boolean; path: string }[];
  moreGoalsLabel: string | null;
  programmeCta: CardCta;
}

export type CardPayload =
  | MoodCheckinCardPayload
  | StatTilesCardPayload
  | BreathingCardPayload
  | StatsCardPayload
  | ActivitiesCardPayload
  | CommittedActionsCardPayload
  | DefusionCardPayload
  | ShortcutCardPayload
  | PromptCardPayload
  | ProgrammeCardPayload;

/** Launcher-configurable cards; must mirror the in-app WIDGET_REGISTRY ids. */
export const CARD_IDS = [
  "mood-checkin",
  "breathing-suggested",
  "gratitude-latest",
  "meditation-pick",
  "habits-today",
  "self-care",
  "cbt-open-record",
  "act-drop-anchor",
  "act-observing-self",
  "act-choice-point",
  "sleep-latest",
  "cbt-distortion-guide",
  "cbt-programme",
  "act-programme",
  "cbt-worry",
  "cbt-beliefs",
  "cbt-activities",
  "cbt-exposure",
  "cbt-goals",
  "act-committed-actions",
  "act-defusion",
  "act-acceptance-prompt",
  "journal-week",
  "grounding-log",
  "routines-today",
] as const;
export type CardId = (typeof CARD_IDS)[number];

// The legacy StatPayload/LauncherPayload/MoodWidgetPayload/TodayWidgetPayload variants
// (see task-2-report.md DEVIATION note) were only kept alive by resolve-for-today.*
// and diff-snapshots.test.ts fixtures. Task 13 deleted resolve-for-today.* and moved
// diff-snapshots.test.ts fixtures onto CardPayload, so the single-provider card shape
// is now the only widget payload.
export type WidgetPayload = CardPayload;

export interface Snapshot {
  /**
   * 4 since #973 dropped `mood-trend` and the two `-module-shortcut` cards from
   * {@link CARD_IDS}. The launcher reads a stored snapshot only when this
   * matches (`snapshot-store.ts`), so the bump is what stops an Android widget
   * that was configured against a retired card id from rendering it forever.
   */
  schemaVersion: 4;
  locale: string;
  generatedAt: string;
  dateKey: string;
  auth: "signed-in" | "signed-out";
  appThemePref: AppThemePref;
  widgets: Record<string, WidgetPayload>;
  signedOutCard?: { title: string; cta: string };
}

export interface WidgetData {
  /** `dayKey` is the civil day captured at logging time; see #250. */
  moodLogs: { loggedAt: string; dayKey: string; moodScore: number }[];
  sleepLogs: {
    loggedAt: string;
    dayKey: string;
    durationMinutes: number;
    quality: number | null;
  }[];
  meditationSessions: { completedAt: string; dayKey: string; durationMinutes: number }[];
  activities: {
    id: string;
    activityName: string;
    scheduledAt: string | null;
    /** Civil day the activity was planned for; null when nothing is scheduled (#330). */
    scheduledDayKey: string | null;
    completedAt: string | null;
    /** Civil day it was completed on; null while still open (#330). */
    completedDayKey: string | null;
  }[];
  gratitudeEntries: { loggedAt: string; dayKey: string; items: string[] }[];
  journalEntries: { createdAt: string; dayKey: string; body: string }[];
  groundingSessions: { completedAt: string; dayKey: string; durationMinutes: number }[];
  breathingSessions: { completedAt: string; dayKey: string }[];
  committedActions: { id: string; title: string; updatedAt: string }[];
  actionSteps: { actionId: string; isCompleted: boolean }[];
  defusionLogs: { createdAt: string; techniqueUsed: string }[];
  gratitudeEntryCount: number | null;
  /** Exact lifetime journal totals, both null until the server counts arrive (#323);
   *  the journal-week card falls back to its loaded entries while they are. */
  journalEntryCount: number | null;
  journalWordTotal: number | null;
  programmes?: Record<
    "cbt" | "act",
    {
      startedAt: string | null;
      completedAt: string | null;
      phaseIndex: number;
      taskStatuses: { taskKey: string; done: boolean }[];
    }
  >;
}

export interface BuildContext {
  t: Translate;
  ta: Translate;
  tc: Translate;
  locale: string;
  dateKey: string;
  appThemePref: AppThemePref;
}
