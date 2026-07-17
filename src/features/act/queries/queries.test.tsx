import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react-native";
import type { PropsWithChildren } from "react";

import * as repo from "@/src/features/act/repository";
import {
  useActionSteps,
  useAllActionSteps,
  useBullsEyeSnapshots,
  useChoicePoint,
  useChoicePoints,
  useCommittedAction,
  useCommittedActions,
  useConnectionLog,
  useConnectionLogs,
  useDefusionLog,
  useDefusionLogs,
  useDeleteActionStep,
  useDeleteChoicePoint,
  useDeleteCommittedAction,
  useDeleteConnectionLog,
  useDeleteDefusionLog,
  useDeleteExpansionLog,
  useDeleteObservingSelfSession,
  useExpansionLog,
  useExpansionLogs,
  useObservingSelfSession,
  useObservingSelfSessions,
  useSaveActionStep,
  useSaveBullsEyeSnapshot,
  useSaveChoicePoint,
  useSaveCommittedAction,
  useSaveConnectionLog,
  useSaveDefusionLog,
  useSaveExpansionLog,
  useSaveObservingSelfSession,
  useSaveUrgeSurfLog,
  useToggleActionStep,
  useUpdateCommittedAction,
  useUpsertValueEntry,
  useUrgeSurfLogs,
  useValueEntries,
  useValueEntryByDomain,
} from "@/src/features/act/queries";
import { createTestQueryClient } from "@/test/render-with-providers";

// Automock of the repository re-export barrel does not reliably yield callable
// mock fns for every named export, so use the explicit-factory pattern already
// established in src/features/act/queries.test.tsx.
jest.mock("@/src/features/act/repository", () => ({
  deleteActionStep: jest.fn(),
  deleteChoicePoint: jest.fn(),
  deleteCommittedAction: jest.fn(),
  deleteConnectionLog: jest.fn(),
  deleteDefusionLog: jest.fn(),
  deleteExpansionLog: jest.fn(),
  deleteObservingSelfSession: jest.fn(),
  getACTProgramState: jest.fn(),
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
  upsertACTProgramState: jest.fn(),
  upsertValueEntry: jest.fn(),
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
    if (typeof fn === "function") (fn as jest.Mock).mockResolvedValue([]);
  }
});

// ---------------------------------------------------------------------------
// List hooks: enabled=false when userId is null -> queryFn never runs.
// ---------------------------------------------------------------------------
const listHooks = [
  ["useDefusionLogs", useDefusionLogs, repo.listDefusionLogs],
  ["useExpansionLogs", useExpansionLogs, repo.listExpansionLogs],
  ["useUrgeSurfLogs", useUrgeSurfLogs, repo.listUrgeSurfLogs],
  ["useConnectionLogs", useConnectionLogs, repo.listConnectionLogs],
  ["useObservingSelfSessions", useObservingSelfSessions, repo.listObservingSelfSessions],
  ["useValueEntries", useValueEntries, repo.listValueEntries],
  ["useBullsEyeSnapshots", useBullsEyeSnapshots, repo.listBullsEyeSnapshots],
  ["useCommittedActions", useCommittedActions, repo.listCommittedActions],
  ["useAllActionSteps", useAllActionSteps, repo.listAllActionSteps],
  ["useChoicePoints", useChoicePoints, repo.listChoicePoints],
] as const;

describe.each(listHooks)("%s enabled gate", (_name, useHook, repoFn) => {
  it("does not fetch when userId is null", () => {
    const client = createTestQueryClient();
    renderHook(() => (useHook as (u: string | null) => unknown)(null), { wrapper: wrap(client) });
    expect(repoFn).not.toHaveBeenCalled();
  });

  it("fetches when userId is present", async () => {
    const client = createTestQueryClient();
    renderHook(() => (useHook as (u: string | null) => unknown)("u1"), { wrapper: wrap(client) });
    await waitFor(() => expect(repoFn).toHaveBeenCalled());
  });
});

// The connection list key includes the limit (PR #124 review): the routines
// engine's wide window and the default-30 program/list consumers must live in
// separate cache entries, each fetching its own size.
describe("useConnectionLogs limit keying", () => {
  it("forwards the limit to the repository and keeps per-limit cache entries", async () => {
    const client = createTestQueryClient();
    renderHook(() => useConnectionLogs("u1", 250), { wrapper: wrap(client) });
    await waitFor(() => expect(repo.listConnectionLogs).toHaveBeenCalledWith("u1", 250));

    // A default-limit consumer on the same client fetches separately (no
    // cache-entry collision with the 250-row window).
    renderHook(() => useConnectionLogs("u1"), { wrapper: wrap(client) });
    await waitFor(() => expect(repo.listConnectionLogs).toHaveBeenCalledWith("u1", 30));
    expect(repo.listConnectionLogs).toHaveBeenCalledTimes(2);
  });
});

