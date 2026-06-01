import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react-native";
import type { PropsWithChildren } from "react";

import { useBreathingExercises } from "@/src/features/breathing/exercises-queries";
import { listBreathingExercises } from "@/src/features/breathing/exercises-repository";
import { createTestQueryClient } from "@/test/render-with-providers";

jest.mock("@/src/features/breathing/exercises-repository", () => ({
  listBreathingExercises: jest.fn(),
  getBreathingExercise: jest.fn(),
  saveBreathingExercise: jest.fn(),
  deleteBreathingExercise: jest.fn(),
}));

const mockList = listBreathingExercises as jest.MockedFunction<typeof listBreathingExercises>;

function makeWrapper(client: QueryClient) {
  return function wrapper({ children }: PropsWithChildren) {
    return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
  };
}

describe("useBreathingExercises", () => {
  let client: QueryClient;
  beforeEach(() => {
    jest.clearAllMocks();
    client = createTestQueryClient();
  });

  it("fetches the user's custom exercises", async () => {
    mockList.mockResolvedValue([{ id: "e-1", name: "Evening" } as never]);
    const { result } = renderHook(() => useBreathingExercises("user-1"), {
      wrapper: makeWrapper(client),
    });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockList).toHaveBeenCalledWith("user-1");
    expect(result.current.data).toEqual([{ id: "e-1", name: "Evening" }]);
  });

  it("does not fetch when userId is null", () => {
    renderHook(() => useBreathingExercises(null), { wrapper: makeWrapper(client) });
    expect(mockList).not.toHaveBeenCalled();
  });
});
