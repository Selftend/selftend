import { buildSnapshot, buildSignedOutSnapshot } from "@/src/features/widgets/snapshot-builder";
import { CARD_IDS } from "@/src/features/widgets/snapshot-types";
import { CARD_REPLICAS } from "@/src/features/widgets/cards/card-registry";
import type {
  WidgetData,
  BreathingCardPayload,
  MoodCheckinCardPayload,
  ActivitiesCardPayload,
  StatsCardPayload,
  CommittedActionsCardPayload,
  ProgrammeCardPayload,
} from "@/src/features/widgets/snapshot-types";
import bgCommon from "@/src/i18n/locales/bg/common.json";
import enCommon from "@/src/i18n/locales/en/common.json";
import { addDaysToKey, currentDateKey } from "@/src/utils/date";
import { bundleTranslator } from "@/test/bundle-translator";

const t = (k: string, o?: Record<string, unknown>) => (o ? `${k}:${JSON.stringify(o)}` : k);
const ctx = {
  t,
  ta: t,
  tc: t,
  locale: "en",
  dateKey: "2026-06-05",
  appThemePref: "system" as const,
};

const empty: WidgetData = {
  moodLogs: [],
  sleepLogs: [],
  meditationSessions: [],
  activities: [],
  gratitudeEntries: [],
  journalEntries: [],
  groundingSessions: [],
  breathingSessions: [],
  committedActions: [],
  actionSteps: [],
  defusionLogs: [],
  gratitudeEntryCount: null,
  journalEntryCount: null,
  journalWordTotal: null,
};

describe("sleep-latest number formatting (#962)", () => {
  // The Android home-screen widget renders this snapshot verbatim, so a decimal point
  // baked in here reaches a Bulgarian home screen with nothing left to correct it.
  const bundles = { en: enCommon, bg: bgCommon };

  // Real `common` templates for the unit keys; the suite's existing stub still answers the
  // dozens of `navigation` keys the builder asks for alongside them.
  const localeT = (lang: keyof typeof bundles) => bundleTranslator("common", bundles[lang], t);

  // Inside the rolling 7-day window `averageDurationMinutes` walks, which is anchored on
  // the real current day rather than on `ctx.dateKey`. Averages: 432 min and quality 3.5.
  const twoNights: WidgetData = {
    ...empty,
    sleepLogs: [
      {
        loggedAt: "2026-06-05T22:00:00Z",
        dayKey: currentDateKey(),
        durationMinutes: 430,
        quality: 3,
      },
      {
        loggedAt: "2026-06-04T22:00:00Z",
        dayKey: addDaysToKey(currentDateKey(), -1),
        durationMinutes: 434,
        quality: 4,
      },
    ],
  };

  const stats = (lang: keyof typeof bundles) =>
    (
      buildSnapshot(twoNights, { ...ctx, locale: lang, t: localeT(lang) }).widgets[
        "sleep-latest"
      ] as StatsCardPayload
    ).stats;

  it("renders the English average and quality unchanged", () => {
    expect(stats("en")?.map((s) => s.value)).toEqual(["7.2h", "3.5"]);
  });

  it("renders a comma separator and the translated hour unit in Bulgarian", () => {
    expect(stats("bg")?.map((s) => s.value)).toEqual(["7,2 ч", "3,5"]);
  });
});

