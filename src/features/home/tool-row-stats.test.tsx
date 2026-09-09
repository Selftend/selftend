import { screen } from "@testing-library/react-native";

import type { ToolKey } from "@/src/features/favorites/items";
import { ToolStat } from "@/src/features/home/tool-row-stats";
import type { HomeToolStats } from "@/src/features/home/tool-stats-repository";
import { renderWithProviders } from "@/test/render-with-providers";

jest.mock("expo-router", () => ({ router: { push: jest.fn() }, usePathname: () => "/" }));

/**
 * ONE mocked query, not fifteen (#2212).
 *
 * Every figure the eight cards draw arrives together from `home_tool_stats`, so the
 * seam this file mocks is that single hook. The values below are what the RPC hands
 * back — **exact and unrounded** — because the rounding is the hook's job under
 * ADR-0001, and `home-query-count.test.tsx` is what holds the count at one.
 */
jest.mock("@/src/features/home/tool-stats-queries", () => ({
  useHomeToolStats: jest.fn(),
}));

const useHomeToolStats = jest.requireMock("@/src/features/home/tool-stats-queries")
  .useHomeToolStats as jest.Mock;

/** Every tool loaded and empty, so each test only sets the one it is about. */
const EMPTY: HomeToolStats = {
  mood: { lifetimeCount: 0, thisWeekCount: 0, avg7: null },
  journal: { entries: 0, words: 0 },
  gratitude: { entries: 0, thisWeek: 0 },
  breathing: { sessions: 0, minutes: 0 },
  grounding: { sessions: 0, lastCompletedAt: null, lastCompletedOffsetMinutes: null },
  meditation: { sits: 0, medianMinutes: null },
  sleep: { avgDurationMinutes7: null, avgQuality7: null },
  habits: { active: 0, dueToday: 0, doneToday: 0 },
};

/** The whole aggregate, loaded, with one tool's slice overridden. */
function loaded(patch: Partial<HomeToolStats> = {}) {
  useHomeToolStats.mockReturnValue({ data: { ...EMPTY, ...patch } });
}

const renderStat = (toolKey: ToolKey) =>
  renderWithProviders(<ToolStat toolKey={toolKey} userId="user-1" />);

/**
 * The card's whole stat line, including the ` · ` join, or `null` when the card draws
 * no stat node at all - which is what "loading" looks like from outside (#1955).
 */
function statOf(toolKey: ToolKey): string | null {
  const node = screen.queryByTestId(`card-stat-tool-${toolKey}`);
  return node === null ? null : (node.props.children as string);
}

beforeEach(() => {
  jest.clearAllMocks();
  loaded();
});

describe("the three states", () => {
  it("renders no stat at all while the data is still loading", () => {
    // Not a dash, not a skeleton, not "Nothing yet". `undefined` also covers a failed
    // fetch with no cache, where claiming emptiness would erase a real history.
    useHomeToolStats.mockReturnValue({ data: undefined });

    renderStat("journal");

    expect(statOf("journal")).toBeNull();
  });

  it("waits for the whole aggregate before showing any clause", () => {
    // A row that renders half its stat and then reflows is worse than one that waits.
    // With one query the clauses can no longer arrive apart - which is the point - so
    // this pins the state that remains: nothing loaded, nothing drawn.
    useHomeToolStats.mockReturnValue({ data: undefined });

    renderStat("mood");

    expect(statOf("mood")).toBeNull();
  });

  it("renders the one shared empty string when loaded with no record", () => {
    renderStat("journal");

    expect(statOf("journal")).toBe("Nothing yet");
  });

  it("distinguishes an empty day from an empty record", () => {
    // A user with habits, none due today, has a full record and an empty day.
    loaded({ habits: { active: 1, dueToday: 0, doneToday: 0 } });

    renderStat("habits");

    expect(statOf("habits")).toBe("Nothing scheduled today");
  });
});

describe("the stat grammar", () => {
  it("joins two clauses with the design's separator", () => {
    loaded({ journal: { entries: 24, words: 698 } });

    renderStat("journal");

    expect(statOf("journal")).toBe("24 entries · 698 words");
  });

  it("drops a clause rather than rendering it empty", () => {
    loaded({ meditation: { sits: 30, medianMinutes: null } });

    renderStat("meditation");

    expect(statOf("meditation")).toBe("30 sits");
  });

  it("names the window on a windowed number and not on a lifetime one", () => {
    loaded({ journal: { entries: 24, words: 698 } });
    renderStat("journal");
    expect(statOf("journal")).not.toMatch(/week|average/i);

    loaded({ sleep: { avgDurationMinutes7: 432, avgQuality7: 3.2 } });
    renderStat("sleep");
    expect(statOf("sleep")).toMatch(/7-day average/);
  });
});

