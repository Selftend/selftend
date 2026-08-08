import { renderWidget } from "@/src/features/widgets/render-widget";
import { buildSnapshot } from "@/src/features/widgets/snapshot-builder";
import { DEFAULT_CONFIG } from "@/src/features/widgets/widget-config-store";
import { currentDateKey } from "@/src/utils/date";
import { widgetTree, texts, clickPaths } from "@/src/features/widgets/cards/widget-tree-helper";

const t = (k: string, o?: Record<string, unknown>) => (o ? `${k}:${JSON.stringify(o)}` : k);
const freshCtx = {
  t,
  ta: t,
  tc: t,
  locale: "en",
  dateKey: currentDateKey(),
  appThemePref: "light" as const,
};
const empty = {
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
  moodLogCount: null,
  gratitudeEntryCount: null,
  journalEntryCount: null,
  journalWordTotal: null,
};
const args = { widgetName: "SelftendCard", width: 320, height: 180 };

describe("renderWidget v2", () => {
  it("renders the configured card", () => {
    const snapshot = buildSnapshot(empty, freshCtx);
    const el = renderWidget({
      ...args,
      snapshot,
      config: { ...DEFAULT_CONFIG, cardId: "cbt-worry" },
    });
    expect(texts(widgetTree(el))).toContain("home.widgets.cbtWorry.title");
  });

  it("falls back to mood-checkin for unknown cardId and null config", () => {
    const snapshot = buildSnapshot(empty, freshCtx);
    const el = renderWidget({ ...args, snapshot, config: { ...DEFAULT_CONFIG, cardId: "nope" } });
    expect(clickPaths(widgetTree(el))).toContain("/tools/check-in/new?score=3");
    const el2 = renderWidget({ ...args, snapshot, config: null });
    expect(clickPaths(widgetTree(el2))).toContain("/tools/check-in/new?score=3");
  });

  it("strips date-scoped data from a stale snapshot", () => {
    const stale = buildSnapshot(
      {
        ...empty,
        moodLogs: [{ loggedAt: "2020-01-01T09:00:00", dayKey: "2020-01-01", moodScore: 5 }],
      },
      { ...freshCtx, dateKey: "2020-01-01" },
    );
    const el = renderWidget({
      ...args,
      snapshot: stale,
      config: { ...DEFAULT_CONFIG, cardId: "mood-checkin" },
    });
    expect(texts(widgetTree(el))).toContain("home.widgets.moodCheckin.emptyPrompt");
  });

  it("renders the signed-out card when signed out (theme pair for system pref)", () => {
    const snapshot = {
      ...buildSnapshot(empty, { ...freshCtx, appThemePref: "system" as const }),
      auth: "signed-out" as const,
      widgets: {},
    };
    const out = renderWidget({ ...args, snapshot, config: null }) as {
      light: React.JSX.Element;
      dark: React.JSX.Element;
    };
    expect(texts(widgetTree(out.light))).toContain("home.widgets.launcher.signedOutCta");
    expect(out.dark).toBeDefined();
  });

  it("renders the signed-out fallback for a null snapshot", () => {
    const out = renderWidget({ ...args, snapshot: null, config: null }) as {
      light: React.JSX.Element;
      dark: React.JSX.Element;
    };
    expect(texts(widgetTree(out.light))).toContain("Open Selftend");
  });
});
