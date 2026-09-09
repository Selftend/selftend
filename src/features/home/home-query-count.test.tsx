import { screen, waitFor } from "@testing-library/react-native";
import type { QueryClient } from "@tanstack/react-query";

import HomeScreen from "./today-screen";
import { homeToolStatsKeys } from "@/src/features/home/tool-stats-queries";
import { fetchHomeToolStats } from "@/src/features/home/tool-stats-repository";
import { listFavorites } from "@/src/features/favorites/repository";
import { createTestQueryClient, renderWithProviders } from "@/test/render-with-providers";

/**
 * **How many requests a cold Home costs (#2212).**
 *
 * Home renders the whole eight-tool catalogue for everyone — it is not the person's
 * own dashboard any more (#1956) — so the stat fan-out is no longer proportional to
 * what they use. Each card used to mount its tool's own hooks, and those eight stats
 * were **fifteen** distinct queries (two per tool but sleep's one), four of them list
 * reads, every one of them fired the moment Home mounted, for a guest too. Nothing
 * gated them on prior use, and nothing could: the catalogue is a constant.
 *
 * The owner's ruling on #2212 was one server aggregate. This file is the gate on
 * that, and it is a COUNT over the live query cache rather than a check that some
 * named query exists: "the aggregate is mounted" would stay green with all fifteen
 * per-tool queries mounted beside it, which is the exact regression to catch.
 *
 * ☠️ Both suites that render these cards mock a seam, so neither can see this:
 * `today-screen.test.tsx` stubs `ToolStat` to `() => null`, and
 * `tool-row-stats.test.tsx` mocks the stats hook. This one renders the real card, the
 * real hook and the real query, and mocks only the two repositories underneath.
 */

jest.mock("expo-router", () => ({ router: { push: jest.fn() }, usePathname: () => "/" }));

jest.mock("@/src/providers/session-provider", () => ({
  useSession: () => ({ user: { id: "user-1" } }),
}));

jest.mock("@/src/features/profile/queries", () => ({
  useUserProfile: () => ({ data: null }),
}));

jest.mock("@/src/features/settings/queries", () => ({
  useUserPreferences: () => ({ data: { appOnboardingCompleted: false, shownButtonTours: [] } }),
}));

jest.mock("@/src/features/favorites/repository", () => ({
  listFavorites: jest.fn(),
  addFavorite: jest.fn(),
  removeFavorite: jest.fn(),
}));

// The RPC seam. Everything above it — the hook, the query key, the eight cards' reads
// — is the real thing, which is what makes the count below meaningful.
jest.mock("@/src/features/home/tool-stats-repository", () => ({
  fetchHomeToolStats: jest.fn(),
}));

const mockList = listFavorites as jest.MockedFunction<typeof listFavorites>;
const mockFetch = fetchHomeToolStats as jest.MockedFunction<typeof fetchHomeToolStats>;

const STATS = {
  mood: { lifetimeCount: 2, thisWeekCount: 1, avg7: 3 },
  journal: { entries: 4, words: 100 },
  gratitude: { entries: 5, thisWeek: 1 },
  breathing: { sessions: 6, minutes: 30 },
  grounding: { sessions: 7, lastCompletedAt: null, lastCompletedOffsetMinutes: null },
  meditation: { sits: 8, medianMinutes: 12 },
  sleep: { avgDurationMinutes7: 432, avgQuality7: 3.2 },
  habits: { active: 3, dueToday: 2, doneToday: 1 },
};

beforeEach(() => {
  jest.clearAllMocks();
  mockList.mockResolvedValue([]);
  mockFetch.mockResolvedValue(STATS);
});

/** Every query the screen actually mounted, by key root. */
function mountedKeys(client: QueryClient): unknown[][] {
  return client
    .getQueryCache()
    .findAll()
    .map((query) => [...query.queryKey] as unknown[]);
}

async function renderHome() {
  const client = createTestQueryClient();
  renderWithProviders(<HomeScreen />, { queryClient: client });
  // Settled once every card has drawn its stat line.
  await waitFor(() => expect(screen.getAllByTestId(/^card-stat-tool-/)).toHaveLength(8));
  return client;
}

describe("what a cold Home costs", () => {
  it("mounts ONE stats query for the eight tool cards, where it used to mount fifteen", async () => {
    const client = await renderHome();

    const statsQueries = mountedKeys(client).filter(
      (key) => key[0] === homeToolStatsKeys.all[0] && key[1] === homeToolStatsKeys.all[1],
    );

    expect(statsQueries).toHaveLength(1);
    expect(mockFetch).toHaveBeenCalledTimes(1);
  });

  /**
   * The other half, and the one a returning per-tool hook would trip: the ONLY queries
   * Home mounts are the favourites list and the one aggregate. Asserting the whole set
   * rather than the absence of particular roots means a stat that starts fetching its
   * own rows again fails here whatever key it invents.
   */
  it("mounts no per-tool query at all - the whole cache is favourites plus the aggregate", async () => {
    const client = await renderHome();

    const roots = mountedKeys(client)
      .map((key) => key.slice(0, 2).join("/"))
      .sort();

    expect(roots).toEqual(["favorites/list", "home/tool-stats"]);
  });

  /** All eight cards read that one entry, rather than seven of them reading nothing. */
  it("has all eight cards observing the single query", async () => {
    const client = await renderHome();

    const [query] = client
      .getQueryCache()
      .findAll({ queryKey: homeToolStatsKeys.all })
      .filter((q) => q.queryKey[1] === "tool-stats");

    expect(query.getObserversCount()).toBe(8);
  });

  /**
   * The cards still draw the real figures through the real hook — so this file is not
   * green merely because nothing rendered.
   */
  it("draws each card's own slice of the aggregate", async () => {
    await renderHome();

    expect(screen.getByTestId("card-stat-tool-journal").props.children).toBe(
      "4 entries · 100 words",
    );
    expect(screen.getByTestId("card-stat-tool-habits").props.children).toBe("1 of 2 done today");
  });
});
