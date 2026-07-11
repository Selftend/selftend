import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react-native";
import type { PropsWithChildren } from "react";

import {
  useGoal,
  useGoals,
  useMilestones,
  useSaveGoal,
  useToggleMilestone,
  useUpdateGoalStatus,
} from "@/src/features/goals/queries";
import {
  completeMilestone,
  deleteMilestonesForGoal,
  getGoal,
  listGoals,
  listMilestones,
  saveGoal,
  saveMilestones,
  uncompleteMilestone,
  updateGoalStatus,
} from "@/src/features/goals/repository";
import { createTestQueryClient } from "@/test/render-with-providers";

jest.mock("@/src/features/goals/repository", () => ({
  completeMilestone: jest.fn(),
  deleteMilestonesForGoal: jest.fn(),
  getGoal: jest.fn(),
  listGoals: jest.fn(),
  listMilestones: jest.fn(),
  saveGoal: jest.fn(),
  saveMilestones: jest.fn(),
  uncompleteMilestone: jest.fn(),
  updateGoalStatus: jest.fn(),
}));

const mockSaveGoal = saveGoal as jest.MockedFunction<typeof saveGoal>;
const mockDeleteMilestones = deleteMilestonesForGoal as jest.MockedFunction<
  typeof deleteMilestonesForGoal
>;
const mockSaveMilestones = saveMilestones as jest.MockedFunction<typeof saveMilestones>;
const mockCompleteMilestone = completeMilestone as jest.MockedFunction<typeof completeMilestone>;
const mockUncompleteMilestone = uncompleteMilestone as jest.MockedFunction<
  typeof uncompleteMilestone
>;
const mockListGoals = listGoals as jest.MockedFunction<typeof listGoals>;
const mockGetGoal = getGoal as jest.MockedFunction<typeof getGoal>;
const mockListMilestones = listMilestones as jest.MockedFunction<typeof listMilestones>;
const mockUpdateGoalStatus = updateGoalStatus as jest.MockedFunction<typeof updateGoalStatus>;

function makeWrapper(client: QueryClient) {
  return function wrapper({ children }: PropsWithChildren) {
    return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
  };
}

