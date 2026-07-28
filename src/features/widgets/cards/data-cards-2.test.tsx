import { ActivitiesCard } from "@/src/features/widgets/cards/activities-card";
import { CommittedActionsCard } from "@/src/features/widgets/cards/committed-actions-card";
import { DefusionCard } from "@/src/features/widgets/cards/defusion-card";
import { widgetTree, texts, clickPaths } from "@/src/features/widgets/cards/widget-tree-helper";

const base = { width: 320, height: 180, theme: "light" as const, opacity: 1 };

describe("ActivitiesCard", () => {
  const payload = {
    kind: "activities" as const,
    title: "Habits",
    hintText: "Plan a habit to build momentum.",
    allDoneText: "All done for today!",
    newCta: { label: "New habit", path: "/tools/habits/new", icon: "add" },
    openCta: { label: "Open", path: "/tools/habits" },
    today: {
      badge: "1/3",
      first: { name: "Morning walk", openLabel: "Open", path: "/modules/cbt/activities/abc" },
      scheduled: 3,
    },
  };
  it("renders progress pill, first incomplete row with deep link, and CTAs", () => {
    const tree = widgetTree(
      <ActivitiesCard payload={payload} icon="directions-run" tint="act" {...base} />,
    );
    expect(texts(tree)).toContain("Morning walk");
    expect(texts(tree)).toContain("1/3");
    expect(clickPaths(tree)).toEqual([
      "/modules/cbt/activities/abc",
      "/tools/habits/new",
      "/tools/habits",
    ]);
  });
  it("all-done shows allDoneText; stale/no-schedule shows hint", () => {
    const done = widgetTree(
      <ActivitiesCard
        payload={{ ...payload, today: { badge: "3/3", first: null, scheduled: 3 } }}
        icon="directions-run"
        tint="act"
        {...base}
      />,
    );
    expect(texts(done)).toContain("All done for today!");
    const stale = widgetTree(
      <ActivitiesCard
        payload={{ ...payload, today: null }}
        icon="directions-run"
        tint="act"
        {...base}
      />,
    );
    expect(texts(stale)).toContain("Plan a habit to build momentum.");
  });
});

describe("CommittedActionsCard", () => {
  it("renders up to two tappable action tiles", () => {
    const payload = {
      kind: "committed-actions" as const,
      title: "Committed actions",
      moduleLabel: "ACT",
      actions: [
        { title: "Call a friend", steps: "1/3 steps", path: "/modules/act/committed-action/a1" },
        { title: "Walk daily", steps: null, path: "/modules/act/committed-action/a2" },
      ],
      emptyText: "Set an action that matters.",
      openCta: { label: "Open", path: "/modules/act/committed-action" },
    };
    const tree = widgetTree(
      <CommittedActionsCard payload={payload} icon="checklist" tint="act" {...base} />,
    );
    expect(texts(tree)).toContain("Call a friend");
    expect(texts(tree)).toContain("1/3 steps");
    expect(clickPaths(tree)).toEqual([
      "/modules/act/committed-action/a1",
      "/modules/act/committed-action/a2",
      "/modules/act/committed-action",
    ]);
  });
  it("renders emptyText when no actions", () => {
    const payload = {
      kind: "committed-actions" as const,
      title: "Committed actions",
      moduleLabel: "ACT",
      actions: [],
      emptyText: "Set an action that matters.",
      openCta: { label: "Set action", path: "/modules/act/committed-action/new" },
    };
    const tree = widgetTree(
      <CommittedActionsCard payload={payload} icon="checklist" tint="act" {...base} />,
    );
    expect(texts(tree)).toContain("Set an action that matters.");
    expect(clickPaths(tree)).toEqual(["/modules/act/committed-action/new"]);
  });
});

describe("DefusionCard", () => {
  it("renders last technique when present, tryIt otherwise", () => {
    const payload = {
      kind: "defusion" as const,
      title: "Defusion",
      moduleLabel: "ACT",
      lastLabel: "Last technique",
      technique: "Leaves on a stream",
      tryItText: "Try a defusion technique.",
      cta: { label: "Again", path: "/modules/act/defusion" },
    };
    const withLast = widgetTree(
      <DefusionCard payload={payload} icon="filter-drama" tint="act" {...base} />,
    );
    expect(texts(withLast)).toContain("Leaves on a stream");
    const without = widgetTree(
      <DefusionCard
        payload={{ ...payload, technique: null }}
        icon="filter-drama"
        tint="act"
        {...base}
      />,
    );
    expect(texts(without)).toContain("Try a defusion technique.");
    expect(clickPaths(without)).toEqual(["/modules/act/defusion"]);
  });
});
