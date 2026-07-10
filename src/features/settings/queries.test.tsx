import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react-native";
import type { PropsWithChildren } from "react";

import { defaultUserPreferences } from "@/src/features/modules/types";
import { preferenceKeys, useUpdateUserPreferences } from "@/src/features/settings/queries";
import { updateUserPreferences } from "@/src/features/settings/repository";
import { createTestQueryClient } from "@/test/render-with-providers";

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

function makeWrapper(client: QueryClient) {
  return function wrapper({ children }: PropsWithChildren) {
    return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
  };
}

describe("useUpdateUserPreferences - invalidation", () => {
  beforeEach(() => jest.clearAllMocks());

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

    const queryKeys = spy.mock.calls.map((c) => (c[0] as { queryKey?: unknown }).queryKey);
    expect(queryKeys).toContainEqual(["preferences", "u1"]);
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
});
