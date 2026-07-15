import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react-native";
import type { PropsWithChildren } from "react";

import {
  useAddStep,
  useCreateRoutine,
  useDeleteRoutine,
  useRemoveStep,
  useReorderSteps,
  useRoutine,
  useRoutines,
  useUpdateRoutine,
} from "@/src/features/routines/queries";
import {
  addStep,
  createRoutine,
  deleteRoutine,
  getRoutine,
  listRoutinesWithSteps,
  removeStep,
  reorderSteps,
  updateRoutine,
} from "@/src/features/routines/repository";
import { createTestQueryClient } from "@/test/render-with-providers";

jest.mock("@/src/features/routines/repository", () => ({
  addStep: jest.fn(),
  createRoutine: jest.fn(),
  deleteRoutine: jest.fn(),
  getRoutine: jest.fn(),
  listRoutinesWithSteps: jest.fn(),
  removeStep: jest.fn(),
  reorderSteps: jest.fn(),
  updateRoutine: jest.fn(),
}));

const mockListRoutinesWithSteps = listRoutinesWithSteps as jest.MockedFunction<
  typeof listRoutinesWithSteps
>;
const mockGetRoutine = getRoutine as jest.MockedFunction<typeof getRoutine>;
const mockCreateRoutine = createRoutine as jest.MockedFunction<typeof createRoutine>;
const mockUpdateRoutine = updateRoutine as jest.MockedFunction<typeof updateRoutine>;
const mockDeleteRoutine = deleteRoutine as jest.MockedFunction<typeof deleteRoutine>;
const mockAddStep = addStep as jest.MockedFunction<typeof addStep>;
const mockRemoveStep = removeStep as jest.MockedFunction<typeof removeStep>;
const mockReorderSteps = reorderSteps as jest.MockedFunction<typeof reorderSteps>;

// The single invalidation key every routine mutation fans out to.
const routinesAllKey = ["routines"] as const;

function makeWrapper(client: QueryClient) {
  return function wrapper({ children }: PropsWithChildren) {
    return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
  };
}

describe("useRoutines", () => {
  let client: QueryClient;
  beforeEach(() => {
    jest.clearAllMocks();
    client = createTestQueryClient();
  });

  it("fetches the routines-with-steps list under the list key", async () => {
    mockListRoutinesWithSteps.mockResolvedValue([]);

    const { result } = renderHook(() => useRoutines("u1"), { wrapper: makeWrapper(client) });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockListRoutinesWithSteps).toHaveBeenCalledWith("u1");
    expect(client.getQueryState(["routines", "list", "u1"])).toBeDefined();
  });

  it("does not fetch when userId is null (enabled gate)", () => {
    renderHook(() => useRoutines(null), { wrapper: makeWrapper(client) });
    expect(mockListRoutinesWithSteps).not.toHaveBeenCalled();
    // The anonymous fallback key is still what the disabled query registers under.
    expect(client.getQueryState(["routines", "list", "anonymous"])).toBeDefined();
  });
});

// ---------------------------------------------------------------------------
// useRoutine detail hook: enabled = Boolean(userId && id). Cover all three
// branches of the two-id gate.
// ---------------------------------------------------------------------------
describe("useRoutine - two-id enabled gate", () => {
  let client: QueryClient;
  beforeEach(() => {
    jest.clearAllMocks();
    client = createTestQueryClient();
  });

  it("does not fetch when userId is null", () => {
    renderHook(() => useRoutine(null, "r1"), { wrapper: makeWrapper(client) });
    expect(mockGetRoutine).not.toHaveBeenCalled();
  });

  it("does not fetch when the routine id is null", () => {
    renderHook(() => useRoutine("u1", null), { wrapper: makeWrapper(client) });
    expect(mockGetRoutine).not.toHaveBeenCalled();
    expect(client.getQueryState(["routines", "detail", "anonymous", ""])).toBeDefined();
  });

  it("fetches with the detail key when both userId and id are present", async () => {
    mockGetRoutine.mockResolvedValue(null);

    const { result } = renderHook(() => useRoutine("u1", "r1"), { wrapper: makeWrapper(client) });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockGetRoutine).toHaveBeenCalledWith("u1", "r1");
    expect(client.getQueryState(["routines", "detail", "u1", "r1"])).toBeDefined();
  });
});

