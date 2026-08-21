import { QueryClientProvider, type QueryClient } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react-native";
import type { PropsWithChildren } from "react";

import {
  useAddCustomEmotion,
  useRemoveEmotion,
  useReorderEmotions,
  useUpsertEmotionPreference,
} from "@/src/features/mood/emotion-preferences-queries";
import * as repo from "@/src/features/mood/emotion-preferences-repository";
import { createAppQueryClient } from "@/src/lib/query-client";
import { useToastStore } from "@/src/stores/toast-store";

jest.mock("@/src/features/mood/emotion-preferences-repository", () => ({
  getEmotionsSeeded: jest.fn(),
  insertDefaultEmotions: jest.fn(),
  listEmotionPreferences: jest.fn(),
  listEmotionUsageCounts: jest.fn(),
  markEmotionsSeeded: jest.fn(),
  setEmotionOrder: jest.fn(),
  upsertEmotionPreference: jest.fn(),
}));

const mockUpsert = repo.upsertEmotionPreference as jest.MockedFunction<
  typeof repo.upsertEmotionPreference
>;
const mockSetOrder = repo.setEmotionOrder as jest.MockedFunction<typeof repo.setEmotionOrder>;

function makeWrapper(client: QueryClient) {
  return function wrapper({ children }: PropsWithChildren) {
    return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
  };
}

/**
 * The REAL app client, not the test one: the global save-failed toast lives on its
 * `MutationCache`, so a stripped-down client would make every assertion below vacuous.
 */
let client: QueryClient;

beforeEach(() => {
  jest.clearAllMocks();
  mockUpsert.mockRejectedValue(new TypeError("Network request failed"));
  mockSetOrder.mockRejectedValue(new TypeError("Network request failed"));
  client = createAppQueryClient();
  // The error toast is sticky, so the real teardown runs between cases.
  useToastStore.getState().clearToasts();
});

afterEach(() => {
  // ☠️ `client.clear()` alone is not enough. Building a mutation schedules a long
  // garbage-collection timer, and production owns a process-long client - these
  // short-lived ones keep Jest alive past the last test unless each is destroyed.
  for (const mutation of client.getMutationCache().getAll()) mutation.destroy();
  client.clear();
});

/**
 * ☠️ The control, and it is what stops the four cases below from passing for the wrong
 * reason. Every one of them asserts an ABSENCE, so a suite where the toast never fires
 * at all - a mocked store, a client without the MutationCache - would be green and prove
 * nothing. This proves the toast machinery is live in this file first.
 */
it("raises the global toast for a failing mutation that does NOT opt out", async () => {
  const mutation = client.getMutationCache().build(client, {
    mutationFn: () => Promise.reject(new TypeError("Network request failed")),
  });

  await mutation.execute(undefined).catch(() => {});

  expect(useToastStore.getState().visible).toMatchObject({ tone: "error" });
  mutation.destroy();
});

/**
 * All four writes of the manage-emotions surface, which is an opaque `pageSheet` that
 * stays OPEN across every one of them. On Android nothing can lift a toast above a
 * native modal - `FullWindowOverlay` is iOS-only - so the global toast would land
 * behind the sheet that raised it. The modal renders the failure inline instead
 * (#1335, spec §10).
 */
describe.each([
  ["useUpsertEmotionPreference", () => useUpsertEmotionPreference("user-1"), { emotionId: "joy" }],
  [
    "useAddCustomEmotion",
    () => useAddCustomEmotion("user-1"),
    { emotionId: "custom_1", name: "Wistful", emoji: "🌧️", position: 0 },
  ],
  [
    "useRemoveEmotion",
    () => useRemoveEmotion("user-1"),
    { emotionId: "joy", isCustom: false } as never,
  ],
  ["useReorderEmotions", () => useReorderEmotions("user-1"), ["joy", "sad"] as never],
])("%s", (_name, useHook, variables) => {
  it("stays quiet when its write fails, leaving the error to the modal", async () => {
    const { result } = renderHook(() => useHook(), { wrapper: makeWrapper(client) });

    result.current.mutate(variables as never);

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(useToastStore.getState().visible).toBeNull();
  });

  it("still reports the failure to its caller, so the modal has something to show", async () => {
    const onError = jest.fn();
    const { result } = renderHook(() => useHook(), { wrapper: makeWrapper(client) });

    result.current.mutate(variables as never, { onError });

    await waitFor(() => expect(onError).toHaveBeenCalledTimes(1));
  });
});
