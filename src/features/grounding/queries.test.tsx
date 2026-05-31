import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react-native";
import type { PropsWithChildren } from "react";

import { useGroundingSessions } from "@/src/features/grounding/queries";
import { listMindfulnessSessionsByNames } from "@/src/features/mindfulness/repository";
import { groundingSlugs } from "@/src/constants/grounding";
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

describe("useGroundingSessions", () => {
  let client: QueryClient;
  beforeEach(() => {
    jest.clearAllMocks();
    client = createTestQueryClient();
  });

  it("filters by grounding slugs at the query level so the limit applies after the filter", async () => {
    // Regression guard: passing the slugs to the repository means the DB filters by
    // exercise type BEFORE applying the row limit, so grounding sessions can't be hidden
    // behind a window full of other mindfulness types.
    mockList.mockResolvedValue([{ id: "1", exerciseName: groundingSlugs[0] } as never]);

    const { result } = renderHook(() => useGroundingSessions("user-1", 30), {
      wrapper: makeWrapper(client),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockList).toHaveBeenCalledWith("user-1", [...groundingSlugs], 30);
    expect(result.current.data).toEqual([{ id: "1", exerciseName: groundingSlugs[0] }]);
  });

  it("does not fetch when userId is null (query disabled)", () => {
    renderHook(() => useGroundingSessions(null), { wrapper: makeWrapper(client) });
    expect(mockList).not.toHaveBeenCalled();
  });
});