// ---------------------------------------------------------------------------
// Mutation hooks: each onSuccess carries `if (!userId) return;` and, for a real
// user, invalidates the routineKeys.all prefix. Cover both branches per hook.
// ---------------------------------------------------------------------------
const mutationHooks = [
  ["useCreateRoutine", useCreateRoutine, mockCreateRoutine, { name: "Morning" }],
  ["useUpdateRoutine", useUpdateRoutine, mockUpdateRoutine, { id: "r1", patch: { name: "n" } }],
  ["useAddStep", useAddStep, mockAddStep, { routineId: "r1", toolId: "mood", position: 0 }],
  [
    "useReorderSteps",
    useReorderSteps,
    mockReorderSteps,
    { routineId: "r1", orderedStepIds: ["s1", "s2"] },
  ],
] as const;

describe.each(mutationHooks)("%s onSuccess guard", (_name, useHook, repoFn, variables) => {
  it("runs the mutation and invalidates the routines prefix for a real user", async () => {
    (repoFn as jest.Mock).mockResolvedValue({ id: "1" });
    const client = createTestQueryClient();
    const spy = jest.spyOn(client, "invalidateQueries");
    const { result } = renderHook(() => (useHook as (u: string | null) => any)("u1"), {
      wrapper: makeWrapper(client),
    });

    await result.current.mutateAsync(variables as never);

    expect(repoFn).toHaveBeenCalled();
    const queryKeys = spy.mock.calls.map((c) => (c[0] as { queryKey?: unknown }).queryKey);
    expect(queryKeys).toContainEqual(routinesAllKey);
  });

  it("skips invalidation when userId is null", async () => {
    (repoFn as jest.Mock).mockResolvedValue({ id: "1" });
    const client = createTestQueryClient();
    const spy = jest.spyOn(client, "invalidateQueries");
    const { result } = renderHook(() => (useHook as (u: string | null) => any)(null), {
      wrapper: makeWrapper(client),
    });

    await result.current.mutateAsync(variables as never);

    expect(repoFn).toHaveBeenCalled();
    expect(spy).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// useDeleteRoutine / useRemoveStep delegate to useDeleteMutation(userId, fn,
// routineKeys.all). Exercise the real-user path: deleteFn called with
// (userId, id) and the routines prefix invalidated.
// ---------------------------------------------------------------------------
describe("useDeleteRoutine", () => {
  it("calls deleteRoutine with (userId, id) and invalidates the routines prefix", async () => {
    mockDeleteRoutine.mockResolvedValue(undefined);
    const client = createTestQueryClient();
    const spy = jest.spyOn(client, "invalidateQueries");
    const { result } = renderHook(() => useDeleteRoutine("u1"), { wrapper: makeWrapper(client) });

    await result.current.mutateAsync("r1" as never);

    expect(mockDeleteRoutine).toHaveBeenCalledWith("u1", "r1");
    const queryKeys = spy.mock.calls.map((c) => (c[0] as { queryKey?: unknown }).queryKey);
    expect(queryKeys).toContainEqual(routinesAllKey);
  });
});

describe("useRemoveStep", () => {
  it("calls removeStep with (userId, stepId) and invalidates the routines prefix", async () => {
    mockRemoveStep.mockResolvedValue(undefined);
    const client = createTestQueryClient();
    const spy = jest.spyOn(client, "invalidateQueries");
    const { result } = renderHook(() => useRemoveStep("u1"), { wrapper: makeWrapper(client) });

    await result.current.mutateAsync("s1" as never);

    expect(mockRemoveStep).toHaveBeenCalledWith("u1", "s1");
    const queryKeys = spy.mock.calls.map((c) => (c[0] as { queryKey?: unknown }).queryKey);
    expect(queryKeys).toContainEqual(routinesAllKey);
  });
});
