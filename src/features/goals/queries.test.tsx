import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react-native";
import type { PropsWithChildren } from "react";

import { useSaveGoal, useToggleMilestone } from "@/src/features/goals/queries";
import {
  completeMilestone,
  deleteMilestonesForGoal,
  saveGoal,
  saveMilestones,
  uncompleteMilestone,
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

function makeWrapper(client: QueryClient) {
  return function wrapper({ children }: PropsWithChildren) {
    return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
  };
}

describe("useSaveGoal — invalidation", () => {
  beforeEach(() => jest.clearAllMocks());

  it("invalidates list, detail, and milestones keys after creating a new goal", async () => {
    const goal = { id: "g1", userId: "u1", title: "New Goal" } as never;
    mockSaveGoal.mockResolvedValue(goal);
    mockSaveMilestones.mockResolvedValue([]);

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
    mockSaveMilestones.mockResolvedValue([]);

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
    mockSaveMilestones.mockResolvedValue([]);

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
    mockSaveMilestones.mockResolvedValue([]);

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
});