describe("per-tool stats", () => {
  it("check-in quotes a calendar week and a trailing average, both labelled", () => {
    // The two windows differ ON PURPOSE (#697): `this week` is Mon-Sun, `7-day average`
    // is trailing. Both are labelled, so both are honest - harmonising them reverts #697.
    // The RPC computes both windows; this pins that the card still names each one.
    loaded({ mood: { lifetimeCount: 2, thisWeekCount: 2, avg7: 3 } });

    renderStat("mood");

    expect(statOf("mood")).toMatch(/this week/);
    expect(statOf("mood")).toMatch(/7-day average/);
  });

  it("draws the check-in average to one decimal, not the raw mean", () => {
    // ADR-0001: the server hands back the exact mean and the CLIENT reduces it, through
    // the same `roundTo1` + `formatOneDecimal` pair `getMoodSummary` always fed.
    // ⚠️ This assertion cannot tell those two apart - `formatOneDecimal` alone would
    // print the same string - so `roundTo1` stays because it is the old pipeline, not
    // because this line proves it. The rounding that IS observable is sleep's and the
    // median's below, and those two tests are the mutation-proved ones.
    loaded({ mood: { lifetimeCount: 3, thisWeekCount: 3, avg7: 3.266666666 } });

    renderStat("mood");

    expect(statOf("mood")).toBe("3 this week · 7-day average 3.3");
  });

  it("sleep converts the server's minutes into hours and quotes quality out of five", () => {
    // `sleep_stats` returns MINUTES; 432 is 7.2h. The decimal is locale-aware via #962.
    loaded({ sleep: { avgDurationMinutes7: 432, avgQuality7: 3.2 } });

    renderStat("sleep");

    expect(statOf("sleep")).toBe("7-day average 7.2h · quality 3.2/5");
  });

  it("draws an unrounded server average as the same line as its rounded twin", () => {
    // 431.5 minutes and quality 3.24 are what the RPC actually returns - exact, because
    // ADR-0001 keeps the rounding on the client - and they have to read as the figures
    // the sleep repository's `Math.round`/`roundTo1` always produced.
    // ⚠️ At this scale the two are indistinguishable by construction: `formatHours`
    // shows one decimal of an hour, so half a minute cannot move it. The rounding stays
    // because it is the old pipeline; what this line proves is that an exact numeric
    // does not reach the card as `7.191666666666666h`.
    loaded({ sleep: { avgDurationMinutes7: 431.5, avgQuality7: 3.24 } });

    renderStat("sleep");

    expect(statOf("sleep")).toBe("7-day average 7.2h · quality 3.2/5");
  });

  it("rounds the meditation median rather than drawing the raw percentile", () => {
    // `percentile_cont` interpolates, so an even number of sits yields a .5; the client
    // applies the same `Math.round` `medianMeditationMinutes()` always did.
    loaded({ meditation: { sits: 30, medianMinutes: 22.5 } });

    renderStat("meditation");

    expect(statOf("meditation")).toBe("30 sits · 23 min typical");
  });

  it("habits counts habits due today, not CBT activities", () => {
    // The id maps to ActivitiesWidget today, which reads behavioural-activation data and
    // no habit data at all. The RPC applies `isScheduledOn`/`isTickedOn` to the viewer's
    // day; the card states the fraction.
    loaded({ habits: { active: 3, dueToday: 2, doneToday: 1 } });

    renderStat("habits");

    expect(statOf("habits")).toBe("1 of 2 done today");
  });

  it("gratitude counts everything, then this week", () => {
    loaded({ gratitude: { entries: 29, thisWeek: 3 } });

    renderStat("gratitude");

    expect(statOf("gratitude")).toBe("29 entries · 3 this week");
  });

  it("breathing quotes lifetime sessions and lifetime minutes, neither windowed", () => {
    loaded({ breathing: { sessions: 14, minutes: 82 } });

    renderStat("breathing");

    const stat = statOf("breathing");
    expect(stat).toBe("14 sessions · 82 minutes");
    // A lifetime number names no window - that is the other half of the rule that makes
    // `7-day average` mean something.
    expect(stat).not.toMatch(/week|average|today/i);
  });

  it("check-in stays honest for a user whose record is older than the window", () => {
    // Their last check-in was ten days ago: they have a record, so "Nothing yet" would
    // be false. `0 this week` is the true clause.
    loaded({ mood: { lifetimeCount: 12, thisWeekCount: 0, avg7: null } });

    renderStat("mood");

    expect(statOf("mood")).toBe("0 this week");
  });

  it("grounding reads recency off the newest session's own captured instant", () => {
    loaded({
      grounding: {
        sessions: 14,
        lastCompletedAt: "2026-05-27T19:40:00.000Z",
        lastCompletedOffsetMinutes: 0,
      },
    });

    renderStat("grounding");

    const stat = statOf("grounding") ?? "";
    expect(stat).toMatch(/^14 sessions · Last /);
    // Never "N days ago": a column of those implies lateness, which home does not do.
    expect(stat).not.toMatch(/days? ago/i);
  });

  it("drops grounding's recency clause when the tool has no sessions at all", () => {
    // `lastCompletedAt` is null exactly when the count is zero, and the empty string
    // already says so - the card must not render a dangling "Last ".
    renderStat("grounding");

    expect(statOf("grounding")).toBe("Nothing yet");
  });
});
