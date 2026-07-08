import { parseLocalNoon, startOfDayDaysAgo, toLocalDateKey } from "@/src/utils/date";
import { roundTo1 } from "@/src/utils/number";
import {
  averageDurationMinutes,
  averageQuality,
  loggedOnDate,
} from "@/src/features/sleep/summaries";
import { formatHours } from "@/src/features/sleep/format";
import { countWords } from "@/src/features/journal/word-count";
import { answeredCount } from "@/src/features/gratitude/questions";
import {
  CARD_IDS,
  type CardId,
  type AppThemePref,
  type BuildContext,
  type CardPayload,
  type Snapshot,
  type Translate,
  type WidgetData,
} from "@/src/features/widgets/snapshot-types";

type CardBuilder = (data: WidgetData, ctx: BuildContext) => CardPayload;

const openCta = (t: Translate, path: string) => ({ label: t("today.dashboard.open"), path });

/** CBT shortcut cards: icon/tint live in the replica registry; text + route here. */
const CBT_SHORTCUTS: {
  id: CardId;
  titleKey: string;
  descKey: string;
  ctaKey: string;
  path: string;
}[] = [
  {
    id: "self-care",
    titleKey: "home.widgets.selfCare.title",
    descKey: "home.widgets.selfCare.desc",
    ctaKey: "today.dashboard.logSelfCare",
    path: "/modules/cbt/self-care",
  },
  {
    id: "cbt-open-record",
    titleKey: "home.widgets.cbtOpenRecord.title",
    descKey: "home.widgets.cbtOpenRecord.metaDesc",
    ctaKey: "home.widgets.cbtOpenRecord.shortcutCta",
    path: "/modules/cbt/new",
  },
  {
    id: "cbt-distortion-guide",
    titleKey: "home.widgets.cbtDistortionGuide.title",
    descKey: "home.widgets.cbtDistortionGuide.metaDesc",
    ctaKey: "home.widgets.cbtDistortionGuide.shortcutCta",
    path: "/modules/cbt/learn",
  },
  {
    id: "cbt-programme",
    titleKey: "home.widgets.cbtProgramme.title",
    descKey: "home.widgets.cbtProgramme.metaDesc",
    ctaKey: "home.widgets.cbtProgramme.shortcutCta",
    path: "/modules/cbt",
  },
  {
    id: "cbt-worry",
    titleKey: "home.widgets.cbtWorry.title",
    descKey: "home.widgets.cbtWorry.metaDesc",
    ctaKey: "home.widgets.cbtWorry.shortcutCta",
    path: "/modules/cbt/worry/new",
  },
  {
    id: "cbt-beliefs",
    titleKey: "home.widgets.cbtBeliefs.title",
    descKey: "home.widgets.cbtBeliefs.metaDesc",
    ctaKey: "home.widgets.cbtBeliefs.shortcutCta",
    path: "/modules/cbt/beliefs/new",
  },
  {
    id: "cbt-activities",
    titleKey: "home.widgets.cbtActivities.title",
    descKey: "home.widgets.cbtActivities.metaDesc",
    ctaKey: "home.widgets.cbtActivities.shortcutCta",
    path: "/modules/cbt/activities/new",
  },
  {
    id: "cbt-exposure",
    titleKey: "home.widgets.cbtExposure.title",
    descKey: "home.widgets.cbtExposure.metaDesc",
    ctaKey: "home.widgets.cbtExposure.shortcutCta",
    path: "/modules/cbt/exposure/new",
  },
  {
    id: "cbt-goals",
    titleKey: "home.widgets.cbtGoals.title",
    descKey: "home.widgets.cbtGoals.metaDesc",
    ctaKey: "home.widgets.cbtGoals.shortcutCta",
    path: "/modules/cbt/goals/new",
  },
];

const ACT_PROMPTS: {
  id: CardId;
  titleKey: string;
  promptKey: string;
  ctaKey: string;
  path: string;
}[] = [
  {
    id: "act-drop-anchor",
    titleKey: "home.widgets.actDropAnchor.title",
    promptKey: "home.widgets.actDropAnchor.prompt",
    ctaKey: "home.widgets.actDropAnchor.cta",
    path: "/modules/act/connection/drop-anchor",
  },
  {
    id: "act-observing-self",
    titleKey: "home.widgets.actObservingSelf.title",
    promptKey: "home.widgets.actObservingSelf.prompt",
    ctaKey: "home.widgets.actObservingSelf.cta",
    path: "/modules/act/observing-self",
  },
  {
    id: "act-choice-point",
    titleKey: "home.widgets.actChoicePoint.title",
    promptKey: "home.widgets.actChoicePoint.prompt",
    ctaKey: "home.widgets.actChoicePoint.cta",
    path: "/modules/act/choice-point/new",
  },
  {
    id: "act-acceptance-prompt",
    titleKey: "home.widgets.actAcceptancePrompt.title",
    promptKey: "home.widgets.actAcceptancePrompt.prompt",
    ctaKey: "home.widgets.actAcceptancePrompt.practice",
    path: "/modules/act/expansion",
  },
];

