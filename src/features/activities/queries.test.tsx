import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react-native";
import type { PropsWithChildren } from "react";

import {
  useActivities,
  useActivity,
  useCompleteActivity,
  useSaveActivity,
} from "@/src/features/activities/queries";
import * as repo from "@/src/features/activities/repository";
import { createTestQueryClient } from "@/test/render-with-providers";

// Automock of the repository re-export barrel does not reliably yield callable
// mock fns for every named export, so list each explicitly as a jest.fn().
jest.mock("@/src/features/activities/repository", () => ({
  completeActivity: jest.fn(),
  getActivity: jest.fn(),
  listActivities: jest.fn(),
  saveActivity: jest.fn(),
}));

function wrap(client: QueryClient) {
  return function Wrapper({ children }: PropsWithChildren) {
    return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
  };
}

beforeEach(() => {
  jest.clearAllMocks();
  // Every repo fn resolves to a benign value so queryFn/mutationFn don't throw.
  for (const fn of Object.values(repo)) {
    if (typeof fn === "function") (fn as jest.Mock).mockResolvedValue(undefined);
  }
});

// ---------------------------------------------------------------------------
// useActivities: enabled = Boolean(userId).
// ---------------------------------------------------------------------------
describe("useActivities enabled gate", () => {
  it("does not fetch when userId is null", () => {
    const client = createTestQueryClient();
    renderHook(() => useActivities(null), { wrapper: wrap(client) });
    expect(repo.listActivities).not.toHaveBeenCalled();
  });

  it("fetches with the real userId when present", async () => {
    (repo.listActivities as jest.Mock).mockResolvedValue([{ id: "a1" }]);
    const client = createTestQueryClient();
    const { result } = renderHook(() => useActivities("u1"), { wrapper: wrap(client) });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(repo.listActivities).toHaveBeenCalledWith("u1");
    expect(result.current.data).toEqual([{ id: "a1" }]);
  });
});

// ---------------------------------------------------------------------------
// useActivity: enabled = Boolean(userId && activityId). Cover all three gate
// states: userId missing, activityId missing, both present.
// ---------------------------------------------------------------------------
describe("useActivity enabled gate", () => {
  it("does not fetch when userId is null", () => {
    const client = createTestQueryClient();
    renderHook(() => useActivity(null, "act-1"), { wrapper: wrap(client) });
    expect(repo.getActivity).not.toHaveBeenCalled();
  });

  it("does not fetch when activityId is null", () => {
    const client = createTestQueryClient();
    renderHook(() => useActivity("u1", null), { wrapper: wrap(client) });
    expect(repo.getActivity).not.toHaveBeenCalled();
  });

  it("fetches with both ids when present", async () => {
    (repo.getActivity as jest.Mock).mockResolvedValue({ id: "act-1" });
    const client = createTestQueryClient();
    const { result } = renderHook(() => useActivity("u1", "act-1"), { wrapper: wrap(client) });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(repo.getActivity).toHaveBeenCalledWith("u1", "act-1");
    expect(result.current.data).toEqual({ id: "act-1" });
  });
});

// ---------------------------------------------------------------------------
// useSaveActivity: onSuccess guard `if (!userId) return;` then invalidates the
// list key and the detail key keyed off the resolved activity id.
// ---------------------------------------------------------------------------
describe("useSaveActivity onSuccess guard", () => {
  it("invalidates the list and detail keys for a real user", async () => {
    (repo.saveActivity as jest.Mock).mockResolvedValue({ id: "act-1" });
    const client = createTestQueryClient();
    const spy = jest.spyOn(client, "invalidateQueries");
    const { result } = renderHook(() => useSaveActivity("u1"), { wrapper: wrap(client) });

    await result.current.mutateAsync({
      input: { activityName: "walk" },
      activityId: "act-1",
    } as never);

    expect(repo.saveActivity).toHaveBeenCalledWith("u1", { activityName: "walk" }, "act-1");
    const queryKeys = spy.mock.calls.map((c) => (c[0] as { queryKey?: unknown }).queryKey);
    expect(queryKeys).toContainEqual(["activities", "list", "u1"]);
    expect(queryKeys).toContainEqual(["activities", "detail", "u1", "act-1"]);
  });

  it("skips invalidation when userId is null", async () => {
    (repo.saveActivity as jest.Mock).mockResolvedValue({ id: "act-1" });
    const client = createTestQueryClient();
    const spy = jest.spyOn(client, "invalidateQueries");
    const { result } = renderHook(() => useSaveActivity(null), { wrapper: wrap(client) });

    await result.current.mutateAsync({ input: { activityName: "walk" } } as never);

    expect(repo.saveActivity).toHaveBeenCalled();
    expect(spy).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// useCompleteActivity: same onSuccess guard + list/detail invalidation.
// ---------------------------------------------------------------------------
describe("useCompleteActivity onSuccess guard", () => {
  it("invalidates the list and detail keys for a real user", async () => {
    (repo.completeActivity as jest.Mock).mockResolvedValue({ id: "act-1" });
    const client = createTestQueryClient();
    const spy = jest.spyOn(client, "invalidateQueries");
    const { result } = renderHook(() => useCompleteActivity("u1"), { wrapper: wrap(client) });

    await result.current.mutateAsync({ activityId: "act-1", moodAfter: 4 } as never);

    expect(repo.completeActivity).toHaveBeenCalledWith("u1", "act-1", 4);
    const queryKeys = spy.mock.calls.map((c) => (c[0] as { queryKey?: unknown }).queryKey);
    expect(queryKeys).toContainEqual(["activities", "list", "u1"]);
    expect(queryKeys).toContainEqual(["activities", "detail", "u1", "act-1"]);
  });

  it("skips invalidation when userId is null", async () => {
    (repo.completeActivity as jest.Mock).mockResolvedValue({ id: "act-1" });
    const client = createTestQueryClient();
    const spy = jest.spyOn(client, "invalidateQueries");
    const { result } = renderHook(() => useCompleteActivity(null), { wrapper: wrap(client) });

    await result.current.mutateAsync({ activityId: "act-1", moodAfter: null } as never);

    expect(repo.completeActivity).toHaveBeenCalled();
    expect(spy).not.toHaveBeenCalled();
  });
});
