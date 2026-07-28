import { addDaysToKey, maxDayKey, toLocalDateKey } from "@/src/utils/date";
import { roundTo1 } from "@/src/utils/number";
import {
  averageDurationMinutes,
  averageQuality,
  loggedOnDate,
} from "@/src/features/sleep/summaries";
import { formatHours } from "@/src/features/sleep/format";
import { countWords } from "@/src/features/journal/word-count";
import { answeredCount } from "@/src/features/gratitude/questions";
import { CBT_PROGRAM } from "@/src/features/cbt/program-definition";
import { ACT_PROGRAM } from "@/src/features/act/program-definition";
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

const MODULE_SHORTCUTS: {
  id: CardId;
  module: "cbt" | "act";
  titleKey: string;
  descKey: string;
  ctaKey: string;
  path: string;
}[] = [
  {
    id: "cbt-module-shortcut",
    module: "cbt",
    titleKey: "home.widgets.cbtModuleShortcut.title",
    descKey: "home.widgets.cbtModuleShortcut.metaDesc",
    ctaKey: "home.widgets.cbtModuleShortcut.cta",
    path: "/modules/cbt",
  },
  {
    id: "act-module-shortcut",
    module: "act",
    titleKey: "home.widgets.actModuleShortcut.title",
    descKey: "home.widgets.actModuleShortcut.metaDesc",
    ctaKey: "home.widgets.actModuleShortcut.cta",
    path: "/modules/act",
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
  "cbt-programme": (data, { t, tc }) => buildProgrammeCard("cbt", data, t, tc),
  "act-programme": (data, { t, ta }) => buildProgrammeCard("act", data, t, ta),

  "mood-checkin": (data, { t, locale, dateKey }) => {
    const todayLogs = data.moodLogs
      .filter((m) => m.dayKey === dateKey)
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
    const last7 = sinceDayKeys(data.moodLogs, (m) => m.dayKey, 7, dateKey);
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
    const todayCount = data.gratitudeEntries.filter((e) => e.dayKey === dateKey).length;
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
    const doneToday = data.meditationSessions.some((s) => s.dayKey === dateKey);
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
      (l): l is (typeof data.sleepLogs)[number] & { quality: number } => l.quality !== null,
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
    const dayCount = data.journalEntries.filter((e) => e.dayKey === dateKey).length;
    // Lifetime figures, same as the in-app widget and the journal hero: the loaded list is
    // capped, so summing it only stands in until the server totals arrive (#323).
    const loadedWords = data.journalEntries.reduce((sum, e) => sum + countWords(e.body), 0);
    return {
      kind: "stats",
      title: t("home.widgets.journalWeek.title"),
      stats: [
        {
          value: String(data.journalEntryCount ?? data.journalEntries.length),
          label: t("home.widgets.journalWeek.entriesLabel"),
        },
        {
          value: String(data.journalWordTotal ?? loadedWords),
          label: t("home.widgets.journalWeek.wordsLabel"),
        },
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

function buildProgrammeCard(
  module: "cbt" | "act",
  data: WidgetData,
  t: Translate,
  tm: Translate,
): CardPayload {
  const route = module === "cbt" ? "/modules/cbt" : "/modules/act";
  const programme = data.programmes?.[module] ?? {
    startedAt: null,
    completedAt: null,
    phaseIndex: 0,
    taskStatuses: [],
  };
  const definitions = module === "cbt" ? CBT_PROGRAM : ACT_PROGRAM;
  const phase = definitions[Math.min(Math.max(programme.phaseIndex, 0), definitions.length - 1)];
  const doneByTask = new Map(programme.taskStatuses.map((status) => [status.taskKey, status.done]));
  const allGoals = phase
    ? [
        ...(phase.dailyPractice ? [{ task: phase.dailyPractice, isDaily: true }] : []),
        ...phase.milestones.map((task) => ({ task, isDaily: false })),
      ]
        .map(({ task, isDaily }) => ({
          label: tm(task.labelKey),
          done: doneByTask.get(task.key) ?? false,
          path: String(task.route),
          isDaily,
        }))
        .sort((left, right) => {
          if (left.done !== right.done) return left.done ? 1 : -1;
          if (left.isDaily !== right.isDaily) return left.isDaily ? -1 : 1;
          return 0;
        })
    : [];
  const goals = programme.startedAt && !programme.completedAt ? allGoals.slice(0, 2) : [];
  const remaining = Math.max(0, allGoals.length - goals.length);
  const state = !programme.startedAt
    ? "not-enrolled"
    : programme.completedAt
      ? "completed"
      : "in-progress";

  return {
    kind: "programme",
    title: t(`home.widgets.${module}Programme.title`),
    moduleLabel: tm("module.label"),
    state,
    message:
      state === "not-enrolled"
        ? t("home.programWidget.notEnrolled")
        : state === "completed"
          ? `${t("home.programWidget.completed")} ${t("home.programWidget.continueOnOwn")}`
          : null,
    goals,
    moreGoalsLabel:
      state === "in-progress" && remaining > 0
        ? t("home.programWidget.moreGoals", { count: remaining })
        : null,
    programmeCta: {
      label:
        state === "not-enrolled"
          ? t("home.programWidget.viewProgram")
          : state === "completed"
            ? t("home.programWidget.openModule")
            : t("home.programWidget.openProgram"),
      path: route,
    },
  };
}

for (const s of CBT_SHORTCUTS) {
  CARD_BUILDERS[s.id] = (_d, { t, tc }) => ({
    kind: "shortcut",
    title: t(s.titleKey),
    moduleLabel: tc("module.label"),
    description: t(s.descKey),
    cta: { label: t(s.ctaKey), path: s.path },
  });
}
for (const s of MODULE_SHORTCUTS) {
  CARD_BUILDERS[s.id] = (_d, { t, ta, tc }) => ({
    kind: "shortcut",
    title: t(s.titleKey),
    moduleLabel: s.module === "act" ? ta("module.label") : tc("module.label"),
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

// Launcher replica of the in-app routines-today widget (#50): a plain shortcut
// into the Routines page. The launcher card derives no status - the in-app
// widget owns the today aggregate; the "routines:" prefix resolves the keys
// from the routines namespace through the navigation-bound translator.
CARD_BUILDERS["routines-today"] = (_d, { t }) => ({
  kind: "shortcut",
  title: t("routines:widget.metaTitle"),
  moduleLabel: t("home.categories.routines"),
  description: t("routines:widget.metaDesc"),
  cta: { label: t("today.dashboard.open"), path: "/routines" },
});

function signedOutCard(t: Translate) {
  return { title: "Selftend", cta: t("home.widgets.launcher.signedOutCta") };
}

export function buildSnapshot(data: WidgetData, ctx: BuildContext): Snapshot {
  const widgets: Record<string, CardPayload> = {};
  // Non-null: CARD_BUILDERS is populated for every CardId by the assignments above.
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

/**
 * `sinceDays` for entities that carry a captured civil day: the window is walked
 * in day keys so it lines up with how those entries are bucketed everywhere else
 * (#250). The end extends past `dateKey` if the user holds a later-keyed entry,
 * so travelling west cannot drop today's check-in out of the widget.
 */
function sinceDayKeys<T>(
  rows: T[],
  dayKeyOf: (r: T) => string,
  days: number,
  dateKey: string,
): T[] {
  const endKey = rows.map(dayKeyOf).reduce(maxDayKey, dateKey);
  const startKey = addDaysToKey(endKey, -(days - 1));
  return rows.filter((r) => {
    const key = dayKeyOf(r);
    return key >= startKey && key <= endKey;
  });
}