const CARD_BUILDERS: Partial<Record<CardId, CardBuilder>> = {
  "mood-checkin": (data, { t, locale, dateKey }) => {
    const todayLogs = data.moodLogs
      .filter((m) => toLocalDateKey(m.loggedAt) === dateKey)
      .sort((a, b) => (a.loggedAt < b.loggedAt ? 1 : -1));
    const emptyPrompt = t("home.widgets.moodCheckin.emptyPrompt");
    let summary = emptyPrompt;
    if (todayLogs.length > 0) {
      const time = new Intl.DateTimeFormat(locale, { hour: "numeric", minute: "2-digit" }).format(
        new Date(todayLogs[0].loggedAt),
      );
      summary = `${t("home.widgets.moodCheckin.loggedSummary", { count: todayLogs.length })} · ${t(
        "home.widgets.moodCheckin.lastAt",
        { time },
      )}`;
    }
    return {
      kind: "mood-checkin",
      title: t("home.widgets.moodCheckin.title"),
      emptyPrompt,
      today: { score: todayLogs[0]?.moodScore ?? null, summary },
    };
  },

  "mood-trend": (data, { t, dateKey }) => {
    const last7 = sinceDays(data.moodLogs, (m) => m.loggedAt, 7, dateKey);
    const avg = last7.length
      ? roundTo1(last7.reduce((s, m) => s + m.moodScore, 0) / last7.length)
      : null;
    return {
      kind: "stat-tiles",
      title: t("home.widgets.moodTrend.title"),
      tiles: [
        {
          label: t("today.moodSnapshot.sevenDay"),
          value: avg === null ? "-" : avg.toFixed(1),
          dim: avg === null,
        },
        {
          label: t("today.moodSnapshot.entries"),
          value: String(data.moodLogCount ?? data.moodLogs.length),
        },
      ],
      openCta: openCta(t, "/tools/mood-tracker"),
    };
  },

  "breathing-suggested": (data, { t, locale, dateKey }) => {
    const sorted = [...data.breathingSessions].sort((a, b) =>
      a.completedAt < b.completedAt ? 1 : -1,
    );
    const doneToday = sorted.some((s) => toLocalDateKey(s.completedAt) === dateKey);
    const last = sorted[0];
    return {
      kind: "breathing",
      title: t("plan.wizard.toolBreathing"),
      hint: last
        ? t("today.dashboard.lastSession", {
            date: new Intl.DateTimeFormat(locale, { dateStyle: "medium" }).format(
              new Date(last.completedAt),
            ),
          })
        : t("today.dashboard.breathingHint"),
      startCta: {
        label: t("today.dashboard.startBreathing"),
        path: "/tools/breathing/session",
        icon: "air",
      },
      openCta: openCta(t, "/tools/breathing"),
      today: doneToday ? { badge: t("today.dashboard.doneToday") } : null,
    };
  },

  "gratitude-latest": (data, { t, dateKey }) => {
    const todayCount = data.gratitudeEntries.filter(
      (e) => toLocalDateKey(e.loggedAt) === dateKey,
    ).length;
    const recentItems = data.gratitudeEntries.reduce((sum, e) => sum + answeredCount(e.items), 0);
    return {
      kind: "stats",
      title: t("plan.wizard.toolGratitude"),
      stats: [
        {
          value: String(data.gratitudeEntryCount ?? data.gratitudeEntries.length),
          label: t("home.widgets.gratitudeLatest.entriesLabel"),
        },
        { value: String(recentItems), label: t("home.widgets.gratitudeLatest.itemsLabel") },
      ],
      primaryCta: {
        label: t("today.dashboard.addEntry"),
        path: "/tools/gratitude-log/new",
        icon: "add",
      },
      openCta: openCta(t, "/tools/gratitude-log"),
      today:
        todayCount > 0 ? { badge: t("today.dashboard.countToday", { count: todayCount }) } : null,
    };
  },

  "meditation-pick": (data, { t, dateKey }) => {
    const doneToday = data.meditationSessions.some(
      (s) => toLocalDateKey(s.completedAt) === dateKey,
    );
    const minutes = data.meditationSessions.reduce((sum, s) => sum + s.durationMinutes, 0);
    return {
      kind: "stats",
      title: t("plan.wizard.toolMeditation"),
      stats: [
        {
          value: String(data.meditationSessions.length),
          label: t("home.widgets.meditationPick.sessionsLabel"),
        },
        { value: String(minutes), label: t("home.widgets.meditationPick.minutesLabel") },
      ],
      primaryCta: {
        label: t("today.dashboard.startSession"),
        path: "/tools/meditation",
        icon: "self-improvement",
      },
      openCta: openCta(t, "/tools/meditation"),
      today: doneToday ? { badge: t("today.dashboard.doneToday") } : null,
    };
  },

  "habits-today": (data, { t, dateKey }) => {
    const scheduled = data.activities.filter(
      (a) => a.scheduledAt != null && toLocalDateKey(a.scheduledAt) === dateKey,
    );
    const done = scheduled.filter((a) => a.completedAt !== null).length;
    const first = scheduled.find((a) => !a.completedAt) ?? null;
    return {
      kind: "habits",
      title: t("plan.wizard.toolHabits"),
      hintText: t("today.dashboard.habitsHint"),
      allDoneText: t("today.dashboard.habitsAllDone"),
      newCta: { label: t("today.dashboard.newHabit"), path: "/tools/habits/new", icon: "add" },
      openCta: openCta(t, "/tools/habits"),
      today: {
        badge:
          scheduled.length > 0
            ? t("today.dashboard.habitsProgress", { done, total: scheduled.length })
            : null,
        first: first
          ? {
              name: first.activityName,
              openLabel: t("today.plan.open"),
              path: `/modules/cbt/activities/${first.id}`,
            }
          : null,
        scheduled: scheduled.length,
      },
    };
  },

  "sleep-latest": (data, { t, dateKey }) => {
    const avgDuration = averageDurationMinutes(data.sleepLogs, 7);
    const qualityLogs = data.sleepLogs.filter(
      (l): l is { loggedAt: string; durationMinutes: number; quality: number } =>
        l.quality !== null,
    );
    const avgQuality = averageQuality(qualityLogs, 7);
    return {
      kind: "stats",
      title: t("home.widgets.sleepLatest.title"),
      stats: [
        {
          value: formatHours(avgDuration),
          label: t("home.widgets.sleepLatest.sevenNightAvgLabel"),
        },
        {
          value: avgQuality !== null ? avgQuality.toFixed(1) : "-",
          label: t("home.widgets.sleepLatest.qualityLabel"),
        },
      ],
      primaryCta: {
        label: t("home.widgets.sleepLatest.logCta"),
        path: "/tools/sleep/new",
        icon: "bedtime",
      },
      openCta: openCta(t, "/tools/sleep"),
      today: loggedOnDate(data.sleepLogs, dateKey)
        ? { badge: t("home.widgets.sleepLatest.loggedBadge") }
        : null,
    };
  },

  "journal-week": (data, { t, dateKey }) => {
    const dayCount = data.journalEntries.filter(
      (e) => toLocalDateKey(e.createdAt) === dateKey,
    ).length;
    const words = data.journalEntries.reduce((sum, e) => sum + countWords(e.body), 0);
    return {
      kind: "stats",
      title: t("home.widgets.journalWeek.title"),
      stats: [
        {
          value: String(data.journalEntries.length),
          label: t("home.widgets.journalWeek.entriesLabel"),
        },
        { value: String(words), label: t("home.widgets.journalWeek.wordsLabel") },
      ],
      primaryCta: { label: t("today.dashboard.write"), path: "/tools/journal/new", icon: "edit" },
      openCta: openCta(t, "/tools/journal"),
      today: dayCount > 0 ? { badge: t("today.dashboard.countToday", { count: dayCount }) } : null,
    };
  },

  "grounding-log": (data, { t }) => {
    const minutes = data.groundingSessions.reduce((sum, s) => sum + s.durationMinutes, 0);
    return {
      kind: "stats",
      title: t("home.widgets.groundingLog.title"),
      stats:
        data.groundingSessions.length > 0
          ? [
              {
                value: String(data.groundingSessions.length),
                label: t("home.widgets.groundingLog.sessionsLabel"),
              },
              { value: String(minutes), label: t("home.widgets.groundingLog.minutesLabel") },
            ]
          : null,
      emptyText: t("home.widgets.groundingLog.empty"),
      openCta: openCta(t, "/tools/grounding"),
      today: null,
    };
  },

  "act-committed-actions": (data, { t, ta }) => {
    const active = [...data.committedActions]
      .sort((a, b) => (a.updatedAt < b.updatedAt ? 1 : -1))
      .slice(0, 2);
    const actions = active.map((a) => {
      const total = data.actionSteps.filter((s) => s.actionId === a.id).length;
      const done = data.actionSteps.filter((s) => s.actionId === a.id && s.isCompleted).length;
      return {
        title: a.title,
        steps: total > 0 ? t("home.widgets.actCommittedActions.steps", { done, total }) : null,
        path: `/modules/act/committed-action/${a.id}`,
      };
    });
    return {
      kind: "committed-actions",
      title: t("home.widgets.actCommittedActions.title"),
      moduleLabel: ta("module.label"),
      actions,
      emptyText: t("home.widgets.actCommittedActions.empty"),
      openCta:
        actions.length > 0
          ? openCta(t, "/modules/act/committed-action")
          : {
              label: t("home.widgets.actCommittedActions.setAction"),
              path: "/modules/act/committed-action/new",
            },
    };
  },

  "act-defusion": (data, { t, ta }) => {
    const last =
      [...data.defusionLogs].sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1))[0] ?? null;
    return {
      kind: "defusion",
      title: t("home.widgets.actDefusion.title"),
      moduleLabel: ta("module.label"),
      lastLabel: t("home.widgets.actDefusion.last"),
      technique: last
        ? ta(`defusion.techniques.${last.techniqueUsed}`, { defaultValue: last.techniqueUsed })
        : null,
      tryItText: t("home.widgets.actDefusion.tryIt"),
      cta: {
        label: last ? t("home.widgets.actDefusion.again") : t("home.widgets.actDefusion.start"),
        path: "/modules/act/defusion",
      },
    };
  },

  // Static families assigned below via loops (rather than spread in this literal): spreading
  // two objects each typed `Record<CardId, CardBuilder>` (i.e. covering ALL card ids, since
  // Object.fromEntries can't infer the narrower per-family key union) after the explicit
  // entries above trips TS2783 ("specified more than once, so this usage will be
  // overwritten") even though the two fromEntries results only actually hold their own
  // family's keys at runtime.
};

