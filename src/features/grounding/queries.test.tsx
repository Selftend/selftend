import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react-native";
import type { PropsWithChildren } from "react";

import { useGroundingSessions } from "@/src/features/grounding/queries";
import { listMindfulnessSessions } from "@/src/features/mindfulness/repository";
import { groundingSlugs } from "@/src/constants/grounding";
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

describe("useGroundingSessions", () => {
  let client: QueryClient;
  beforeEach(() => {
    jest.clearAllMocks();
    client = createTestQueryClient();
  });

  it("returns only sessions whose exerciseName is in the grounding allowlist", async () => {
    const groundingName = groundingSlugs[0];
    mockList.mockResolvedValue([
      { id: "1", exerciseName: groundingName } as never,
      { id: "2", exerciseName: "not-a-grounding-slug" } as never,
    ]);

    const { result } = renderHook(() => useGroundingSessions("user-1"), {
      wrapper: makeWrapper(client),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual([{ id: "1", exerciseName: groundingName }]);
  });

  it("filters out all sessions that are not in the grounding allowlist", async () => {
    mockList.mockResolvedValue([
      { id: "1", exerciseName: "box-breathing" } as never,
      { id: "2", exerciseName: "unknown" } as never,
    ]);

    const { result } = renderHook(() => useGroundingSessions("user-1"), {
      wrapper: makeWrapper(client),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual([]);
  });

  it("returns all matching sessions when all are in the allowlist", async () => {
    mockList.mockResolvedValue(
      groundingSlugs.map((slug, i) => ({ id: String(i), exerciseName: slug }) as never),
    );

    const { result } = renderHook(() => useGroundingSessions("user-1"), {
      wrapper: makeWrapper(client),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toHaveLength(groundingSlugs.length);
  });

  it("does not fetch when userId is null (query disabled)", () => {
    renderHook(() => useGroundingSessions(null), { wrapper: makeWrapper(client) });
    expect(mockList).not.toHaveBeenCalled();
  });
});
