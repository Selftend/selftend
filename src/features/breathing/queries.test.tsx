import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react-native";
import type { PropsWithChildren } from "react";

import { useBreathingSessions } from "@/src/features/breathing/queries";
import { listMindfulnessSessionsByNames } from "@/src/features/mindfulness/repository";
import { breathingSlugs } from "@/src/constants/breathing";
import { createTestQueryClient } from "@/test/render-with-providers";

jest.mock("@/src/features/mindfulness/repository", () => ({
  listMindfulnessSessionsByNames: jest.fn(),
  saveMindfulnessSession: jest.fn(),
}));

const mockList = listMindfulnessSessionsByNames as jest.MockedFunction<
  typeof listMindfulnessSessionsByNames
>;

function makeWrapper(client: QueryClient) {
  return function wrapper({ children }: PropsWithChildren) {
    return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
  };
}

describe("useBreathingSessions", () => {
  let client: QueryClient;
  beforeEach(() => {
    jest.clearAllMocks();
    client = createTestQueryClient();
  });

  it("filters by breathing slugs at the query level so the limit applies after the filter", async () => {
    // Regression guard: passing the slugs to the repository means the DB filters by
    // exercise type BEFORE applying the row limit, so breathing sessions can't be hidden
    // behind a window full of other mindfulness types.
    mockList.mockResolvedValue([{ id: "1", exerciseName: breathingSlugs[0] } as never]);

    const { result } = renderHook(() => useBreathingSessions("user-1", 30), {
      wrapper: makeWrapper(client),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockList).toHaveBeenCalledWith("user-1", [...breathingSlugs], 30);
    expect(result.current.data).toEqual([{ id: "1", exerciseName: breathingSlugs[0] }]);
  });

  it("does not fetch when userId is null (query disabled)", () => {
    renderHook(() => useBreathingSessions(null), { wrapper: makeWrapper(client) });
    expect(mockList).not.toHaveBeenCalled();
  });
});
