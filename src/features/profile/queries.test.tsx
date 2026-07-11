import type { User } from "@supabase/supabase-js";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react-native";
import type { PropsWithChildren } from "react";

import {
  useRemoveUserAvatar,
  useResetUserAvatarToOAuth,
  useUpdateUserDisplayName,
  useUploadUserAvatar,
  useUserProfile,
} from "@/src/features/profile/queries";
import * as repo from "@/src/features/profile/repository";
import { createTestQueryClient } from "@/test/render-with-providers";

// Automock of the repository re-export barrel does not reliably yield callable
// mock fns for every named export, so use the explicit-factory pattern already
// established in src/features/act/queries/queries.test.tsx.
jest.mock("@/src/features/profile/repository", () => ({
  getOrSyncUserProfile: jest.fn(),
  removeUserAvatar: jest.fn(),
  resetUserAvatarToOAuth: jest.fn(),
  updateUserDisplayName: jest.fn(),
  uploadUserAvatar: jest.fn(),
  getOAuthAvatarUrl: jest.fn(),
  buildSyncedProfileFields: jest.fn(),
}));

function wrap(client: QueryClient) {
  return function Wrapper({ children }: PropsWithChildren) {
    return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
  };
}

const user = { id: "u1" } as User;

beforeEach(() => {
  jest.clearAllMocks();
  // Every repo fn resolves to a benign value so queryFn/mutationFn don't throw.
  for (const fn of Object.values(repo)) {
    if (typeof fn === "function") (fn as jest.Mock).mockResolvedValue({ id: "p1" });
  }
});

// ---------------------------------------------------------------------------
// useUserProfile: enabled = Boolean(user). Cover both branches: null user (the
// queryFn never runs) and a real user (getOrSyncUserProfile is invoked with it).
// ---------------------------------------------------------------------------
describe("useUserProfile enabled gate", () => {
  it("does not fetch when user is null", () => {
    const client = createTestQueryClient();
    renderHook(() => useUserProfile(null), { wrapper: wrap(client) });
    expect(repo.getOrSyncUserProfile).not.toHaveBeenCalled();
  });

  it("fetches with the user object when a user is present", async () => {
    (repo.getOrSyncUserProfile as jest.Mock).mockResolvedValue({ id: "p1", displayName: "Ada" });
    const client = createTestQueryClient();
    const { result } = renderHook(() => useUserProfile(user), { wrapper: wrap(client) });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(repo.getOrSyncUserProfile).toHaveBeenCalledWith(user);
    expect(result.current.data).toEqual({ id: "p1", displayName: "Ada" });
  });
});

// ---------------------------------------------------------------------------
// useUploadUserAvatar: onSuccess guard `if (!userId) return;`. Cover both
// branches and assert the exact invalidation key ["profile", userId].
// ---------------------------------------------------------------------------
describe("useUploadUserAvatar onSuccess guard", () => {
  it("uploads and invalidates the profile detail key for a real user", async () => {
    const client = createTestQueryClient();
    const spy = jest.spyOn(client, "invalidateQueries");
    const { result } = renderHook(() => useUploadUserAvatar("u1"), { wrapper: wrap(client) });

    await result.current.mutateAsync({ uri: "file://a.png" } as never);

    expect(repo.uploadUserAvatar).toHaveBeenCalledWith({ userId: "u1", uri: "file://a.png" });
    const queryKeys = spy.mock.calls.map((c) => (c[0] as { queryKey?: unknown }).queryKey);
    expect(queryKeys).toContainEqual(["profile", "u1"]);
  });

  it("skips invalidation when userId is null", async () => {
    const client = createTestQueryClient();
    const spy = jest.spyOn(client, "invalidateQueries");
    const { result } = renderHook(() => useUploadUserAvatar(null), { wrapper: wrap(client) });

    await result.current.mutateAsync({ uri: "file://a.png" } as never);

    expect(repo.uploadUserAvatar).toHaveBeenCalled();
    expect(spy).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// useResetUserAvatarToOAuth: onSuccess guard `if (!user) return;`.
// ---------------------------------------------------------------------------
describe("useResetUserAvatarToOAuth onSuccess guard", () => {
  it("resets and invalidates using the user id for a real user", async () => {
    const client = createTestQueryClient();
    const spy = jest.spyOn(client, "invalidateQueries");
    const { result } = renderHook(() => useResetUserAvatarToOAuth(user), { wrapper: wrap(client) });

    await result.current.mutateAsync("old/path.png");

    expect(repo.resetUserAvatarToOAuth).toHaveBeenCalledWith(user, "old/path.png");
    const queryKeys = spy.mock.calls.map((c) => (c[0] as { queryKey?: unknown }).queryKey);
    expect(queryKeys).toContainEqual(["profile", "u1"]);
  });

  it("skips invalidation when user is null", async () => {
    const client = createTestQueryClient();
    const spy = jest.spyOn(client, "invalidateQueries");
    const { result } = renderHook(() => useResetUserAvatarToOAuth(null), { wrapper: wrap(client) });

    await result.current.mutateAsync("old/path.png");

    expect(repo.resetUserAvatarToOAuth).toHaveBeenCalled();
    expect(spy).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// useRemoveUserAvatar: onSuccess guard `if (!userId) return;`.
// ---------------------------------------------------------------------------
describe("useRemoveUserAvatar onSuccess guard", () => {
  it("removes and invalidates the profile detail key for a real user", async () => {
    const client = createTestQueryClient();
    const spy = jest.spyOn(client, "invalidateQueries");
    const { result } = renderHook(() => useRemoveUserAvatar("u1"), { wrapper: wrap(client) });

    await result.current.mutateAsync("old/path.png");

    expect(repo.removeUserAvatar).toHaveBeenCalledWith("u1", "old/path.png");
    const queryKeys = spy.mock.calls.map((c) => (c[0] as { queryKey?: unknown }).queryKey);
    expect(queryKeys).toContainEqual(["profile", "u1"]);
  });

  it("skips invalidation when userId is null", async () => {
    const client = createTestQueryClient();
    const spy = jest.spyOn(client, "invalidateQueries");
    const { result } = renderHook(() => useRemoveUserAvatar(null), { wrapper: wrap(client) });

    await result.current.mutateAsync("old/path.png");

    expect(repo.removeUserAvatar).toHaveBeenCalled();
    expect(spy).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// useUpdateUserDisplayName: onSuccess guard `if (!userId) return;`.
// ---------------------------------------------------------------------------
describe("useUpdateUserDisplayName onSuccess guard", () => {
  it("updates and invalidates the profile detail key for a real user", async () => {
    const client = createTestQueryClient();
    const spy = jest.spyOn(client, "invalidateQueries");
    const { result } = renderHook(() => useUpdateUserDisplayName("u1"), { wrapper: wrap(client) });

    await result.current.mutateAsync("Ada Lovelace");

    expect(repo.updateUserDisplayName).toHaveBeenCalledWith("u1", "Ada Lovelace");
    const queryKeys = spy.mock.calls.map((c) => (c[0] as { queryKey?: unknown }).queryKey);
    expect(queryKeys).toContainEqual(["profile", "u1"]);
  });

  it("skips invalidation when userId is null", async () => {
    const client = createTestQueryClient();
    const spy = jest.spyOn(client, "invalidateQueries");
    const { result } = renderHook(() => useUpdateUserDisplayName(null), { wrapper: wrap(client) });

    await result.current.mutateAsync("Ada Lovelace");

    expect(repo.updateUserDisplayName).toHaveBeenCalled();
    expect(spy).not.toHaveBeenCalled();
  });
});