describe("buildSnapshot v2", () => {
  it("stamps schemaVersion 4 and builds every card with its registry kind", () => {
    const snap = buildSnapshot(empty, ctx);
    expect(snap.schemaVersion).toBe(4);
    for (const id of CARD_IDS) {
      expect(snap.widgets[id]).toBeDefined();
      expect(snap.widgets[id].kind).toBe(CARD_REPLICAS[id].kind);
    }
    expect(snap.signedOutCard).toBeDefined();
  });

  it("mood-checkin: today's latest score + summary; empty prompt when none", () => {
    const data: WidgetData = {
      ...empty,
      moodLogs: [
        { loggedAt: "2026-06-05T11:00:00", dayKey: "2026-06-05", moodScore: 4 },
        { loggedAt: "2026-06-05T09:00:00", dayKey: "2026-06-05", moodScore: 2 },
        { loggedAt: "2026-06-04T09:00:00", dayKey: "2026-06-04", moodScore: 1 },
      ],
    };
    const p = buildSnapshot(data, ctx).widgets["mood-checkin"] as MoodCheckinCardPayload;
    expect(p.today?.score).toBe(4);
    expect(p.today?.summary).toContain("loggedSummary");
    const none = buildSnapshot(empty, ctx).widgets["mood-checkin"] as MoodCheckinCardPayload;
    expect(none.today?.score).toBeNull();
    expect(none.today?.summary).toBe("home.widgets.moodCheckin.emptyPrompt");
  });

  it("breathing-suggested: the done badge follows the captured day, not the instant", () => {
    // Finished at 23:40 local somewhere at UTC+12 - the same instant is still the 4th
    // in UTC, and would have been for any viewer west of the session (#330).
    const data: WidgetData = {
      ...empty,
      breathingSessions: [{ completedAt: "2026-06-04T11:40:00.000Z", dayKey: "2026-06-05" }],
    };
    const p = buildSnapshot(data, ctx).widgets["breathing-suggested"] as BreathingCardPayload;
    expect(p.today?.badge).toBe("today.dashboard.doneToday");

    const otherDay: WidgetData = {
      ...empty,
      breathingSessions: [{ completedAt: "2026-06-04T11:40:00.000Z", dayKey: "2026-06-04" }],
    };
    expect(
      (buildSnapshot(otherDay, ctx).widgets["breathing-suggested"] as BreathingCardPayload).today,
    ).toBeNull();
  });

  it("journal-week: lifetime entry/word totals win over the capped list", () => {
    const data: WidgetData = {
      ...empty,
      journalEntries: [
        { createdAt: "2026-06-05T09:00:00", dayKey: "2026-06-05", body: "alpha beta" },
        { createdAt: "2026-06-04T09:00:00", dayKey: "2026-06-04", body: "gamma" },
      ],
      journalEntryCount: 214,
      journalWordTotal: 9481,
    };
    const p = buildSnapshot(data, ctx).widgets["journal-week"] as StatsCardPayload;
    expect(p.stats?.[0].value).toBe("214");
    expect(p.stats?.[1].value).toBe("9481");
    // The day badge stays scoped to dateKey - only the two stats are lifetime figures.
    expect(p.today?.badge).toBe('today.dashboard.countToday:{"count":1}');
  });

  it("journal-week: falls back to the loaded entries until the totals arrive", () => {
    const data: WidgetData = {
      ...empty,
      journalEntries: [
        { createdAt: "2026-06-05T09:00:00", dayKey: "2026-06-05", body: "alpha beta" },
        { createdAt: "2026-06-04T09:00:00", dayKey: "2026-06-04", body: "gamma" },
      ],
    };
    const p = buildSnapshot(data, ctx).widgets["journal-week"] as StatsCardPayload;
    expect(p.stats?.[0].value).toBe("2");
    expect(p.stats?.[1].value).toBe("3");
  });

  // `habits-today` is the registry id only - the card is scheduled CBT activities.
  it("activities: progress badge, first incomplete with deep link, all-done state", () => {
    const data: WidgetData = {
      ...empty,
      activities: [
        {
          id: "a",
          activityName: "Walk",
          scheduledAt: "2026-06-05T08:00:00",
          scheduledDayKey: "2026-06-05",
          completedAt: "2026-06-05T09:00:00",
          completedDayKey: "2026-06-05",
        },
        {
          id: "b",
          activityName: "Read",
          scheduledAt: "2026-06-05T08:00:00",
          scheduledDayKey: "2026-06-05",
          completedAt: null,
          completedDayKey: null,
        },
      ],
    };
    const p = buildSnapshot(data, ctx).widgets["habits-today"] as ActivitiesCardPayload;
    expect(p.today?.badge).toContain("1");
    expect(p.today?.first?.name).toBe("Read");
    expect(p.today?.first?.path).toBe("/modules/cbt/activities/b");
  });

  it("activities: the day comes from the captured plan, not the scheduled instant", () => {
    // Planned for 19:00 on the 5th at UTC-7; that instant is already the 6th in UTC
    // and would be for any viewer east of the plan. The card renders the 5th (#330).
    const planned = (scheduledDayKey: string): WidgetData => ({
      ...empty,
      activities: [
        {
          id: "a",
          activityName: "Walk",
          scheduledAt: "2026-06-06T02:00:00.000Z",
          scheduledDayKey,
          completedAt: null,
          completedDayKey: null,
        },
      ],
    });

    const onDay = buildSnapshot(planned("2026-06-05"), ctx).widgets[
      "habits-today"
    ] as ActivitiesCardPayload;
    expect(onDay.today?.scheduled).toBe(1);
    expect(onDay.today?.first?.name).toBe("Walk");

    // The same instant captured on the following day belongs to that day instead.
    const otherDay = buildSnapshot(planned("2026-06-06"), ctx).widgets[
      "habits-today"
    ] as ActivitiesCardPayload;
    expect(otherDay.today?.scheduled).toBe(0);
    expect(otherDay.today?.first).toBeNull();
  });

  it("meditation: the done badge follows the captured day, not the raw instant", () => {
    // 19:00 UTC on the 5th: the sit was on the 5th where it happened (dayKey),
    // but the raw instant buckets to the 6th for a viewer east of them. The
    // badge must follow the captured day - the card's own date axis - or "Done
    // today" goes dark on a sit the user has already done (#330). The second
    // case is the inverse: a sit captured on the 4th must not badge the 5th.
    const data: WidgetData = {
      ...empty,
      meditationSessions: [
        { completedAt: "2026-06-05T19:00:00.000Z", dayKey: "2026-06-05", durationMinutes: 20 },
      ],
    };
    const p = buildSnapshot(data, ctx).widgets["meditation-pick"] as StatsCardPayload;
    expect(p.today?.badge).toBe("today.dashboard.doneToday");

    const otherDay: WidgetData = {
      ...empty,
      meditationSessions: [
        { completedAt: "2026-06-05T01:00:00.000Z", dayKey: "2026-06-04", durationMinutes: 20 },
      ],
    };
    expect(
      (buildSnapshot(otherDay, ctx).widgets["meditation-pick"] as StatsCardPayload).today,
    ).toBeNull();
  });

  it("grounding: null stats + empty text when no sessions", () => {
    const p = buildSnapshot(empty, ctx).widgets["grounding-log"] as StatsCardPayload;
    expect(p.stats).toBeNull();
    expect(p.emptyText).toBe("home.widgets.groundingLog.empty");
  });

  it("committed actions: two most recent with step counts; setAction CTA when empty", () => {
    const data: WidgetData = {
      ...empty,
      committedActions: [
        { id: "a1", title: "Call", updatedAt: "2026-06-05T10:00:00" },
        { id: "a2", title: "Walk", updatedAt: "2026-06-04T10:00:00" },
        { id: "a3", title: "Old", updatedAt: "2026-06-01T10:00:00" },
      ],
      actionSteps: [
        { actionId: "a1", isCompleted: true },
        { actionId: "a1", isCompleted: false },
      ],
    };
    const p = buildSnapshot(data, ctx).widgets[
      "act-committed-actions"
    ] as CommittedActionsCardPayload;
    expect(p.actions.map((a) => a.title)).toEqual(["Call", "Walk"]);
    expect(p.actions[0].steps).toContain("steps");
    expect(p.actions[1].steps).toBeNull();
    const emptyP = buildSnapshot(empty, ctx).widgets[
      "act-committed-actions"
    ] as CommittedActionsCardPayload;
    expect(emptyP.openCta.path).toBe("/modules/act/committed-action/new");
  });

  it("static shortcut/prompt cards carry verbatim routes", () => {
    const snap = buildSnapshot(empty, ctx);
    expect((snap.widgets["cbt-worry"] as { cta: { path: string } }).cta.path).toBe(
      "/modules/cbt/worry/new",
    );
    expect((snap.widgets["act-acceptance-prompt"] as { cta: { path: string } }).cta.path).toBe(
      "/modules/act/expansion",
    );
  });

  it("programme cards carry enrollment state, current goals, and programme links", () => {
    const data: WidgetData = {
      ...empty,
      programmes: {
        cbt: {
          startedAt: "2026-06-01T10:00:00Z",
          completedAt: null,
          phaseIndex: 0,
          taskStatuses: [{ taskKey: "thought-record", done: true }],
        },
        act: {
          startedAt: "2026-05-01T10:00:00Z",
          completedAt: "2026-06-01T10:00:00Z",
          phaseIndex: 0,
          taskStatuses: [],
        },
      },
    };
    const snapshot = buildSnapshot(data, ctx);
    const cbt = snapshot.widgets["cbt-programme"] as ProgrammeCardPayload;
    const act = snapshot.widgets["act-programme"] as ProgrammeCardPayload;

    expect(cbt.state).toBe("in-progress");
    expect(cbt.goals.length).toBeGreaterThan(0);
    expect(cbt.programmeCta.path).toBe("/modules/cbt");
    expect(act.state).toBe("completed");
    expect(act.goals).toEqual([]);
    expect(act.programmeCta.path).toBe("/modules/act");
  });
});

describe("buildSignedOutSnapshot v2", () => {
  it("carries the localized signed-out card and no widgets", () => {
    const snap = buildSignedOutSnapshot({
      t,
      locale: "en",
      dateKey: "2026-06-05",
      appThemePref: "system",
    });
    expect(snap.schemaVersion).toBe(4);
    expect(snap.auth).toBe("signed-out");
    expect(snap.widgets).toEqual({});
    expect(snap.signedOutCard?.cta).toBe("home.widgets.launcher.signedOutCta");
  });
});
