import { renderHook, waitFor } from "@testing-library/react-native";
import { QueryClientProvider } from "@tanstack/react-query";
import type { PropsWithChildren } from "react";

import { groundingSlugs } from "@/src/constants/grounding";
import { homeToolStatsKeys, useHomeToolStats } from "@/src/features/home/tool-stats-queries";
import { fetchHomeToolStats } from "@/src/features/home/tool-stats-repository";
import { createTestQueryClient } from "@/test/render-with-providers";

jest.mock("@/src/features/home/tool-stats-repository", () => ({
  fetchHomeToolStats: jest.fn(async () => ({})),
}));

jest.mock("@/src/stores/selected-date-store", () => ({
  useSelectedDate: () => ({ selectedDate: "2026-05-28" }),
}));

const mockFetch = fetchHomeToolStats as jest.MockedFunction<typeof fetchHomeToolStats>;

function wrapper() {
  const client = createTestQueryClient();
  return {
    client,
    Wrapper: ({ children }: PropsWithChildren) => (
      <QueryClientProvider client={client}>{children}</QueryClientProvider>
    ),
  };
}

beforeEach(() => jest.clearAllMocks());

describe("useHomeToolStats", () => {
  it("hands the RPC the viewer's frame and the grounding slugs", async () => {
    const { Wrapper } = wrapper();
    renderHook(() => useHomeToolStats("user-1"), { wrapper: Wrapper });

    await waitFor(() => expect(mockFetch).toHaveBeenCalledTimes(1));
    expect(mockFetch).toHaveBeenCalledWith({
      // jest.config pins TZ=Asia/Kolkata; the ICU data in this runtime reports the
      // `Asia/Calcutta` alias for it, and either name resolves in Postgres. What is
      // being pinned is that a ZONE NAME goes over the wire rather than a numeric
      // offset - only the name lets the server resolve each row at its own instant.
      timeZone: expect.stringMatching(/^Asia\/(Kolkata|Calcutta)$/),
      dayKey: "2026-05-28",
      // Passed rather than hardcoded in SQL, so the breathing/grounding split stays in
      // one place on the client - the `breathing_total_minutes` argument's rule.
      groundingNames: groundingSlugs,
    });
  });

  /**
   * ☠️ The zone and the day are part of the KEY, not just the arguments. They move
   * independently of the user: rows that captured no offset bucket by the zone, so
   * travel changes the answer, and the two "this week"/"today" windows roll at the
   * viewer's midnight. Keying on the id alone would serve the departure city's figures
   * after arrival, and yesterday's fraction after midnight.
   */
  it("carries the zone and the day in the query key", () => {
    expect(homeToolStatsKeys.forViewer("user-1", "Europe/Sofia", "2026-05-28")).toEqual([
      "home",
      "tool-stats",
      "user-1",
      "Europe/Sofia",
      "2026-05-28",
    ]);
    expect(homeToolStatsKeys.forViewer(null, "Europe/Sofia", "2026-05-28")[2]).toBe("anonymous");
  });

  it("does not fetch without a user", async () => {
    const { Wrapper } = wrapper();
    renderHook(() => useHomeToolStats(null), { wrapper: Wrapper });

    await waitFor(() => expect(mockFetch).not.toHaveBeenCalled());
  });
});
