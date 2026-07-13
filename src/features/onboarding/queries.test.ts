import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook } from "@testing-library/react-native";
import type { PropsWithChildren } from "react";
import { createElement } from "react";

import {
  useApplyWidgetSuggestions,
  useCompleteAppOnboarding,
} from "@/src/features/onboarding/queries";
import { applyWidgetRecommendations } from "@/src/features/onboarding/repository";
import { createTestQueryClient } from "@/test/render-with-providers";

jest.mock("@/src/features/onboarding/repository", () => ({
  applyWidgetRecommendations: jest.fn().mockResolvedValue(undefined),
}));

const mockApplyWidgetRecommendations = applyWidgetRecommendations as jest.MockedFunction<
  typeof applyWidgetRecommendations
>;

function makeWrapper(client: QueryClient) {
  return function wrapper({ children }: PropsWithChildren) {
    return createElement(QueryClientProvider, { client }, children);
  };
}

describe("useCompleteAppOnboarding", () => {
  let client: QueryClient;

  beforeEach(() => {
    jest.clearAllMocks();
    client = createTestQueryClient();
  });

  it("skip: marks onboarding complete, preserves concerns, and keeps Home empty", async () => {
    const { result } = renderHook(() => useCompleteAppOnboarding("user-1"), {
      wrapper: makeWrapper(client),
    });

    await act(async () => {
      await result.current.mutateAsync({ selectedConcerns: null, widgetIds: [] });
    });

    expect(mockApplyWidgetRecommendations).toHaveBeenCalledWith({
      widgetIds: [],
      selectedConcerns: null,
      completionMode: "skip",
    });
  });

  it("finish with picks: saves concerns and applies the widget preset", async () => {
    const { result } = renderHook(() => useCompleteAppOnboarding("user-1"), {
      wrapper: makeWrapper(client),
    });

    await act(async () => {
      await result.current.mutateAsync({
        selectedConcerns: ["sleep"],
        widgetIds: ["sleep-latest", "meditation-pick"],
      });
    });

    expect(mockApplyWidgetRecommendations).toHaveBeenCalledWith({
      widgetIds: ["sleep-latest", "meditation-pick"],
      selectedConcerns: ["sleep"],
      completionMode: "finish",
    });
  });

  it("finish with no picks: saves empty concerns and keeps Home empty", async () => {
    const { result } = renderHook(() => useCompleteAppOnboarding("user-1"), {
      wrapper: makeWrapper(client),
    });

    await act(async () => {
      await result.current.mutateAsync({ selectedConcerns: [], widgetIds: [] });
    });

    expect(mockApplyWidgetRecommendations).toHaveBeenCalledWith({
      widgetIds: [],
      selectedConcerns: [],
      completionMode: "finish",
    });
  });
});

describe("useApplyWidgetSuggestions", () => {
  beforeEach(() => jest.clearAllMocks());

  it("updates the empty dashboard without changing onboarding completion", async () => {
    const client = createTestQueryClient();
    const { result } = renderHook(() => useApplyWidgetSuggestions("user-1"), {
      wrapper: makeWrapper(client),
    });

    await act(async () => {
      await result.current.mutateAsync({
        selectedConcerns: ["sleep"],
        widgetIds: ["mood-checkin", "sleep-latest"],
      });
    });

    expect(mockApplyWidgetRecommendations).toHaveBeenCalledWith({
      widgetIds: ["mood-checkin", "sleep-latest"],
      selectedConcerns: ["sleep"],
      completionMode: null,
    });
  });
});
