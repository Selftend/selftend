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

/**
 * ☠️ The constraint the manage-emotions surface is BUILT around, pinned here because
 * nothing else can catch it (#1335).
 *
 * `MutationObserver.#notify` gates every mutate-level callback on
 * `if (this.#mutateOptions && this.hasListeners())`. Unmount the component that called
 * `mutate` and the observer loses its listener, so a failure arriving afterwards reaches
 * NOBODY - and since these mutations also suppress the global toast, the write would
 * fail in total silence.
 *
 * That is why `ManageEmotionsModal` owns all four mutations and the editor owns none:
 * the editor closes itself on submit, so a write it owned would be exactly this case.
 *
 * ⚠️ The timing is the whole test. An error that rejects SYNCHRONOUSLY still gets
 * through, because React has not committed the unmount yet - measuring it that way is
 * what makes this look safe when it is not.
 */
describe("a mutate-level callback after its caller unmounts", () => {
  function renderUnmountingCaller(rejectAfterMs: number) {
    const onError = jest.fn();
    const { result, unmount } = renderHook(() => useUpsertEmotionPreference("user-1"), {
      wrapper: makeWrapper(client),
    });
    mockUpsert.mockImplementation(
      () =>
        new Promise((_resolve, reject) => {
          setTimeout(() => reject(new TypeError("Network request failed")), rejectAfterMs);
        }),
    );
    result.current.mutate({ emotionId: "joy" }, { onError });
    return { onError, unmount };
  }

  it("is DROPPED when the failure lands after the unmount (the real network case)", async () => {
    const { onError, unmount } = renderUnmountingCaller(30);

    unmount();
    await new Promise((resolve) => setTimeout(resolve, 120));

    expect(onError).not.toHaveBeenCalled();
  });

  it("still runs while the caller is mounted, so the list view's own writes report", async () => {
    const { onError } = renderUnmountingCaller(30);

    await waitFor(() => expect(onError).toHaveBeenCalledTimes(1));
  });
});
