import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react-native";
import type { PropsWithChildren } from "react";

import { useMindfulnessSessions } from "@/src/features/mindfulness/queries";
import * as repo from "@/src/features/mindfulness/repository";
import { createTestQueryClient } from "@/test/render-with-providers";

// Automock of the repository re-export barrel does not reliably yield callable
// mock fns for every named export, so use the explicit-factory pattern
// established in src/features/act/queries/queries.test.tsx.
jest.mock("@/src/features/mindfulness/repository", () => ({
  listMindfulnessSessions: jest.fn(),
  listMindfulnessSessionsByNames: jest.fn(),
  countMindfulnessSessionsByNames: jest.fn(),
  saveMindfulnessSession: jest.fn(),
}));

function wrap(client: QueryClient) {
  return function Wrapper({ children }: PropsWithChildren) {
    return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
  };
}

beforeEach(() => {
  jest.clearAllMocks();
  for (const fn of Object.values(repo)) {
    if (typeof fn === "function") (fn as jest.Mock).mockResolvedValue([]);
  }
});

// ---------------------------------------------------------------------------
// useMindfulnessSessions: `enabled: Boolean(userId)` gate + the queryKey
// ternary (userId ? list(userId) : anonymous). Cover both branches of each.
// ---------------------------------------------------------------------------
describe("useMindfulnessSessions enabled gate", () => {
  it("does not fetch when userId is null (anonymous queryKey branch)", () => {
    const client = createTestQueryClient();
    renderHook(() => useMindfulnessSessions(null), { wrapper: wrap(client) });

    expect(repo.listMindfulnessSessions).not.toHaveBeenCalled();
    // The null-user branch primes the "anonymous" cache key, never the list key.
    expect(client.getQueryData(["mindfulness", "list", "anonymous", 30])).toBeUndefined();
    expect(client.getQueryState(["mindfulness", "list", "anonymous", 30])?.fetchStatus).toBe(
      "idle",
    );
  });

  it("fetches with the default limit for a real user (list queryKey branch)", async () => {
    const sessions = [{ id: "s1", exerciseName: "box-breathing" }];
    (repo.listMindfulnessSessions as jest.Mock).mockResolvedValue(sessions);
    const client = createTestQueryClient();
    const { result } = renderHook(() => useMindfulnessSessions("u1"), {
      wrapper: wrap(client),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(repo.listMindfulnessSessions).toHaveBeenCalledWith("u1", 30);
    expect(result.current.data).toEqual(sessions);
    // Data lands under the user-scoped, limit-suffixed list key (limit is in
    // the key so different windows don't collide), not the anonymous one.
    expect(client.getQueryData(["mindfulness", "list", "u1", 30])).toEqual(sessions);
  });

  it("forwards a custom limit to the repository", async () => {
    (repo.listMindfulnessSessions as jest.Mock).mockResolvedValue([]);
    const client = createTestQueryClient();
    const { result } = renderHook(() => useMindfulnessSessions("u1", 5), {
      wrapper: wrap(client),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(repo.listMindfulnessSessions).toHaveBeenCalledWith("u1", 5);
  });
});
