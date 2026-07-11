import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react-native";
import type { PropsWithChildren } from "react";

import { defaultUserPreferences } from "@/src/features/modules/types";
import {
  preferenceKeys,
  useDeleteUserAccount,
  useExportUserData,
  useRecordPolicyConsent,
  useUpdateOnboardingPreferences,
  useUpdateShownButtonTours,
  useUpdateUserPreferences,
  useUserPreferences,
} from "@/src/features/settings/queries";
import {
  deleteUserAccount,
  exportUserData,
  getUserPreferences,
  recordPolicyConsent,
  updateOnboardingPreferences,
  updateShownButtonTours,
  updateUserPreferences,
} from "@/src/features/settings/repository";
import { createTestQueryClient } from "@/test/render-with-providers";

// Automock of the repository re-export barrel does not reliably yield callable
// mock fns for every named export, so list each explicitly as a jest.fn().
jest.mock("@/src/features/settings/repository", () => ({
  deleteUserAccount: jest.fn(),
  exportUserData: jest.fn(),
  getUserPreferences: jest.fn(),
  recordPolicyConsent: jest.fn(),
  updateOnboardingPreferences: jest.fn(),
  updateShownButtonTours: jest.fn(),
  updateUserPreferences: jest.fn(),
}));

const mockUpdateUserPreferences = updateUserPreferences as jest.MockedFunction<
  typeof updateUserPreferences
>;
const mockGetUserPreferences = getUserPreferences as jest.MockedFunction<typeof getUserPreferences>;
const mockUpdateShownButtonTours = updateShownButtonTours as jest.MockedFunction<
  typeof updateShownButtonTours
>;
const mockUpdateOnboardingPreferences = updateOnboardingPreferences as jest.MockedFunction<
  typeof updateOnboardingPreferences
>;
const mockRecordPolicyConsent = recordPolicyConsent as jest.MockedFunction<
  typeof recordPolicyConsent
>;
const mockDeleteUserAccount = deleteUserAccount as jest.MockedFunction<typeof deleteUserAccount>;
const mockExportUserData = exportUserData as jest.MockedFunction<typeof exportUserData>;

function makeWrapper(client: QueryClient) {
  return function wrapper({ children }: PropsWithChildren) {
    return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
  };
}

beforeEach(() => {
  jest.clearAllMocks();
  mockUpdateUserPreferences.mockResolvedValue(defaultUserPreferences);
  mockGetUserPreferences.mockResolvedValue(defaultUserPreferences);
  mockUpdateShownButtonTours.mockResolvedValue(defaultUserPreferences);
  mockUpdateOnboardingPreferences.mockResolvedValue(defaultUserPreferences);
  mockRecordPolicyConsent.mockResolvedValue(undefined);
  mockDeleteUserAccount.mockResolvedValue(undefined);
  mockExportUserData.mockResolvedValue({ ok: true });
});

