import AsyncStorage from "@react-native-async-storage/async-storage";
import { act, renderHook, waitFor } from "@testing-library/react-native";
import type { PropsWithChildren } from "react";
import { QueryClientProvider } from "@tanstack/react-query";

import { useUnderFloorExit } from "./use-under-floor-exit";
import { UNDER_FLOOR_BLOCK_KEY } from "./under-floor-block";
import { signOut } from "@/src/features/auth/api";
import { captureError } from "@/src/lib/sentry";
import { createTestQueryClient } from "@/test/render-with-providers";

const mockDeleteAccount = jest.fn();

jest.mock("@/src/features/settings/queries", () => ({
  useDeleteUserAccount: () => ({ mutateAsync: mockDeleteAccount }),
}));

jest.mock("@/src/features/auth/api", () => ({
  signOut: jest.fn(),
}));

jest.mock("@/src/lib/sentry", () => ({
  captureError: jest.fn(),
  isReportableError: jest.fn(() => true),
}));

const mockSignOut = signOut as jest.MockedFunction<typeof signOut>;
const mockCaptureError = captureError as jest.MockedFunction<typeof captureError>;

function wrapper({ children }: PropsWithChildren) {
  return <QueryClientProvider client={createTestQueryClient()}>{children}</QueryClientProvider>;
}

const renderExit = (userId: string | null) =>
  renderHook(() => useUnderFloorExit(userId), { wrapper });

beforeEach(async () => {
  jest.clearAllMocks();
  await AsyncStorage.clear();
  mockDeleteAccount.mockResolvedValue(undefined);
  mockSignOut.mockResolvedValue(undefined);
});

describe("the under-floor exit", () => {
  it("deletes the account and ends the session", async () => {
    const { result } = renderExit("user-1");

    await waitFor(() => expect(result.current.state).toBe("erased"));
    expect(mockDeleteAccount).toHaveBeenCalledTimes(1);
    // `global`, not `local`: the account row is gone, so every device's session
    // is already dead server-side.
    expect(mockSignOut).toHaveBeenCalledWith("global");
  });

  it("writes the device block BEFORE it asks for the deletion", async () => {
    // ☠️ The order is the whole guarantee. If the app is killed between the two,
    // the flag is what keeps the next launch out - a device blocked with the
    // account still alive is recoverable, a deleted account with no flag is a
    // person who walks straight back into the gate.
    const blockAtDeleteTime = jest.fn();
    mockDeleteAccount.mockImplementation(async () => {
      blockAtDeleteTime(await AsyncStorage.getItem(UNDER_FLOOR_BLOCK_KEY));
    });

    const { result } = renderExit("user-1");

    await waitFor(() => expect(result.current.state).toBe("erased"));
    expect(blockAtDeleteTime).toHaveBeenCalledTimes(1);
    expect(blockAtDeleteTime.mock.calls[0][0]).not.toBeNull();
  });

  it("blocks the device even when the deletion fails", async () => {
    mockDeleteAccount.mockRejectedValue(new Error("offline"));

    const { result } = renderExit("user-1");

    await waitFor(() => expect(result.current.state).toBe("failed"));
    await expect(AsyncStorage.getItem(UNDER_FLOOR_BLOCK_KEY)).resolves.not.toBeNull();
  });

  it("keeps the session alive when the deletion fails, so a retry still has a target", async () => {
    // signOut would strip the token the RPC authenticates with - and
    // delete_user_account() derives its target from auth.uid(), so a signed-out
    // client can never finish the job it started.
    mockDeleteAccount.mockRejectedValue(new Error("offline"));

    const { result } = renderExit("user-1");

    await waitFor(() => expect(result.current.state).toBe("failed"));
    expect(mockSignOut).not.toHaveBeenCalled();
    expect(mockCaptureError).toHaveBeenCalled();
  });

  it("retries the deletion on demand, and reports erased once it lands", async () => {
    mockDeleteAccount.mockRejectedValueOnce(new Error("offline"));

    const { result } = renderExit("user-1");
    await waitFor(() => expect(result.current.state).toBe("failed"));

    await act(async () => result.current.retry());

    await waitFor(() => expect(result.current.state).toBe("erased"));
    expect(mockDeleteAccount).toHaveBeenCalledTimes(2);
    expect(mockSignOut).toHaveBeenCalledWith("global");
  });

  it("runs the erasure once, however often the screen re-renders", async () => {
    const { rerender, result } = renderExit("user-1");

    await waitFor(() => expect(result.current.state).toBe("erased"));
    rerender(undefined);
    rerender(undefined);

    expect(mockDeleteAccount).toHaveBeenCalledTimes(1);
  });

  it("still blocks the device when there is no session to delete", async () => {
    // The web sign-up path has no session at the moment of the verdict, and a
    // returning blocked device has none either.
    const { result } = renderExit(null);

    // ☠️ NOT "erased": nothing was removed, and the screen must not claim a
    // removal it never observed.
    await waitFor(() => expect(result.current.state).toBe("nothing-to-erase"));
    expect(mockDeleteAccount).not.toHaveBeenCalled();
    await expect(AsyncStorage.getItem(UNDER_FLOOR_BLOCK_KEY)).resolves.not.toBeNull();
  });

  it("does not restart the block window on a later launch", async () => {
    // ☠️ The screen mounts on every launch inside the window, so an
    // unconditional write would roll the block forward forever for anyone who
    // opens the app daily - a ban on a device, not the speed bump this is.
    const verdict = new Date("2026-09-04T09:00:00.000Z");
    jest.useFakeTimers().setSystemTime(verdict);
    const { unmount } = renderExit("user-1");
    await waitFor(async () =>
      expect(await AsyncStorage.getItem(UNDER_FLOOR_BLOCK_KEY)).not.toBeNull(),
    );
    const setAtVerdict = await AsyncStorage.getItem(UNDER_FLOOR_BLOCK_KEY);
    unmount();

    // A launch twelve hours later, still inside the window.
    jest.setSystemTime(new Date(verdict.getTime() + 12 * 60 * 60 * 1000));
    const { result } = renderExit(null);
    await waitFor(() => expect(result.current.state).toBe("nothing-to-erase"));

    expect(await AsyncStorage.getItem(UNDER_FLOOR_BLOCK_KEY)).toBe(setAtVerdict);
    jest.useRealTimers();
  });

  it("counts the erasure as done when only the sign-out failed", async () => {
    // The purge is what the promise "nothing is kept" rests on, and it landed.
    // A token left on the device belongs to a user row that no longer exists,
    // so it authenticates nothing.
    mockSignOut.mockRejectedValue(new Error("network"));

    const { result } = renderExit("user-1");

    await waitFor(() => expect(result.current.state).toBe("erased"));
    expect(mockCaptureError).toHaveBeenCalled();
  });
});