// ---------------------------------------------------------------------------
// Detail hooks: enabled = Boolean(userId) && Boolean(secondaryId). Cover all
// three branches: userId missing, secondaryId missing, both present.
// ---------------------------------------------------------------------------
const detailHooks = [
  ["useDefusionLog", useDefusionLog, repo.getDefusionLog],
  ["useExpansionLog", useExpansionLog, repo.getExpansionLog],
  ["useConnectionLog", useConnectionLog, repo.getConnectionLog],
  ["useObservingSelfSession", useObservingSelfSession, repo.getObservingSelfSession],
  ["useValueEntryByDomain", useValueEntryByDomain, repo.getValueEntryByDomain],
  ["useCommittedAction", useCommittedAction, repo.getCommittedAction],
  ["useChoicePoint", useChoicePoint, repo.getChoicePoint],
  ["useActionSteps", useActionSteps, repo.listActionSteps],
] as const;

describe.each(detailHooks)("%s enabled gate", (_name, useHook, repoFn) => {
  it("does not fetch when userId is null", () => {
    const client = createTestQueryClient();
    renderHook(() => (useHook as (u: string | null, s: string | null) => unknown)(null, "x1"), {
      wrapper: wrap(client),
    });
    expect(repoFn).not.toHaveBeenCalled();
  });

  it("does not fetch when the secondary id is null", () => {
    const client = createTestQueryClient();
    renderHook(() => (useHook as (u: string | null, s: string | null) => unknown)("u1", null), {
      wrapper: wrap(client),
    });
    expect(repoFn).not.toHaveBeenCalled();
  });

  it("fetches when both userId and the secondary id are present", async () => {
    const client = createTestQueryClient();
    renderHook(() => (useHook as (u: string | null, s: string | null) => unknown)("u1", "x1"), {
      wrapper: wrap(client),
    });
    await waitFor(() => expect(repoFn).toHaveBeenCalled());
  });
});

// ---------------------------------------------------------------------------
// Simple save/mutation hooks: onSuccess guard `if (!userId) return;`.
// Cover both branches: null userId (guard short-circuits, no invalidate) and a
// real userId (mutationFn + invalidate run).
// ---------------------------------------------------------------------------
const saveHooks = [
  ["useSaveDefusionLog", useSaveDefusionLog, repo.saveDefusionLog],
  ["useSaveExpansionLog", useSaveExpansionLog, repo.saveExpansionLog],
  ["useSaveUrgeSurfLog", useSaveUrgeSurfLog, repo.saveUrgeSurfLog],
  ["useSaveConnectionLog", useSaveConnectionLog, repo.saveConnectionLog],
  ["useSaveObservingSelfSession", useSaveObservingSelfSession, repo.saveObservingSelfSession],
  ["useSaveBullsEyeSnapshot", useSaveBullsEyeSnapshot, repo.saveBullsEyeSnapshot],
  ["useSaveCommittedAction", useSaveCommittedAction, repo.saveCommittedAction],
  ["useSaveChoicePoint", useSaveChoicePoint, repo.saveChoicePoint],
] as const;

