import { parseLocalNoon, startOfDayDaysAgo, toLocalDateKey } from "@/src/utils/date";
import { roundTo1 } from "@/src/utils/number";
import { averageDurationMinutes } from "@/src/features/sleep/summaries";
import { formatHours } from "@/src/features/sleep/format";
import { WIDGET_CATALOG } from "@/src/features/widgets/widget-catalog";
import type {
  AppThemePref,
  BuildContext,
  Snapshot,
  WidgetData,
  WidgetPayload,
} from "@/src/features/widgets/snapshot-types";

type Builder = (data: WidgetData, ctx: BuildContext) => WidgetPayload;

const MOOD_FACES = ["😭", "🙁", "😐", "😊", "😁"]; // score 1..5

export const WIDGET_BUILDERS: Partial<Record<string, Builder>> = {
  mood: (data, { t, dateKey }) => {
    const todayLog = data.moodLogs.find((m) => toLocalDateKey(m.loggedAt) === dateKey);
    const last7 = sinceDays(data.moodLogs, (m) => m.loggedAt, 7, dateKey);
    const avg = last7.length
      ? roundTo1(last7.reduce((s, m) => s + m.moodScore, 0) / last7.length)
      : null;
    return {
      kind: "mood",
      todayFace: todayLog ? MOOD_FACES[todayLog.moodScore - 1] : null,
      glanceLabel:
        avg === null
          ? t("home.widgets.mood.noLogs")
          : t("home.widgets.mood.glance", { avg, count: data.moodLogs.length }),
    };
  },
  today: (data, { t, dateKey }) => {
    const todayMood = data.moodLogs.find((m) => toLocalDateKey(m.loggedAt) === dateKey);
    const scheduledToday = data.activities.filter(
      (a) => a.scheduledAt != null && toLocalDateKey(a.scheduledAt) === dateKey,
    );
    const habitsDone = scheduledToday.filter((a) => a.completedAt !== null).length;
    const sleepAvg = averageDurationMinutes(data.sleepLogs, 7);
    const meditatedToday = data.meditationSessions.some(
      (s) => toLocalDateKey(s.completedAt) === dateKey,
    );
    const gratitudeToday = data.gratitudeEntries.filter(
      (e) => toLocalDateKey(e.loggedAt) === dateKey,
    ).length;
    const journalToday = data.journalEntries.filter(
      (e) => toLocalDateKey(e.createdAt) === dateKey,
    ).length;
    const breathedToday = data.breathingSessions.some(
      (s) => toLocalDateKey(s.completedAt) === dateKey,
    );
    const groundedToday = data.groundingSessions.some(
      (s) => toLocalDateKey(s.completedAt) === dateKey,
    );
    return {
      kind: "today",
      items: [
        {
          key: "mood",
          emoji: "🙂",
          value: todayMood ? MOOD_FACES[todayMood.moodScore - 1] : "–",
          label: t("home.widgets.today.moodLabel"),
          path: todayMood ? "/tools/mood-tracker" : "/tools/mood-tracker/new",
        },
        {
          key: "habits",
          emoji: "✅",
          value: `${habitsDone}/${scheduledToday.length}`,
          label: t("home.widgets.today.habitsLabel"),
          path: "/tools/habits",
        },
        {
          key: "sleep",
          emoji: "🛌",
          value: formatHours(sleepAvg),
          label: t("home.widgets.today.sleepLabel"),
          path: "/tools/sleep",
        },
        {
          key: "meditation",
          emoji: "🧘",
          value: meditatedToday ? "✓" : "–",
          label: t("home.widgets.today.meditationLabel"),
          path: "/tools/meditation",
        },
        {
          key: "gratitude",
          emoji: "💛",
          value: gratitudeToday > 0 ? String(gratitudeToday) : "–",
          label: t("home.widgets.today.gratitudeLabel"),
          path: "/tools/gratitude-log",
        },
        {
          key: "journal",
          emoji: "📓",
          value: journalToday > 0 ? String(journalToday) : "–",
          label: t("home.widgets.today.journalLabel"),
          path: "/tools/journal",
        },
        {
          key: "breathing",
          emoji: "🌬️",
          value: breathedToday ? "✓" : "–",
          label: t("home.widgets.today.breathingLabel"),
          path: "/tools/breathing",
        },
        {
          key: "grounding",
          emoji: "🌍",
          value: groundedToday ? "✓" : "–",
          label: t("home.widgets.today.groundingLabel"),
          path: "/tools/grounding",
        },
      ],
      homePath: "/today",
    };
  },
};

export function buildSnapshot(data: WidgetData, ctx: BuildContext): Snapshot {
  const widgets: Record<string, WidgetPayload> = {};
  for (const entry of WIDGET_CATALOG) {
    const builder = WIDGET_BUILDERS[entry.id];
    if (builder) widgets[entry.id] = builder(data, ctx);
  }
  return {
    schemaVersion: 1,
    locale: ctx.locale,
    generatedAt: new Date().toISOString(),
    dateKey: ctx.dateKey,
    auth: "signed-in",
    appThemePref: ctx.appThemePref,
    widgets,
  };
}

export function buildSignedOutSnapshot(
  locale: string,
  dateKey: string,
  appThemePref: AppThemePref,
): Snapshot {
  return {
    schemaVersion: 1,
    locale,
    generatedAt: new Date().toISOString(),
    dateKey,
    auth: "signed-out",
    appThemePref,
    widgets: {},
  };
}

// --- helpers ---

function sinceDays<T>(rows: T[], at: (r: T) => string, days: number, dateKey: string): T[] {
  const cutoff = startOfDayDaysAgo(days, parseLocalNoon(dateKey));
  return rows.filter((r) => new Date(at(r)) >= cutoff);
}