// ---------------------------------------------------------------------------
// useUserPreferences: enabled = Boolean(userId). Cover the disabled branch
// (queryFn never runs, key falls back to the anonymous tuple) and the enabled
// branch (queryFn runs with the real id, key uses the detail factory).
// ---------------------------------------------------------------------------
describe("useUserPreferences enabled gate", () => {
  it("does not fetch and stays on the anonymous key when userId is null", () => {
    const client = createTestQueryClient();
    renderHook(() => useUserPreferences(null), { wrapper: makeWrapper(client) });

    expect(mockGetUserPreferences).not.toHaveBeenCalled();
    // enabled:false disabled query still registers under the anonymous fallback key.
    expect(client.getQueryState(["preferences", "anonymous"])).toBeDefined();
  });

  it("fetches with the real id when userId is present", async () => {
    const client = createTestQueryClient();
    const { result } = renderHook(() => useUserPreferences("u1"), {
      wrapper: makeWrapper(client),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockGetUserPreferences).toHaveBeenCalledWith("u1");
    expect(result.current.data).toEqual(defaultUserPreferences);
    expect(client.getQueryState(preferenceKeys.detail("u1"))).toBeDefined();
  });
});

describe("useUpdateUserPreferences - invalidation", () => {
  it("invalidates the preferences key after a successful push", async () => {
    mockUpdateUserPreferences.mockResolvedValue(undefined as never);

    const client = createTestQueryClient();
    const spy = jest.spyOn(client, "invalidateQueries");

    const { result } = renderHook(() => useUpdateUserPreferences("u1"), {
      wrapper: makeWrapper(client),
    });

    await act(async () => {
      await result.current.mutateAsync({ ...defaultUserPreferences, theme: "dark" });
    });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(mockUpdateUserPreferences).toHaveBeenCalledWith(
      "u1",
      expect.objectContaining({ theme: "dark" }),
    );
    const queryKeys = spy.mock.calls.map((c) => (c[0] as { queryKey?: unknown }).queryKey);
    expect(queryKeys).toContainEqual(["preferences", "u1"]);
  });

  it("optimistically writes the new prefs into the cache during onMutate", async () => {
    const client = createTestQueryClient();
    client.setQueryData(preferenceKeys.detail("u1"), defaultUserPreferences);
    // Hold the push open so we can observe the optimistic cache value mid-flight.
    let resolvePush: (value: unknown) => void = () => undefined;
    mockUpdateUserPreferences.mockImplementation(
      () => new Promise((resolve) => (resolvePush = resolve)) as never,
    );

    const { result } = renderHook(() => useUpdateUserPreferences("u1"), {
      wrapper: makeWrapper(client),
    });

    const next = { ...defaultUserPreferences, theme: "dark" };
    act(() => {
      void result.current.mutateAsync(next);
    });

    await waitFor(() => expect(client.getQueryData(preferenceKeys.detail("u1"))).toEqual(next));

    await act(async () => {
      resolvePush(next);
    });
  });

  it("does NOT invalidate after a failed push, and rolls the optimistic write back", async () => {
    // Invalidation after a FAILED push would refetch preferences and hand
    // settings-sync a fresh object to re-push - the infinite 409 loop observed
    // when a still-valid JWT belongs to a deleted user. Success-only.
    mockUpdateUserPreferences.mockRejectedValue(
      Object.assign(new Error("conflict"), { code: "23503" }),
    );

    const client = createTestQueryClient();
    client.setQueryData(preferenceKeys.detail("u1"), defaultUserPreferences);
    const spy = jest.spyOn(client, "invalidateQueries");

    const { result } = renderHook(() => useUpdateUserPreferences("u1"), {
      wrapper: makeWrapper(client),
    });

    await act(async () => {
      await result.current
        .mutateAsync({ ...defaultUserPreferences, theme: "dark" })
        .catch(() => undefined);
    });
    await waitFor(() => expect(result.current.isError).toBe(true));

    expect(spy).not.toHaveBeenCalled();
    expect(client.getQueryData(preferenceKeys.detail("u1"))).toEqual(defaultUserPreferences);
  });

  it("skips the optimistic write and the invalidate when userId is null", async () => {
    const client = createTestQueryClient();
    const spy = jest.spyOn(client, "invalidateQueries");
    const setSpy = jest.spyOn(client, "setQueryData");

    const { result } = renderHook(() => useUpdateUserPreferences(null), {
      wrapper: makeWrapper(client),
    });

    await act(async () => {
      await result.current.mutateAsync({ ...defaultUserPreferences, theme: "dark" });
    });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    // onMutate returns early (no cache prime) and onSuccess short-circuits.
    expect(setSpy).not.toHaveBeenCalled();
    expect(spy).not.toHaveBeenCalled();
  });

  it("does not roll back on error when userId is null", async () => {
    mockUpdateUserPreferences.mockRejectedValue(new Error("boom"));

    const client = createTestQueryClient();
    const setSpy = jest.spyOn(client, "setQueryData");

    const { result } = renderHook(() => useUpdateUserPreferences(null), {
      wrapper: makeWrapper(client),
    });

    await act(async () => {
      await result.current
        .mutateAsync({ ...defaultUserPreferences, theme: "dark" })
        .catch(() => undefined);
    });
    await waitFor(() => expect(result.current.isError).toBe(true));

    // onError guard (userId falsy) short-circuits before any setQueryData rollback.
    expect(setSpy).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// The remaining mutations all share the `if (!userId) return;` onSuccess guard.
// Cover both branches for each: real user (mutationFn runs + invalidate with the
// exact preferences detail key) and null user (mutationFn runs, invalidate skipped).
// ---------------------------------------------------------------------------
const invalidatingMutations = [
  [
    "useUpdateShownButtonTours",
    useUpdateShownButtonTours,
    mockUpdateShownButtonTours,
    ["tour-a"] as const,
  ],
  [
    "useUpdateOnboardingPreferences",
    useUpdateOnboardingPreferences,
    mockUpdateOnboardingPreferences,
    { appOnboardingCompleted: true } as const,
  ],
  ["useRecordPolicyConsent", useRecordPolicyConsent, mockRecordPolicyConsent, "v2" as const],
] as const;

describe.each(invalidatingMutations)("%s onSuccess guard", (_name, useHook, repoFn, variables) => {
  it("runs the mutation and invalidates the detail key for a real user", async () => {
    const client = createTestQueryClient();
    const spy = jest.spyOn(client, "invalidateQueries");

    const { result } = renderHook(() => (useHook as (u: string | null) => any)("u1"), {
      wrapper: makeWrapper(client),
    });

    await act(async () => {
      await result.current.mutateAsync(variables as never);
    });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(repoFn).toHaveBeenCalledWith("u1", variables);
    const queryKeys = spy.mock.calls.map((c) => (c[0] as { queryKey?: unknown }).queryKey);
    expect(queryKeys).toContainEqual(["preferences", "u1"]);
  });

  it("skips invalidation when userId is null", async () => {
    const client = createTestQueryClient();
    const spy = jest.spyOn(client, "invalidateQueries");

    const { result } = renderHook(() => (useHook as (u: string | null) => any)(null), {
      wrapper: makeWrapper(client),
    });

    await act(async () => {
      await result.current.mutateAsync(variables as never);
    });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(repoFn).toHaveBeenCalled();
    expect(spy).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// Account-level mutations: no userId, no invalidation - just delegate to the
// repository and surface its result/error.
// ---------------------------------------------------------------------------
describe("useDeleteUserAccount", () => {
  it("delegates to the repository delete", async () => {
    const client = createTestQueryClient();
    const { result } = renderHook(() => useDeleteUserAccount(), {
      wrapper: makeWrapper(client),
    });

    await act(async () => {
      await result.current.mutateAsync();
    });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(mockDeleteUserAccount).toHaveBeenCalledTimes(1);
  });
});

describe("useExportUserData", () => {
  it("returns the exported payload from the repository", async () => {
    mockExportUserData.mockResolvedValue({ ok: true, rows: 3 });
    const client = createTestQueryClient();
    const { result } = renderHook(() => useExportUserData(), {
      wrapper: makeWrapper(client),
    });

    let payload: unknown;
    await act(async () => {
      payload = await result.current.mutateAsync();
    });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(mockExportUserData).toHaveBeenCalledTimes(1);
    expect(payload).toEqual({ ok: true, rows: 3 });
  });
});