for (const s of CBT_SHORTCUTS) {
  CARD_BUILDERS[s.id] = (_d, { t, tc }) => ({
    kind: "shortcut",
    title: t(s.titleKey),
    moduleLabel: tc("module.label"),
    description: t(s.descKey),
    cta: { label: t(s.ctaKey), path: s.path },
  });
}
for (const p of ACT_PROMPTS) {
  CARD_BUILDERS[p.id] = (_d, { t, ta }) => ({
    kind: "prompt",
    title: t(p.titleKey),
    moduleLabel: ta("module.label"),
    prompt: t(p.promptKey),
    cta: { label: t(p.ctaKey), path: p.path },
  });
}

function signedOutCard(t: Translate) {
  return { title: "Selftend", cta: t("home.widgets.launcher.signedOutCta") };
}

export function buildSnapshot(data: WidgetData, ctx: BuildContext): Snapshot {
  const widgets: Record<string, CardPayload> = {};
  // Non-null: CARD_BUILDERS is populated for every CardId (11 explicit + 9 CBT shortcuts +
  // 4 ACT prompts = CARD_IDS.length) by the assignments above.
  for (const id of CARD_IDS) widgets[id] = CARD_BUILDERS[id]!(data, ctx);
  return {
    schemaVersion: 2,
    locale: ctx.locale,
    generatedAt: new Date().toISOString(),
    dateKey: ctx.dateKey,
    auth: "signed-in",
    appThemePref: ctx.appThemePref,
    signedOutCard: signedOutCard(ctx.t),
    widgets,
  };
}

export function buildSignedOutSnapshot(ctx: {
  t: Translate;
  locale: string;
  dateKey: string;
  appThemePref: AppThemePref;
}): Snapshot {
  return {
    schemaVersion: 2,
    locale: ctx.locale,
    generatedAt: new Date().toISOString(),
    dateKey: ctx.dateKey,
    auth: "signed-out",
    appThemePref: ctx.appThemePref,
    signedOutCard: signedOutCard(ctx.t),
    widgets: {},
  };
}

// --- helpers ---

function sinceDays<T>(rows: T[], at: (r: T) => string, days: number, dateKey: string): T[] {
  const cutoff = startOfDayDaysAgo(days, parseLocalNoon(dateKey));
  return rows.filter((r) => new Date(at(r)) >= cutoff);
}