describe("useSaveGoal - invalidation", () => {
  beforeEach(() => jest.clearAllMocks());

  it("invalidates list, detail, and milestones keys after creating a new goal", async () => {
    const goal = { id: "g1", userId: "u1", title: "New Goal" } as never;
    mockSaveGoal.mockResolvedValue(goal);
    mockSaveMilestones.mockResolvedValue(undefined);

    const client = createTestQueryClient();
    const spy = jest.spyOn(client, "invalidateQueries");

    const { result } = renderHook(() => useSaveGoal("u1"), { wrapper: makeWrapper(client) });

    await act(async () => {
      await result.current.mutateAsync({
        input: { title: "New Goal" } as never,
        milestones: [],
      });
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    const queryKeys = spy.mock.calls.map((c) => (c[0] as { queryKey?: unknown }).queryKey);
    expect(queryKeys).toContainEqual(["goals", "list", "u1"]);
    expect(queryKeys).toContainEqual(["goals", "detail", "u1", "g1"]);
    expect(queryKeys).toContainEqual(["goals", "milestones", "u1", "g1"]);
  });

  it("invalidates list, detail, and milestones keys after editing an existing goal", async () => {
    const goal = { id: "g1", userId: "u1", title: "Updated Goal" } as never;
    mockSaveGoal.mockResolvedValue(goal);
    mockDeleteMilestones.mockResolvedValue();
    mockSaveMilestones.mockResolvedValue(undefined);

    const client = createTestQueryClient();
    const spy = jest.spyOn(client, "invalidateQueries");

    const { result } = renderHook(() => useSaveGoal("u1"), { wrapper: makeWrapper(client) });

    await act(async () => {
      await result.current.mutateAsync({
        input: { title: "Updated Goal" } as never,
        goalId: "g1",
        milestones: [{ description: "Step 1" } as never],
      });
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    const queryKeys = spy.mock.calls.map((c) => (c[0] as { queryKey?: unknown }).queryKey);
    expect(queryKeys).toContainEqual(["goals", "list", "u1"]);
    expect(queryKeys).toContainEqual(["goals", "detail", "u1", "g1"]);
    expect(queryKeys).toContainEqual(["goals", "milestones", "u1", "g1"]);
  });
});

describe("useSaveGoal", () => {
  beforeEach(() => jest.clearAllMocks());

  it("calls saveGoal then saveMilestones without deleting when creating (no goalId)", async () => {
    const goal = { id: "g1", userId: "u1", title: "My Goal" } as never;
    mockSaveGoal.mockResolvedValue(goal);
    mockSaveMilestones.mockResolvedValue(undefined);

    const client = createTestQueryClient();
    const { result } = renderHook(() => useSaveGoal("u1"), { wrapper: makeWrapper(client) });

    await act(async () => {
      await result.current.mutateAsync({
        input: { title: "My Goal" } as never,
        milestones: [],
      });
    });

    expect(mockSaveGoal).toHaveBeenCalledWith("u1", { title: "My Goal" }, undefined);
    expect(mockDeleteMilestones).not.toHaveBeenCalled();
    expect(mockSaveMilestones).toHaveBeenCalledWith("u1", "g1", []);
  });

  it("deletes existing milestones before saving new ones when editing (goalId present)", async () => {
    const goal = { id: "g1", userId: "u1", title: "My Goal" } as never;
    mockSaveGoal.mockResolvedValue(goal);
    mockDeleteMilestones.mockResolvedValue();
    mockSaveMilestones.mockResolvedValue(undefined);

    const client = createTestQueryClient();
    const { result } = renderHook(() => useSaveGoal("u1"), { wrapper: makeWrapper(client) });

    await act(async () => {
      await result.current.mutateAsync({
        input: { title: "My Goal" } as never,
        goalId: "g1",
        milestones: [{ description: "Step 1" } as never],
      });
    });

    expect(mockSaveGoal).toHaveBeenCalledWith("u1", { title: "My Goal" }, "g1");
    expect(mockDeleteMilestones).toHaveBeenCalledWith("u1", "g1");
    expect(mockSaveMilestones).toHaveBeenCalledWith("u1", "g1", [{ description: "Step 1" }]);

    // delete must happen before save milestones
    const deleteOrder = mockDeleteMilestones.mock.invocationCallOrder[0];
    const saveOrder = mockSaveMilestones.mock.invocationCallOrder[0];
    expect(deleteOrder).toBeLessThan(saveOrder);
  });
});

describe("useToggleMilestone", () => {
  beforeEach(() => jest.clearAllMocks());

  it("calls completeMilestone when completed is true", async () => {
    mockCompleteMilestone.mockResolvedValue({ id: "m1" } as never);

    const client = createTestQueryClient();
    const { result } = renderHook(() => useToggleMilestone("u1", "g1"), {
      wrapper: makeWrapper(client),
    });

    await act(async () => {
      await result.current.mutateAsync({ milestoneId: "m1", completed: true });
    });

    expect(mockCompleteMilestone).toHaveBeenCalledWith("u1", "m1");
    expect(mockUncompleteMilestone).not.toHaveBeenCalled();
  });

  it("calls uncompleteMilestone when completed is false", async () => {
    mockUncompleteMilestone.mockResolvedValue({ id: "m1" } as never);

    const client = createTestQueryClient();
    const { result } = renderHook(() => useToggleMilestone("u1", "g1"), {
      wrapper: makeWrapper(client),
    });

    await act(async () => {
      await result.current.mutateAsync({ milestoneId: "m1", completed: false });
    });

    expect(mockUncompleteMilestone).toHaveBeenCalledWith("u1", "m1");
    expect(mockCompleteMilestone).not.toHaveBeenCalled();
  });

  it("invalidates the milestones key on success when both userId and goalId are present", async () => {
    mockCompleteMilestone.mockResolvedValue({ id: "m1" } as never);

    const client = createTestQueryClient();
    const spy = jest.spyOn(client, "invalidateQueries");

    const { result } = renderHook(() => useToggleMilestone("u1", "g1"), {
      wrapper: makeWrapper(client),
    });

    await act(async () => {
      await result.current.mutateAsync({ milestoneId: "m1", completed: true });
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    const queryKeys = spy.mock.calls.map((c) => (c[0] as { queryKey?: unknown }).queryKey);
    expect(queryKeys).toContainEqual(["goals", "milestones", "u1", "g1"]);
  });

  it("does not invalidate when goalId is null", async () => {
    mockCompleteMilestone.mockResolvedValue({ id: "m1" } as never);

    const client = createTestQueryClient();
    const spy = jest.spyOn(client, "invalidateQueries");

    const { result } = renderHook(() => useToggleMilestone("u1", null), {
      wrapper: makeWrapper(client),
    });

    await act(async () => {
      await result.current.mutateAsync({ milestoneId: "m1", completed: true });
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(spy).not.toHaveBeenCalled();
  });

  it("does not invalidate when userId is null (guard short-circuits)", async () => {
    mockCompleteMilestone.mockResolvedValue({ id: "m1" } as never);

    const client = createTestQueryClient();
    const spy = jest.spyOn(client, "invalidateQueries");

    const { result } = renderHook(() => useToggleMilestone(null, "g1"), {
      wrapper: makeWrapper(client),
    });

    await act(async () => {
      await result.current.mutateAsync({ milestoneId: "m1", completed: true });
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(spy).not.toHaveBeenCalled();
  });
});

describe("useGoals enabled gate", () => {
  beforeEach(() => jest.clearAllMocks());

  it("does not fetch when userId is null", () => {
    mockListGoals.mockResolvedValue([]);
    const client = createTestQueryClient();
    renderHook(() => useGoals(null), { wrapper: makeWrapper(client) });
    expect(mockListGoals).not.toHaveBeenCalled();
  });

  it("fetches with the userId when present", async () => {
    mockListGoals.mockResolvedValue([{ id: "g1" } as never]);
    const client = createTestQueryClient();
    const { result } = renderHook(() => useGoals("u1"), { wrapper: makeWrapper(client) });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockListGoals).toHaveBeenCalledWith("u1");
    expect(result.current.data).toEqual([{ id: "g1" }]);
  });
});

describe("useGoal enabled gate", () => {
  beforeEach(() => jest.clearAllMocks());

  it("does not fetch when userId is null", () => {
    mockGetGoal.mockResolvedValue(null);
    const client = createTestQueryClient();
    renderHook(() => useGoal(null, "g1"), { wrapper: makeWrapper(client) });
    expect(mockGetGoal).not.toHaveBeenCalled();
  });

  it("does not fetch when goalId is null", () => {
    mockGetGoal.mockResolvedValue(null);
    const client = createTestQueryClient();
    renderHook(() => useGoal("u1", null), { wrapper: makeWrapper(client) });
    expect(mockGetGoal).not.toHaveBeenCalled();
  });

  it("fetches with both ids when userId and goalId are present", async () => {
    mockGetGoal.mockResolvedValue({ id: "g1" } as never);
    const client = createTestQueryClient();
    const { result } = renderHook(() => useGoal("u1", "g1"), { wrapper: makeWrapper(client) });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockGetGoal).toHaveBeenCalledWith("u1", "g1");
    expect(result.current.data).toEqual({ id: "g1" });
  });
});

describe("useMilestones enabled gate", () => {
  beforeEach(() => jest.clearAllMocks());

  it("does not fetch when userId is null", () => {
    mockListMilestones.mockResolvedValue([]);
    const client = createTestQueryClient();
    renderHook(() => useMilestones(null, "g1"), { wrapper: makeWrapper(client) });
    expect(mockListMilestones).not.toHaveBeenCalled();
  });

  it("does not fetch when goalId is null", () => {
    mockListMilestones.mockResolvedValue([]);
    const client = createTestQueryClient();
    renderHook(() => useMilestones("u1", null), { wrapper: makeWrapper(client) });
    expect(mockListMilestones).not.toHaveBeenCalled();
  });

  it("fetches with both ids when userId and goalId are present", async () => {
    mockListMilestones.mockResolvedValue([{ id: "m1" } as never]);
    const client = createTestQueryClient();
    const { result } = renderHook(() => useMilestones("u1", "g1"), {
      wrapper: makeWrapper(client),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockListMilestones).toHaveBeenCalledWith("u1", "g1");
    expect(result.current.data).toEqual([{ id: "m1" }]);
  });
});

describe("useUpdateGoalStatus onSuccess guard", () => {
  beforeEach(() => jest.clearAllMocks());

  it("updates the status and invalidates the goals root key for a real user", async () => {
    mockUpdateGoalStatus.mockResolvedValue(undefined);
    const client = createTestQueryClient();
    const spy = jest.spyOn(client, "invalidateQueries");

    const { result } = renderHook(() => useUpdateGoalStatus("u1"), {
      wrapper: makeWrapper(client),
    });

    await act(async () => {
      await result.current.mutateAsync({ goalId: "g1", status: "active" as never });
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockUpdateGoalStatus).toHaveBeenCalledWith("u1", "g1", "active");
    const queryKeys = spy.mock.calls.map((c) => (c[0] as { queryKey?: unknown }).queryKey);
    expect(queryKeys).toContainEqual(["goals"]);
  });

  it("skips invalidation when userId is null", async () => {
    mockUpdateGoalStatus.mockResolvedValue(undefined);
    const client = createTestQueryClient();
    const spy = jest.spyOn(client, "invalidateQueries");

    const { result } = renderHook(() => useUpdateGoalStatus(null), {
      wrapper: makeWrapper(client),
    });

    await act(async () => {
      await result.current.mutateAsync({ goalId: "g1", status: "active" as never });
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockUpdateGoalStatus).toHaveBeenCalledWith(null, "g1", "active");
    expect(spy).not.toHaveBeenCalled();
  });
});

describe("useSaveGoal onSuccess guard", () => {
  beforeEach(() => jest.clearAllMocks());

  it("skips invalidation when userId is null", async () => {
    const goal = { id: "g1", userId: "u1", title: "Anon Goal" } as never;
    mockSaveGoal.mockResolvedValue(goal);
    mockSaveMilestones.mockResolvedValue(undefined);

    const client = createTestQueryClient();
    const spy = jest.spyOn(client, "invalidateQueries");

    const { result } = renderHook(() => useSaveGoal(null), { wrapper: makeWrapper(client) });

    await act(async () => {
      await result.current.mutateAsync({
        input: { title: "Anon Goal" } as never,
        milestones: [],
      });
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(spy).not.toHaveBeenCalled();
  });
});
