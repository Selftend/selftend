import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react-native";
import type { PropsWithChildren } from "react";

import {
  useSelfCareLog,
  useSelfCareLogs,
  useUpsertSelfCareLog,
} from "@/src/features/self-care/queries";
import * as repo from "@/src/features/self-care/repository";
import { createTestQueryClient } from "@/test/render-with-providers";

// Automock of the repository re-export barrel does not reliably yield callable
// mock fns for every named export, so use the explicit-factory pattern
// established in src/features/act/queries/queries.test.tsx.
jest.mock("@/src/features/self-care/repository", () => ({
  getSelfCareLog: jest.fn(),
  listSelfCareLogs: jest.fn(),
  upsertSelfCareLog: jest.fn(),
}));

function wrap(client: QueryClient) {
  return function Wrapper({ children }: PropsWithChildren) {
    return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
  };
}

const sampleLog = {
  id: "1",
  userId: "u1",
  logDate: "2026-07-10",
  exerciseDone: true,
  exerciseMinutes: 30,
  exerciseType: "run",
  mealsStructured: 3,
  emotionalEating: false,
  socialConnectionMade: true,
  socialNotes: "",
  meaningfulActivity: "",
  createdAt: "2026-07-10T00:00:00Z",
  updatedAt: "2026-07-10T00:00:00Z",
};

beforeEach(() => {
  jest.clearAllMocks();
  (repo.getSelfCareLog as jest.Mock).mockResolvedValue(sampleLog);
  (repo.listSelfCareLogs as jest.Mock).mockResolvedValue([sampleLog]);
  (repo.upsertSelfCareLog as jest.Mock).mockResolvedValue(sampleLog);
});

// ---------------------------------------------------------------------------
// useSelfCareLog: enabled = Boolean(userId && logDate). Cover all three states
// of the two-id gate: userId missing, logDate missing, both present.
// ---------------------------------------------------------------------------
describe("useSelfCareLog enabled gate", () => {
  it("does not fetch when userId is null", () => {
    const client = createTestQueryClient();
    renderHook(() => useSelfCareLog(null, "2026-07-10"), { wrapper: wrap(client) });
    expect(repo.getSelfCareLog).not.toHaveBeenCalled();
  });

  it("does not fetch when logDate is null", () => {
    const client = createTestQueryClient();
    renderHook(() => useSelfCareLog("u1", null), { wrapper: wrap(client) });
    expect(repo.getSelfCareLog).not.toHaveBeenCalled();
  });

  it("fetches with the exact ids when both userId and logDate are present", async () => {
    const client = createTestQueryClient();
    const { result } = renderHook(() => useSelfCareLog("u1", "2026-07-10"), {
      wrapper: wrap(client),
    });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(repo.getSelfCareLog).toHaveBeenCalledWith("u1", "2026-07-10");
    expect(result.current.data).toEqual(sampleLog);
  });
});

// ---------------------------------------------------------------------------
// useSelfCareLogs: enabled = Boolean(userId).
// ---------------------------------------------------------------------------
describe("useSelfCareLogs enabled gate", () => {
  it("does not fetch when userId is null", () => {
    const client = createTestQueryClient();
    renderHook(() => useSelfCareLogs(null), { wrapper: wrap(client) });
    expect(repo.listSelfCareLogs).not.toHaveBeenCalled();
  });

  it("fetches with the userId when present", async () => {
    const client = createTestQueryClient();
    const { result } = renderHook(() => useSelfCareLogs("u1"), { wrapper: wrap(client) });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(repo.listSelfCareLogs).toHaveBeenCalledWith("u1");
    expect(result.current.data).toEqual([sampleLog]);
  });
});

// ---------------------------------------------------------------------------
// useUpsertSelfCareLog: onSuccess guard `if (!userId) return;` plus a Promise.all
// that invalidates both the list key and the detail key derived from the
// resolved log's logDate. Cover both guard branches.
// ---------------------------------------------------------------------------
describe("useUpsertSelfCareLog onSuccess guard", () => {
  it("invalidates the list and detail keys for a real user", async () => {
    (repo.upsertSelfCareLog as jest.Mock).mockResolvedValue({
      ...sampleLog,
      logDate: "2026-07-10",
    });
    const client = createTestQueryClient();
    const spy = jest.spyOn(client, "invalidateQueries");
    const { result } = renderHook(() => useUpsertSelfCareLog("u1"), { wrapper: wrap(client) });

    await result.current.mutateAsync({} as never);

    expect(repo.upsertSelfCareLog).toHaveBeenCalledWith("u1", {});
    const queryKeys = spy.mock.calls.map((c) => (c[0] as { queryKey?: unknown }).queryKey);
    expect(queryKeys).toContainEqual(["self-care", "list", "u1"]);
    expect(queryKeys).toContainEqual(["self-care", "detail", "u1", "2026-07-10"]);
  });

  it("skips invalidation when userId is null", async () => {
    (repo.upsertSelfCareLog as jest.Mock).mockResolvedValue(sampleLog);
    const client = createTestQueryClient();
    const spy = jest.spyOn(client, "invalidateQueries");
    const { result } = renderHook(() => useUpsertSelfCareLog(null), { wrapper: wrap(client) });

    await result.current.mutateAsync({} as never);

    expect(repo.upsertSelfCareLog).toHaveBeenCalled();
    expect(spy).not.toHaveBeenCalled();
  });
});
