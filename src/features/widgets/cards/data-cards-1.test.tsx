import { MoodCheckinCard } from "@/src/features/widgets/cards/mood-checkin-card";
import { StatTilesCard } from "@/src/features/widgets/cards/stat-tiles-card";
import { BreathingCard } from "@/src/features/widgets/cards/breathing-card";
import { StatsCard } from "@/src/features/widgets/cards/stats-card";
import { widgetTree, texts, clickPaths } from "@/src/features/widgets/cards/widget-tree-helper";

const base = { width: 320, height: 180, theme: "light" as const, opacity: 1 };

describe("MoodCheckinCard", () => {
  const payload = {
    kind: "mood-checkin" as const,
    title: "Mood check-in",
    emptyPrompt: "How are you feeling?",
    today: { score: 4, summary: "Logged 2 · last at 9:15" },
  };
  it("renders faces with today's selection and the summary", () => {
    const tree = widgetTree(<MoodCheckinCard payload={payload} icon="mood" tint="be" {...base} />);
    expect(clickPaths(tree)).toEqual([1, 2, 3, 4, 5].map((s) => `/tools/check-in/new?score=${s}`));
    expect(texts(tree)).toContain("Logged 2 · last at 9:15");
  });
  it("stale (today: null) shows the empty prompt and no selection", () => {
    const tree = widgetTree(
      <MoodCheckinCard payload={{ ...payload, today: null }} icon="mood" tint="be" {...base} />,
    );
    expect(texts(tree)).toContain("How are you feeling?");
  });
});

describe("StatTilesCard", () => {
  it("renders tiles and ghost open", () => {
    const payload = {
      kind: "stat-tiles" as const,
      title: "Mood trend",
      tiles: [
        { label: "7-day", value: "3.8" },
        { label: "Entries", value: "12" },
      ],
      openCta: { label: "Open", path: "/tools/check-in" },
    };
    const tree = widgetTree(
      <StatTilesCard payload={payload} icon="show-chart" tint="be" {...base} />,
    );
    expect(texts(tree)).toEqual(["Mood trend", "7-DAY", "3.8", "ENTRIES", "12", "Open"]);
    expect(clickPaths(tree)).toEqual(["/tools/check-in"]);
  });
});

describe("BreathingCard", () => {
  const payload = {
    kind: "breathing" as const,
    title: "Breathing",
    hint: "Last session Jul 7, 2026",
    startCta: { label: "Start", path: "/tools/breathing/session", icon: "air" },
    openCta: { label: "Open", path: "/tools/breathing" },
    today: { badge: "Done today" },
  };
  it("renders badge, hint, and both CTAs", () => {
    const tree = widgetTree(<BreathingCard payload={payload} icon="air" tint="aqua" {...base} />);
    expect(texts(tree)).toEqual([
      "Breathing",
      "Done today",
      "Last session Jul 7, 2026",
      "Start",
      "Open",
    ]);
    expect(clickPaths(tree)).toEqual(["/tools/breathing/session", "/tools/breathing"]);
  });
  it("stale hides the done-today badge", () => {
    const tree = widgetTree(
      <BreathingCard payload={{ ...payload, today: null }} icon="air" tint="aqua" {...base} />,
    );
    expect(texts(tree)).not.toContain("Done today");
  });
});

describe("StatsCard", () => {
  it("renders stats + both CTAs (sleep shape)", () => {
    const payload = {
      kind: "stats" as const,
      title: "Sleep",
      stats: [
        { value: "7h 30m", label: "7-night avg" },
        { value: "3.5", label: "Quality" },
      ],
      primaryCta: { label: "Log", path: "/tools/sleep/new", icon: "bedtime" },
      openCta: { label: "Open", path: "/tools/sleep" },
      today: { badge: "Logged" },
    };
    const tree = widgetTree(<StatsCard payload={payload} icon="bedtime" tint="ink" {...base} />);
    expect(texts(tree)).toEqual([
      "Sleep",
      "Logged",
      "7h 30m",
      "7-night avg",
      "3.5",
      "Quality",
      "Log",
      "Open",
    ]);
    expect(clickPaths(tree)).toEqual(["/tools/sleep/new", "/tools/sleep"]);
  });
  it("renders emptyText when stats null and omits missing primary CTA (grounding shape)", () => {
    const payload = {
      kind: "stats" as const,
      title: "Grounding",
      stats: null,
      emptyText: "No sessions yet",
      openCta: { label: "Open", path: "/tools/grounding" },
      today: null,
    };
    const tree = widgetTree(<StatsCard payload={payload} icon="history" tint="clay" {...base} />);
    expect(texts(tree)).toEqual(["Grounding", "No sessions yet", "Open"]);
    expect(clickPaths(tree)).toEqual(["/tools/grounding"]);
  });
});
