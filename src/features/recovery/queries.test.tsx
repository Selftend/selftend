import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react-native";
import type { PropsWithChildren } from "react";

import {
  useChallengePlans,
  useDeleteChallengePlan,
  useRecoveryPlan,
  useSaveChallengePlan,
  useUpsertRecoveryPlan,
} from "@/src/features/recovery/queries";
import * as repo from "@/src/features/recovery/repository";
import { createTestQueryClient } from "@/test/render-with-providers";

// Automock of the repository re-export barrel does not reliably yield callable
// mock fns for every named export, so use the explicit-factory pattern already
// established in src/features/act/queries/queries.test.tsx.
jest.mock("@/src/features/recovery/repository", () => ({
  deleteChallengePlan: jest.fn(),
  getRecoveryPlan: jest.fn(),
  listChallengePlans: jest.fn(),
  saveChallengePlan: jest.fn(),
  upsertRecoveryPlan: jest.fn(),
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
    if (typeof fn === "function") (fn as jest.Mock).mockResolvedValue(null);
  }
});

// ---------------------------------------------------------------------------
// Query hooks: enabled = Boolean(userId). Cover both branches — null userId
// keeps queryFn dormant, a real userId drives it.
// ---------------------------------------------------------------------------
const queryHooks = [
  ["useRecoveryPlan", useRecoveryPlan, repo.getRecoveryPlan],
  ["useChallengePlans", useChallengePlans, repo.listChallengePlans],
] as const;

describe.each(queryHooks)("%s enabled gate", (_name, useHook, repoFn) => {
  it("does not fetch when userId is null", () => {
    const client = createTestQueryClient();
    renderHook(() => (useHook as (u: string | null) => unknown)(null), {
      wrapper: wrap(client),
    });
    expect(repoFn).not.toHaveBeenCalled();
  });

  it("fetches with the real userId when present", async () => {
    const client = createTestQueryClient();
    renderHook(() => (useHook as (u: string | null) => unknown)("u1"), {
      wrapper: wrap(client),
    });
    await waitFor(() => expect(repoFn).toHaveBeenCalledWith("u1"));
  });
});

// ---------------------------------------------------------------------------
// useUpsertRecoveryPlan: onSuccess guard `if (!userId) return;`. Real user runs
// the mutation and invalidates the exact plan key; null user short-circuits.
// ---------------------------------------------------------------------------
describe("useUpsertRecoveryPlan onSuccess guard", () => {
  it("invalidates the plan key for a real user", async () => {
    (repo.upsertRecoveryPlan as jest.Mock).mockResolvedValue({ id: "p1" });
    const client = createTestQueryClient();
    const spy = jest.spyOn(client, "invalidateQueries");
    const { result } = renderHook(() => useUpsertRecoveryPlan("u1"), {
      wrapper: wrap(client),
    });

    const input = { personalSlogan: "one day at a time" };
    await result.current.mutateAsync(input as never);

    expect(repo.upsertRecoveryPlan).toHaveBeenCalledWith("u1", input);
    const queryKeys = spy.mock.calls.map((c) => (c[0] as { queryKey?: unknown }).queryKey);
    expect(queryKeys).toContainEqual(["recovery", "plan", "u1"]);
  });

  it("skips invalidation when userId is null", async () => {
    (repo.upsertRecoveryPlan as jest.Mock).mockResolvedValue({ id: "p1" });
    const client = createTestQueryClient();
    const spy = jest.spyOn(client, "invalidateQueries");
    const { result } = renderHook(() => useUpsertRecoveryPlan(null), {
      wrapper: wrap(client),
    });

    await result.current.mutateAsync({} as never);

    expect(repo.upsertRecoveryPlan).toHaveBeenCalled();
    expect(spy).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// useSaveChallengePlan: onSuccess guard + challenges-key invalidation. Passes
// the full variables tuple through to the repo fn.
// ---------------------------------------------------------------------------
describe("useSaveChallengePlan onSuccess guard", () => {
  it("invalidates the challenges key for a real user", async () => {
    (repo.saveChallengePlan as jest.Mock).mockResolvedValue({ id: "c1" });
    const client = createTestQueryClient();
    const spy = jest.spyOn(client, "invalidateQueries");
    const { result } = renderHook(() => useSaveChallengePlan("u1"), {
      wrapper: wrap(client),
    });

    const input = { challengeDescription: "cravings", copingSteps: ["walk"] };
    await result.current.mutateAsync({
      recoveryPlanId: "rp1",
      input,
      challengePlanId: "cp1",
    } as never);

    expect(repo.saveChallengePlan).toHaveBeenCalledWith("u1", "rp1", input, "cp1");
    const queryKeys = spy.mock.calls.map((c) => (c[0] as { queryKey?: unknown }).queryKey);
    expect(queryKeys).toContainEqual(["recovery", "challenges", "u1"]);
  });

  it("skips invalidation when userId is null", async () => {
    (repo.saveChallengePlan as jest.Mock).mockResolvedValue({ id: "c1" });
    const client = createTestQueryClient();
    const spy = jest.spyOn(client, "invalidateQueries");
    const { result } = renderHook(() => useSaveChallengePlan(null), {
      wrapper: wrap(client),
    });

    await result.current.mutateAsync({
      recoveryPlanId: "rp1",
      input: {},
    } as never);

    expect(repo.saveChallengePlan).toHaveBeenCalled();
    expect(spy).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// useDeleteChallengePlan: onSuccess guard + challenges-key invalidation, with
// the delete repo fn called as (userId, challengePlanId).
// ---------------------------------------------------------------------------
describe("useDeleteChallengePlan onSuccess guard", () => {
  it("deletes and invalidates the challenges key for a real user", async () => {
    (repo.deleteChallengePlan as jest.Mock).mockResolvedValue(undefined);
    const client = createTestQueryClient();
    const spy = jest.spyOn(client, "invalidateQueries");
    const { result } = renderHook(() => useDeleteChallengePlan("u1"), {
      wrapper: wrap(client),
    });

    await result.current.mutateAsync("cp1" as never);

    expect(repo.deleteChallengePlan).toHaveBeenCalledWith("u1", "cp1");
    const queryKeys = spy.mock.calls.map((c) => (c[0] as { queryKey?: unknown }).queryKey);
    expect(queryKeys).toContainEqual(["recovery", "challenges", "u1"]);
  });

  it("skips invalidation when userId is null", async () => {
    (repo.deleteChallengePlan as jest.Mock).mockResolvedValue(undefined);
    const client = createTestQueryClient();
    const spy = jest.spyOn(client, "invalidateQueries");
    const { result } = renderHook(() => useDeleteChallengePlan(null), {
      wrapper: wrap(client),
    });

    await result.current.mutateAsync("cp1" as never);

    expect(repo.deleteChallengePlan).toHaveBeenCalled();
    expect(spy).not.toHaveBeenCalled();
  });
});
