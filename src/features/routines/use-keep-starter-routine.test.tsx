import { act, renderHook } from "@testing-library/react-native";

import { useKeepStarterRoutine } from "@/src/features/routines/use-keep-starter-routine";
import { useAddStep, useCreateRoutine, useDeleteRoutine } from "@/src/features/routines/queries";

jest.mock("@/src/features/routines/queries", () => ({
  useCreateRoutine: jest.fn(),
  useAddStep: jest.fn(),
  useDeleteRoutine: jest.fn(),
}));

jest.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

const mockUseCreateRoutine = jest.mocked(useCreateRoutine);
const mockUseAddStep = jest.mocked(useAddStep);
const mockUseDeleteRoutine = jest.mocked(useDeleteRoutine);

function mockMutation(mutateAsync: jest.Mock) {
  return { mutateAsync, isPending: false } as unknown as ReturnType<typeof useCreateRoutine>;
}

describe("useKeepStarterRoutine", () => {
  const createAsync = jest.fn();
  const addStepAsync = jest.fn();
  const deleteAsync = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseCreateRoutine.mockReturnValue(mockMutation(createAsync));
    mockUseAddStep.mockReturnValue(mockMutation(addStepAsync) as never);
    mockUseDeleteRoutine.mockReturnValue(mockMutation(deleteAsync) as never);
  });

  it("writes the routine and its ordered steps, then signals onKept", async () => {
    createAsync.mockResolvedValue({ id: "r-1" });
    addStepAsync.mockResolvedValue({});
    const onKept = jest.fn();

    const { result } = renderHook(() => useKeepStarterRoutine("user-1"));
    await act(async () => {
      await result.current.keep({ name: "My daily routine", steps: ["mood", "journal"], onKept });
    });

    expect(createAsync).toHaveBeenCalledWith({ name: "My daily routine" });
    expect(addStepAsync.mock.calls).toEqual([
      [{ routineId: "r-1", toolId: "mood", position: 0 }],
      [{ routineId: "r-1", toolId: "journal", position: 1 }],
    ]);
    expect(deleteAsync).not.toHaveBeenCalled();
    expect(onKept).toHaveBeenCalled();
    expect(result.current.error).toBe("");
  });

  it("rolls the routine back when a step insert fails, so a Keep retry cannot duplicate", async () => {
    createAsync.mockResolvedValue({ id: "r-1" });
    addStepAsync.mockResolvedValueOnce({}).mockRejectedValueOnce(new Error("network down"));
    deleteAsync.mockResolvedValue(undefined);
    const onKept = jest.fn();

    const { result } = renderHook(() => useKeepStarterRoutine("user-1"));
    await act(async () => {
      await result.current.keep({ name: "My daily routine", steps: ["mood", "journal"], onKept });
    });

    expect(deleteAsync).toHaveBeenCalledWith("r-1");
    expect(onKept).not.toHaveBeenCalled();
    expect(result.current.error).toBe("network down");
  });

  it("still surfaces the original error when the rollback itself fails", async () => {
    createAsync.mockResolvedValue({ id: "r-1" });
    addStepAsync.mockRejectedValue(new Error("step failed"));
    deleteAsync.mockRejectedValue(new Error("rollback failed"));

    const { result } = renderHook(() => useKeepStarterRoutine("user-1"));
    await act(async () => {
      await result.current.keep({ name: "n", steps: ["mood"] });
    });

    expect(result.current.error).toBe("step failed");
  });

  it("does not roll back when createRoutine itself fails (nothing was written)", async () => {
    createAsync.mockRejectedValue(new Error("create failed"));

    const { result } = renderHook(() => useKeepStarterRoutine("user-1"));
    await act(async () => {
      await result.current.keep({ name: "n", steps: ["mood"] });
    });

    expect(deleteAsync).not.toHaveBeenCalled();
    expect(result.current.error).toBe("create failed");
  });
});
