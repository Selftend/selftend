import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react-native";
import type { PropsWithChildren } from "react";

import { useBreathingSessions } from "@/src/features/breathing/queries";
import { listMindfulnessSessions } from "@/src/features/mindfulness/repository";
import { breathingSlugs } from "@/src/constants/breathing";
import { createTestQueryClient } from "@/test/render-with-providers";

jest.mock("@/src/features/mindfulness/repository", () => ({
  listMindfulnessSessions: jest.fn(),
  saveMindfulnessSession: jest.fn(),
}));

const mockList = listMindfulnessSessions as jest.MockedFunction<typeof listMindfulnessSessions>;

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

  it("returns only sessions whose exerciseName is in the breathing allowlist", async () => {
    const breathingName = breathingSlugs[0];
    mockList.mockResolvedValue([
      { id: "1", exerciseName: breathingName } as never,
      { id: "2", exerciseName: "not-a-breathing-slug" } as never,
    ]);

    const { result } = renderHook(() => useBreathingSessions("user-1"), {
      wrapper: makeWrapper(client),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual([{ id: "1", exerciseName: breathingName }]);
  });

  it("does not fetch when userId is null (query disabled)", () => {
    renderHook(() => useBreathingSessions(null), { wrapper: makeWrapper(client) });
    expect(mockList).not.toHaveBeenCalled();
  });
});
