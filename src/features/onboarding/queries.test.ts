import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook } from "@testing-library/react-native";
import type { PropsWithChildren } from "react";
import { createElement } from "react";

import { useCompleteAppOnboarding } from "@/src/features/onboarding/queries";
import { resolveConcernWidgetIds } from "@/src/features/onboarding/concerns";
import { updateOnboardingPreferences } from "@/src/features/settings/repository";
import { updateWidgetPositions } from "@/src/features/home/widget-repository";
import { createTestQueryClient } from "@/test/render-with-providers";

jest.mock("@/src/features/settings/repository", () => ({
  updateOnboardingPreferences: jest.fn().mockResolvedValue(undefined),
}));
jest.mock("@/src/features/home/widget-repository", () => ({
  updateWidgetPositions: jest.fn().mockResolvedValue(undefined),
}));

const mockUpdateOnboardingPreferences = updateOnboardingPreferences as jest.MockedFunction<
  typeof updateOnboardingPreferences
>;
const mockUpdateWidgetPositions = updateWidgetPositions as jest.MockedFunction<
  typeof updateWidgetPositions
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

  it("skip: marks onboarding complete without touching concerns or widgets", async () => {
    const { result } = renderHook(() => useCompleteAppOnboarding("user-1"), {
      wrapper: makeWrapper(client),
    });

    await act(async () => {
      await result.current.mutateAsync({ selectedConcerns: null });
    });

    expect(mockUpdateOnboardingPreferences).toHaveBeenCalledWith("user-1", {
      appOnboardingCompleted: true,
      appOnboardingCompletedVia: "skip",
      appOnboardingCompletedAt: expect.any(String),
    });
    expect(mockUpdateWidgetPositions).not.toHaveBeenCalled();
  });

  it("finish with picks: saves concerns and applies the widget preset", async () => {
    const { result } = renderHook(() => useCompleteAppOnboarding("user-1"), {
      wrapper: makeWrapper(client),
    });

    await act(async () => {
      await result.current.mutateAsync({ selectedConcerns: ["sleep"] });
    });

    expect(mockUpdateOnboardingPreferences).toHaveBeenCalledWith("user-1", {
      appOnboardingCompleted: true,
      appOnboardingCompletedVia: "finish",
      appOnboardingCompletedAt: expect.any(String),
      selectedConcerns: ["sleep"],
    });
    expect(mockUpdateWidgetPositions).toHaveBeenCalledWith(
      "user-1",
      resolveConcernWidgetIds(["sleep"]),
    );
  });

  it("finish with no picks: saves empty concerns, leaves widgets alone", async () => {
    const { result } = renderHook(() => useCompleteAppOnboarding("user-1"), {
      wrapper: makeWrapper(client),
    });

    await act(async () => {
      await result.current.mutateAsync({ selectedConcerns: [] });
    });

    expect(mockUpdateOnboardingPreferences).toHaveBeenCalledWith("user-1", {
      appOnboardingCompleted: true,
      appOnboardingCompletedVia: "finish",
      appOnboardingCompletedAt: expect.any(String),
      selectedConcerns: [],
    });
    expect(mockUpdateWidgetPositions).not.toHaveBeenCalled();
  });
});
