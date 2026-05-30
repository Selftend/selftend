import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react-native";
import type { PropsWithChildren } from "react";

import { useSaveTask, useToggleStep } from "@/src/features/procrastination/queries";
import { saveSteps, saveTask, toggleStepComplete } from "@/src/features/procrastination/repository";
import { createTestQueryClient } from "@/test/render-with-providers";

jest.mock("@/src/features/procrastination/repository", () => ({
  getTask: jest.fn(),
  listSteps: jest.fn(),
  listTasks: jest.fn(),
  saveSteps: jest.fn(),
  saveTask: jest.fn(),
  toggleStepComplete: jest.fn(),
  updateTaskStatus: jest.fn(),
}));

const mockSaveTask = saveTask as jest.MockedFunction<typeof saveTask>;
const mockSaveSteps = saveSteps as jest.MockedFunction<typeof saveSteps>;
const mockToggleStep = toggleStepComplete as jest.MockedFunction<typeof toggleStepComplete>;

function makeWrapper(client: QueryClient) {
  return function wrapper({ children }: PropsWithChildren) {
    return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
  };
}

describe("useSaveTask", () => {
  beforeEach(() => jest.clearAllMocks());

  it("calls saveTask then saveSteps with the returned task id", async () => {
    const task = { id: "t1", userId: "u1", title: "Write tests" } as never;
    mockSaveTask.mockResolvedValue(task);
    mockSaveSteps.mockResolvedValue(undefined);

    const client = createTestQueryClient();
    const { result } = renderHook(() => useSaveTask("u1"), { wrapper: makeWrapper(client) });

    const steps = [{ title: "Step 1", order: 0 } as never];

    await act(async () => {
      await result.current.mutateAsync({ input: { title: "Write tests" } as never, steps });
    });

    expect(mockSaveTask).toHaveBeenCalledWith("u1", { title: "Write tests" });
    expect(mockSaveSteps).toHaveBeenCalledWith("u1", "t1", steps);

    // saveTask must be called before saveSteps
    const taskOrder = mockSaveTask.mock.invocationCallOrder[0];
    const stepsOrder = mockSaveSteps.mock.invocationCallOrder[0];
    expect(taskOrder).toBeLessThan(stepsOrder);
  });

  it("returns the saved task", async () => {
    const task = { id: "t1", userId: "u1", title: "Write tests" } as never;
    mockSaveTask.mockResolvedValue(task);
    mockSaveSteps.mockResolvedValue(undefined);

    const client = createTestQueryClient();
    const { result } = renderHook(() => useSaveTask("u1"), { wrapper: makeWrapper(client) });

    let returned: unknown;
    await act(async () => {
      returned = await result.current.mutateAsync({
        input: { title: "Write tests" } as never,
        steps: [],
      });
    });

    expect(returned).toBe(task);
  });
});

describe("useToggleStep", () => {
  beforeEach(() => jest.clearAllMocks());

  it("calls toggleStepComplete with correct args", async () => {
    mockToggleStep.mockResolvedValue({ id: "s1" } as never);

    const client = createTestQueryClient();
    const { result } = renderHook(() => useToggleStep("u1", "t1"), {
      wrapper: makeWrapper(client),
    });

    await act(async () => {
      await result.current.mutateAsync({ stepId: "s1", completed: true });
    });

    expect(mockToggleStep).toHaveBeenCalledWith("u1", "s1", true);
  });

  it("invalidates the steps key when both userId and taskId are present", async () => {
    mockToggleStep.mockResolvedValue({ id: "s1" } as never);

    const client = createTestQueryClient();
    const spy = jest.spyOn(client, "invalidateQueries");

    const { result } = renderHook(() => useToggleStep("u1", "t1"), {
      wrapper: makeWrapper(client),
    });

    await act(async () => {
      await result.current.mutateAsync({ stepId: "s1", completed: false });
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    const queryKeys = spy.mock.calls.map((c) => (c[0] as { queryKey?: unknown }).queryKey);
    expect(queryKeys).toContainEqual(["procrastination", "steps", "u1", "t1"]);
  });

  it("does not invalidate when userId is null", async () => {
    mockToggleStep.mockResolvedValue({ id: "s1" } as never);

    const client = createTestQueryClient();
    const spy = jest.spyOn(client, "invalidateQueries");

    const { result } = renderHook(() => useToggleStep(null, "t1"), {
      wrapper: makeWrapper(client),
    });

    await act(async () => {
      await result.current.mutateAsync({ stepId: "s1", completed: true });
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(spy).not.toHaveBeenCalled();
  });

  it("does not invalidate when taskId is null", async () => {
    mockToggleStep.mockResolvedValue({ id: "s1" } as never);

    const client = createTestQueryClient();
    const spy = jest.spyOn(client, "invalidateQueries");

    const { result } = renderHook(() => useToggleStep("u1", null), {
      wrapper: makeWrapper(client),
    });

    await act(async () => {
      await result.current.mutateAsync({ stepId: "s1", completed: true });
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(spy).not.toHaveBeenCalled();
  });
});
