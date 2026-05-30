import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react-native";
import type { PropsWithChildren } from "react";

import {
  useCommittedActions,
  useDeleteCommittedAction,
  useSaveCommittedAction,
} from "@/src/features/act/queries";
import {
  deleteCommittedAction,
  listCommittedActions,
  saveCommittedAction,
} from "@/src/features/act/repository";
import { createTestQueryClient } from "@/test/render-with-providers";

jest.mock("@/src/features/act/repository", () => ({
  deleteActionStep: jest.fn(),
  deleteChoicePoint: jest.fn(),
  deleteCommittedAction: jest.fn(),
  deleteConnectionLog: jest.fn(),
  deleteDefusionLog: jest.fn(),
  deleteExpansionLog: jest.fn(),
  deleteObservingSelfSession: jest.fn(),
  getChoicePoint: jest.fn(),
  getCommittedAction: jest.fn(),
  getConnectionLog: jest.fn(),
  getDefusionLog: jest.fn(),
  getExpansionLog: jest.fn(),
  getObservingSelfSession: jest.fn(),
  getValueEntryByDomain: jest.fn(),
  listActionSteps: jest.fn(),
  listAllActionSteps: jest.fn(),
  listBullsEyeSnapshots: jest.fn(),
  listChoicePoints: jest.fn(),
  listCommittedActions: jest.fn(),
  listConnectionLogs: jest.fn(),
  listDefusionLogs: jest.fn(),
  listExpansionLogs: jest.fn(),
  listObservingSelfSessions: jest.fn(),
  listUrgeSurfLogs: jest.fn(),
  listValueEntries: jest.fn(),
  saveActionStep: jest.fn(),
  saveBullsEyeSnapshot: jest.fn(),
  saveChoicePoint: jest.fn(),
  saveCommittedAction: jest.fn(),
  saveConnectionLog: jest.fn(),
  saveDefusionLog: jest.fn(),
  saveExpansionLog: jest.fn(),
  saveObservingSelfSession: jest.fn(),
  saveUrgeSurfLog: jest.fn(),
  toggleActionStep: jest.fn(),
  updateCommittedAction: jest.fn(),
  upsertValueEntry: jest.fn(),
}));

const mockSaveCommittedAction = saveCommittedAction as jest.MockedFunction<
  typeof saveCommittedAction
>;
const mockDeleteCommittedAction = deleteCommittedAction as jest.MockedFunction<
  typeof deleteCommittedAction
>;
const mockListCommittedActions = listCommittedActions as jest.MockedFunction<
  typeof listCommittedActions
>;

function makeWrapper(client: QueryClient) {
  return function wrapper({ children }: PropsWithChildren) {
    return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
  };
}

describe("committedActionListPrefix invalidation", () => {
  beforeEach(() => jest.clearAllMocks());

  it("useSaveCommittedAction invalidates the prefix key, which covers all status filters", async () => {
    mockSaveCommittedAction.mockResolvedValue({ id: "a1" } as never);
    // Pre-seed two status-filtered list queries in the cache
    mockListCommittedActions.mockResolvedValue([]);

    const client = createTestQueryClient();
    const spy = jest.spyOn(client, "invalidateQueries");

    // Pre-seed two list queries with different status filters
    client.setQueryData(["act", "committedAction", "list", "u1", "active"], []);
    client.setQueryData(["act", "committedAction", "list", "u1", "completed"], []);

    const { result } = renderHook(() => useSaveCommittedAction("u1"), {
      wrapper: makeWrapper(client),
    });

    await act(async () => {
      await result.current.mutateAsync({ title: "Exercise" } as never);
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    // Should have called invalidateQueries with the prefix key
    const queryKeys = spy.mock.calls.map((c) => (c[0] as { queryKey?: unknown }).queryKey);
    expect(queryKeys).toContainEqual(["act", "committedAction", "list", "u1"]);
  });

  it("useDeleteCommittedAction invalidates the prefix key", async () => {
    mockDeleteCommittedAction.mockResolvedValue();

    const client = createTestQueryClient();
    const spy = jest.spyOn(client, "invalidateQueries");

    const { result } = renderHook(() => useDeleteCommittedAction("u1"), {
      wrapper: makeWrapper(client),
    });

    await act(async () => {
      await result.current.mutateAsync("a1");
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    const queryKeys = spy.mock.calls.map((c) => (c[0] as { queryKey?: unknown }).queryKey);
    expect(queryKeys).toContainEqual(["act", "committedAction", "list", "u1"]);
  });

  it("prefix key is a prefix of the status-filtered key (structural check)", () => {
    // The committedActionListPrefix key ["act","committedAction","list","u1"] is a
    // prefix of committedActionList key ["act","committedAction","list","u1","active"].
    // TanStack Query's prefix invalidation relies on this structure.
    const prefix = ["act", "committedAction", "list", "u1"];
    const withActive = ["act", "committedAction", "list", "u1", "active"];
    const withCompleted = ["act", "committedAction", "list", "u1", "completed"];
    const withUndefined = ["act", "committedAction", "list", "u1", undefined];

    expect(withActive.slice(0, prefix.length)).toEqual(prefix);
    expect(withCompleted.slice(0, prefix.length)).toEqual(prefix);
    expect(withUndefined.slice(0, prefix.length)).toEqual(prefix);
  });

  it("pre-seeded status-filtered queries are stale after save mutation invalidates prefix", async () => {
    mockSaveCommittedAction.mockResolvedValue({ id: "a1" } as never);
    mockListCommittedActions.mockResolvedValue([]);

    const client = createTestQueryClient();

    // Pre-seed active and completed variants in the cache as non-stale
    await client.prefetchQuery({
      queryKey: ["act", "committedAction", "list", "u1", "active"],
      queryFn: () => Promise.resolve([{ id: "existing" }]),
    });
    await client.prefetchQuery({
      queryKey: ["act", "committedAction", "list", "u1", "completed"],
      queryFn: () => Promise.resolve([]),
    });

    // Both should be fresh initially
    expect(
      client.getQueryState(["act", "committedAction", "list", "u1", "active"])?.isInvalidated,
    ).toBeFalsy();
    expect(
      client.getQueryState(["act", "committedAction", "list", "u1", "completed"])?.isInvalidated,
    ).toBeFalsy();

    const { result } = renderHook(() => useSaveCommittedAction("u1"), {
      wrapper: makeWrapper(client),
    });

    await act(async () => {
      await result.current.mutateAsync({ title: "Exercise" } as never);
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    // After prefix invalidation, both status-filtered queries should be invalidated
    expect(
      client.getQueryState(["act", "committedAction", "list", "u1", "active"])?.isInvalidated,
    ).toBe(true);
    expect(
      client.getQueryState(["act", "committedAction", "list", "u1", "completed"])?.isInvalidated,
    ).toBe(true);
  });
});

describe("useCommittedActions", () => {
  beforeEach(() => jest.clearAllMocks());

  it("does not fetch when userId is null", () => {
    renderHook(() => useCommittedActions(null), { wrapper: makeWrapper(createTestQueryClient()) });
    expect(mockListCommittedActions).not.toHaveBeenCalled();
  });
});