describe.each(saveHooks)("%s onSuccess guard", (_name, useHook, repoFn) => {
  it("runs the mutation and invalidates for a real user", async () => {
    (repoFn as jest.Mock).mockResolvedValue({ id: "1", lifeDomain: "health" });
    const client = createTestQueryClient();
    const spy = jest.spyOn(client, "invalidateQueries");
    const { result } = renderHook(() => (useHook as (u: string | null) => any)("u1"), {
      wrapper: wrap(client),
    });
    await result.current.mutateAsync({} as never);
    expect(repoFn).toHaveBeenCalled();
    expect(spy).toHaveBeenCalled();
  });

  it("skips invalidation when userId is null", async () => {
    (repoFn as jest.Mock).mockResolvedValue({ id: "1", lifeDomain: "health" });
    const client = createTestQueryClient();
    const spy = jest.spyOn(client, "invalidateQueries");
    const { result } = renderHook(() => (useHook as (u: string | null) => any)(null), {
      wrapper: wrap(client),
    });
    await result.current.mutateAsync({} as never);
    expect(repoFn).toHaveBeenCalled();
    expect(spy).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// useUpsertValueEntry: onSuccess guard + a second invalidateQueries call keyed
// off the resolved data's lifeDomain.
// ---------------------------------------------------------------------------
describe("useUpsertValueEntry onSuccess guard", () => {
  it("invalidates both the list and the domain key for a real user", async () => {
    (repo.upsertValueEntry as jest.Mock).mockResolvedValue({ id: "1", lifeDomain: "health" });
    const client = createTestQueryClient();
    const spy = jest.spyOn(client, "invalidateQueries");
    const { result } = renderHook(() => useUpsertValueEntry("u1"), { wrapper: wrap(client) });

    await result.current.mutateAsync({} as never);

    expect(repo.upsertValueEntry).toHaveBeenCalled();
    const queryKeys = spy.mock.calls.map((c) => (c[0] as { queryKey?: unknown }).queryKey);
    expect(queryKeys).toContainEqual(["act", "values", "list", "u1"]);
    expect(queryKeys).toContainEqual(["act", "values", "domain", "u1", "health"]);
  });

  it("skips invalidation when userId is null", async () => {
    (repo.upsertValueEntry as jest.Mock).mockResolvedValue({ id: "1", lifeDomain: "health" });
    const client = createTestQueryClient();
    const spy = jest.spyOn(client, "invalidateQueries");
    const { result } = renderHook(() => useUpsertValueEntry(null), { wrapper: wrap(client) });

    await result.current.mutateAsync({} as never);

    expect(repo.upsertValueEntry).toHaveBeenCalled();
    expect(spy).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// Delete hooks built on useDeleteMutation: the guard branch itself lives in
// use-delete-mutation.ts, but exercising the real-user path still drives
// statement/function coverage of these query files.
// ---------------------------------------------------------------------------
const deleteHooks = [
  ["useDeleteDefusionLog", useDeleteDefusionLog, repo.deleteDefusionLog],
  ["useDeleteExpansionLog", useDeleteExpansionLog, repo.deleteExpansionLog],
  ["useDeleteConnectionLog", useDeleteConnectionLog, repo.deleteConnectionLog],
  ["useDeleteObservingSelfSession", useDeleteObservingSelfSession, repo.deleteObservingSelfSession],
  ["useDeleteChoicePoint", useDeleteChoicePoint, repo.deleteChoicePoint],
] as const;

describe.each(deleteHooks)("%s", (_name, useHook, repoFn) => {
  it("runs the delete mutation for a real user", async () => {
    (repoFn as jest.Mock).mockResolvedValue(undefined);
    const client = createTestQueryClient();
    const { result } = renderHook(() => (useHook as (u: string | null) => any)("u1"), {
      wrapper: wrap(client),
    });

    await result.current.mutateAsync("log-1" as never);

    expect(repoFn).toHaveBeenCalledWith("u1", "log-1");
  });
});

// ---------------------------------------------------------------------------
// committed-action.ts custom mutations (not delegated to useDeleteMutation):
// useUpdateCommittedAction and useDeleteCommittedAction each carry their own
// onSuccess guard, so both branches must be exercised here.
// ---------------------------------------------------------------------------
describe("useUpdateCommittedAction onSuccess guard", () => {
  it("invalidates the list prefix and the detail key for a real user", async () => {
    (repo.updateCommittedAction as jest.Mock).mockResolvedValue({ id: "a1" });
    const client = createTestQueryClient();
    const spy = jest.spyOn(client, "invalidateQueries");
    const { result } = renderHook(() => useUpdateCommittedAction("u1"), { wrapper: wrap(client) });

    await result.current.mutateAsync({ actionId: "a1", patch: {} } as never);

    expect(repo.updateCommittedAction).toHaveBeenCalledWith("u1", "a1", {});
    const queryKeys = spy.mock.calls.map((c) => (c[0] as { queryKey?: unknown }).queryKey);
    expect(queryKeys).toContainEqual(["act", "committedAction", "list", "u1"]);
    expect(queryKeys).toContainEqual(["act", "committedAction", "detail", "u1", "a1"]);
  });

  it("skips invalidation when userId is null", async () => {
    (repo.updateCommittedAction as jest.Mock).mockResolvedValue({ id: "a1" });
    const client = createTestQueryClient();
    const spy = jest.spyOn(client, "invalidateQueries");
    const { result } = renderHook(() => useUpdateCommittedAction(null), { wrapper: wrap(client) });

    await result.current.mutateAsync({ actionId: "a1", patch: {} } as never);

    expect(spy).not.toHaveBeenCalled();
  });
});

describe("useDeleteCommittedAction onSuccess guard", () => {
  it("invalidates the list prefix for a real user", async () => {
    (repo.deleteCommittedAction as jest.Mock).mockResolvedValue(undefined);
    const client = createTestQueryClient();
    const spy = jest.spyOn(client, "invalidateQueries");
    const { result } = renderHook(() => useDeleteCommittedAction("u1"), { wrapper: wrap(client) });

    await result.current.mutateAsync("a1" as never);

    expect(repo.deleteCommittedAction).toHaveBeenCalledWith("u1", "a1");
    const queryKeys = spy.mock.calls.map((c) => (c[0] as { queryKey?: unknown }).queryKey);
    expect(queryKeys).toContainEqual(["act", "committedAction", "list", "u1"]);
  });

  it("skips invalidation when userId is null", async () => {
    (repo.deleteCommittedAction as jest.Mock).mockResolvedValue(undefined);
    const client = createTestQueryClient();
    const spy = jest.spyOn(client, "invalidateQueries");
    const { result } = renderHook(() => useDeleteCommittedAction(null), { wrapper: wrap(client) });

    await result.current.mutateAsync("a1" as never);

    expect(spy).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// action-steps.ts custom mutations: each has its own onSuccess guard and a
// distinct variables/data shape used for the detail-key invalidation.
// ---------------------------------------------------------------------------
describe("useSaveActionStep onSuccess guard", () => {
  it("invalidates the step list and the all-steps key for a real user", async () => {
    (repo.saveActionStep as jest.Mock).mockResolvedValue({ id: "s1", actionId: "a1" });
    const client = createTestQueryClient();
    const spy = jest.spyOn(client, "invalidateQueries");
    const { result } = renderHook(() => useSaveActionStep("u1"), { wrapper: wrap(client) });

    await result.current.mutateAsync({} as never);

    const queryKeys = spy.mock.calls.map((c) => (c[0] as { queryKey?: unknown }).queryKey);
    expect(queryKeys).toContainEqual(["act", "actionStep", "list", "u1", "a1"]);
    expect(queryKeys).toContainEqual(["act", "actionStep", "all", "u1"]);
  });

  it("skips invalidation when userId is null", async () => {
    (repo.saveActionStep as jest.Mock).mockResolvedValue({ id: "s1", actionId: "a1" });
    const client = createTestQueryClient();
    const spy = jest.spyOn(client, "invalidateQueries");
    const { result } = renderHook(() => useSaveActionStep(null), { wrapper: wrap(client) });

    await result.current.mutateAsync({} as never);

    expect(spy).not.toHaveBeenCalled();
  });
});

describe("useToggleActionStep onSuccess guard", () => {
  it("invalidates the step list and the all-steps key for a real user", async () => {
    (repo.toggleActionStep as jest.Mock).mockResolvedValue({ id: "s1", actionId: "a1" });
    const client = createTestQueryClient();
    const spy = jest.spyOn(client, "invalidateQueries");
    const { result } = renderHook(() => useToggleActionStep("u1"), { wrapper: wrap(client) });

    await result.current.mutateAsync({
      stepId: "s1",
      completed: true,
      actionId: "a1",
    } as never);

    const queryKeys = spy.mock.calls.map((c) => (c[0] as { queryKey?: unknown }).queryKey);
    expect(queryKeys).toContainEqual(["act", "actionStep", "list", "u1", "a1"]);
    expect(queryKeys).toContainEqual(["act", "actionStep", "all", "u1"]);
  });

  it("skips invalidation when userId is null", async () => {
    (repo.toggleActionStep as jest.Mock).mockResolvedValue({ id: "s1", actionId: "a1" });
    const client = createTestQueryClient();
    const spy = jest.spyOn(client, "invalidateQueries");
    const { result } = renderHook(() => useToggleActionStep(null), { wrapper: wrap(client) });

    await result.current.mutateAsync({
      stepId: "s1",
      completed: true,
      actionId: "a1",
    } as never);

    expect(spy).not.toHaveBeenCalled();
  });
});

describe("useDeleteActionStep onSuccess guard", () => {
  it("invalidates using the actionId from variables (not the resolved data)", async () => {
    (repo.deleteActionStep as jest.Mock).mockResolvedValue(undefined);
    const client = createTestQueryClient();
    const spy = jest.spyOn(client, "invalidateQueries");
    const { result } = renderHook(() => useDeleteActionStep("u1"), { wrapper: wrap(client) });

    await result.current.mutateAsync({ stepId: "s1", actionId: "a1" } as never);

    expect(repo.deleteActionStep).toHaveBeenCalledWith("u1", "s1");
    const queryKeys = spy.mock.calls.map((c) => (c[0] as { queryKey?: unknown }).queryKey);
    expect(queryKeys).toContainEqual(["act", "actionStep", "list", "u1", "a1"]);
    expect(queryKeys).toContainEqual(["act", "actionStep", "all", "u1"]);
  });

  it("skips invalidation when userId is null", async () => {
    (repo.deleteActionStep as jest.Mock).mockResolvedValue(undefined);
    const client = createTestQueryClient();
    const spy = jest.spyOn(client, "invalidateQueries");
    const { result } = renderHook(() => useDeleteActionStep(null), { wrapper: wrap(client) });

    await result.current.mutateAsync({ stepId: "s1", actionId: "a1" } as never);

    expect(spy).not.toHaveBeenCalled();
  });
});
