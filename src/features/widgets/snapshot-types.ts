/** Minimal i18next-compatible translate fn (so builders stay pure & testable). */
export type Translate = (key: string, opts?: Record<string, unknown>) => string;

export type AppThemePref = "light" | "dark" | "system";

export interface Clickable {
  label: string;
  /** Full in-app deep-link path incl. query params, e.g. "/tools/mood-tracker/new?score=3". */
  path: string;
}

export interface StatItem {
  value: string;
  label: string;
  /** When true, this value is reset to "–" if the snapshot's day != the device's current day. */
  dateScoped?: boolean;
}

export interface StatPayload {
  kind: "stat";
  title: string;
  emoji: string;
  stats: StatItem[];
  badge?: string | null;
  dateKey?: string;
  open: Clickable;
  cta?: Clickable;
}

export interface LauncherPayload {
  kind: "launcher";
  title: string;
  emoji: string;
  chips: Clickable[];
}

export interface PromptPayload {
  kind: "prompt";
  title: string;
  emoji: string;
  body: string;
  open: Clickable;
  cta?: Clickable;
}

export interface ShortcutPayload {
  kind: "shortcut";
  title: string;
  emoji: string;
  description: string;
  cta: Clickable;
}

export interface MoodWidgetPayload {
  kind: "mood";
  /** Emoji of today's latest logged mood, or null if none today. */
  todayFace: string | null;
  /** Pre-localized glance line, e.g. "7-day 3.8 · 12 logs" or "No logs yet". */
  glanceLabel: string;
}

export interface TodayStatItem {
  key: string;
  emoji: string;
  value: string;
  label: string;
  path: string;
}

export interface TodayWidgetPayload {
  kind: "today";
  /** Priority order: mood, habits, sleep, meditation. */
  items: TodayStatItem[];
  homePath: string;
}

export type WidgetPayload =
  | StatPayload
  | LauncherPayload
  | PromptPayload
  | ShortcutPayload
  | MoodWidgetPayload
  | TodayWidgetPayload;

export interface Snapshot {
  schemaVersion: 1;
  locale: string;
  generatedAt: string;
  dateKey: string;
  auth: "signed-in" | "signed-out";
  appThemePref: AppThemePref;
  widgets: Record<string, WidgetPayload>;
}

export interface WidgetData {
  moodLogs: { loggedAt: string; moodScore: number }[];
  sleepLogs: { loggedAt: string; durationMinutes: number; quality: number | null }[];
  meditationSessions: { completedAt: string; durationMinutes: number }[];
  activities: {
    id: string;
    activityName: string;
    scheduledAt: string | null;
    completedAt: string | null;
  }[];
  gratitudeEntries: { loggedAt: string; items: string[] }[];
  journalEntries: { createdAt: string; body: string }[];
  groundingSessions: { completedAt: string; durationMinutes: number }[];
  breathingSessions: { completedAt: string }[];
  committedActions: { id: string; title: string; updatedAt: string }[];
  actionSteps: { actionId: string; isCompleted: boolean }[];
  defusionLogs: { createdAt: string; techniqueUsed: string }[];
}

export interface BuildContext {
  t: Translate;
  ta: Translate;
  locale: string;
  dateKey: string;
  appThemePref: AppThemePref;
}
