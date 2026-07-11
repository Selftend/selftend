import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react-native";
import type { PropsWithChildren } from "react";

import * as repo from "@/src/features/values/repository";
import { useSaveValuesProfile, useValuesProfile } from "@/src/features/values/queries";
import type { ValuesProfileInput } from "@/src/features/values/types";
import { createTestQueryClient } from "@/test/render-with-providers";

// Automock of the repository re-export barrel does not reliably yield callable
// mock fns for every named export, so use the explicit-factory pattern already
// established in src/features/act/queries/queries.test.tsx.
jest.mock("@/src/features/values/repository", () => ({
  getValuesProfile: jest.fn(),
  saveValuesProfile: jest.fn(),
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
// useValuesProfile: enabled = Boolean(userId). Cover both the disabled
// (null user) and enabled (real user) branches, plus the queryKey ternary.
// ---------------------------------------------------------------------------
describe("useValuesProfile enabled gate", () => {
  it("does not fetch when userId is null", () => {
    const client = createTestQueryClient();
    renderHook(() => useValuesProfile(null), { wrapper: wrap(client) });
    expect(repo.getValuesProfile).not.toHaveBeenCalled();
    // Anonymous branch of the queryKey ternary is used when userId is null.
    expect(
      client.getQueryCache().find({ queryKey: ["values", "profile", "anonymous"] }),
    ).toBeDefined();
  });

  it("fetches with the user-scoped key when userId is present", async () => {
    const profile = {
      id: "p1",
      userId: "u1",
      personalValues: [],
      priorityValues: [],
      updatedAt: "t",
    };
    (repo.getValuesProfile as jest.Mock).mockResolvedValue(profile);
    const client = createTestQueryClient();
    const { result } = renderHook(() => useValuesProfile("u1"), { wrapper: wrap(client) });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(repo.getValuesProfile).toHaveBeenCalledWith("u1");
    expect(result.current.data).toEqual(profile);
    // User-scoped branch of the queryKey ternary.
    expect(client.getQueryCache().find({ queryKey: ["values", "profile", "u1"] })).toBeDefined();
  });
});

// ---------------------------------------------------------------------------
// useSaveValuesProfile: onSuccess guard `if (!userId) return;`. Cover both a
// real userId (mutationFn + invalidate with the exact profile key) and a null
// userId (guard short-circuits, no invalidate).
// ---------------------------------------------------------------------------
describe("useSaveValuesProfile onSuccess guard", () => {
  it("runs the mutation and invalidates the profile key for a real user", async () => {
    const saved = {
      id: "p1",
      userId: "u1",
      personalValues: [],
      priorityValues: [],
      updatedAt: "t",
    };
    (repo.saveValuesProfile as jest.Mock).mockResolvedValue(saved);
    const client = createTestQueryClient();
    const spy = jest.spyOn(client, "invalidateQueries");
    const { result } = renderHook(() => useSaveValuesProfile("u1"), { wrapper: wrap(client) });

    const input: ValuesProfileInput = {
      personalValues: [{ key: "health", tier: 1 }],
      priorityValues: ["health"],
    };
    await result.current.mutateAsync(input);

    expect(repo.saveValuesProfile).toHaveBeenCalledWith("u1", input);
    const queryKeys = spy.mock.calls.map((c) => (c[0] as { queryKey?: unknown }).queryKey);
    expect(queryKeys).toContainEqual(["values", "profile", "u1"]);
  });

  it("skips invalidation when userId is null", async () => {
    const client = createTestQueryClient();
    const spy = jest.spyOn(client, "invalidateQueries");
    const { result } = renderHook(() => useSaveValuesProfile(null), { wrapper: wrap(client) });

    const input = { personalValues: [], priorityValues: [] };
    await result.current.mutateAsync(input);

    // mutationFn still runs (saveValuesProfile(null!, input)); the guard only
    // short-circuits the invalidation.
    expect(repo.saveValuesProfile).toHaveBeenCalledWith(null, input);
    expect(spy).not.toHaveBeenCalled();
  });
});
