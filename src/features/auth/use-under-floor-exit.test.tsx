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

// Whoever is signed in RIGHT NOW, which is not the same question as whose
// verdict this screen is rendering - and #2195 is what happens when the two are
// conflated.
let mockSessionUserId: string | null = "user-1";

jest.mock("@/src/providers/session-provider", () => ({
  useSession: () => ({ user: mockSessionUserId === null ? null : { id: mockSessionUserId } }),
}));

const mockSignOut = signOut as jest.MockedFunction<typeof signOut>;
const mockCaptureError = captureError as jest.MockedFunction<typeof captureError>;

function wrapper({ children }: PropsWithChildren) {
  return <QueryClientProvider client={createTestQueryClient()}>{children}</QueryClientProvider>;
}

/**
 * `verdictUserId` is the account the age gate judged; `sessionUserId` is the
 * account signed in on the device. They are the same person on the ordinary
 * path and different people on the one this hook now has to refuse.
 */
const renderExit = (verdictUserId: string | null, sessionUserId = verdictUserId) => {
  mockSessionUserId = sessionUserId;
  return renderHook(() => useUnderFloorExit(verdictUserId), { wrapper });
};

/** The whole ordinary path: the verdict lands, then the person confirms. */
const confirmAndSettle = async (result: { current: { eraseAccount: () => void } }) => {
  await act(async () => result.current.eraseAccount());
};

beforeEach(async () => {
  jest.clearAllMocks();
  await AsyncStorage.clear();
  mockSessionUserId = "user-1";
  mockDeleteAccount.mockResolvedValue(undefined);
  mockSignOut.mockResolvedValue(undefined);
});

describe("the under-floor exit", () => {
  it("blocks the device on mount, before anyone has confirmed anything", async () => {
    // ☠️ The floor is not the part that waits for a press. The device is
    // blocked whether or not the erasure is ever asked for, so closing the app
    // is not a way past the verdict.
    const { result } = renderExit("user-1");

    await waitFor(async () =>
      expect(await AsyncStorage.getItem(UNDER_FLOOR_BLOCK_KEY)).not.toBeNull(),
    );
    expect(result.current.state).toBe("awaiting-confirmation");
    expect(mockDeleteAccount).not.toHaveBeenCalled();
  });

  it("deletes nothing on mount, however often the screen re-renders", async () => {
    // ☠️☠️ #2193. This used to be a mount effect: one press of the age gate's
    // submit button - which names no age and warns of nothing - both produced
    // the verdict and executed an irreversible server-side purge.
    const { rerender, result } = renderExit("user-1");

    await waitFor(() => expect(result.current.state).toBe("awaiting-confirmation"));
    rerender(undefined);
    rerender(undefined);
    await act(async () => {});

    expect(mockDeleteAccount).not.toHaveBeenCalled();
    expect(mockSignOut).not.toHaveBeenCalled();
  });

  it("deletes the account and ends the session once the person confirms", async () => {
    const { result } = renderExit("user-1");
    await waitFor(() => expect(result.current.state).toBe("awaiting-confirmation"));

    await confirmAndSettle(result);

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
    await confirmAndSettle(result);

    await waitFor(() => expect(result.current.state).toBe("erased"));
    expect(blockAtDeleteTime).toHaveBeenCalledTimes(1);
    expect(blockAtDeleteTime.mock.calls[0][0]).not.toBeNull();
  });

  it("blocks the device even when the deletion fails", async () => {
    mockDeleteAccount.mockRejectedValue(new Error("offline"));

    const { result } = renderExit("user-1");
    await confirmAndSettle(result);

    await waitFor(() => expect(result.current.state).toBe("failed"));
    await expect(AsyncStorage.getItem(UNDER_FLOOR_BLOCK_KEY)).resolves.not.toBeNull();
  });

  it("keeps the session alive when the deletion fails, so a retry still has a target", async () => {
    // signOut would strip the token the RPC authenticates with - and
    // delete_user_account() derives its target from auth.uid(), so a signed-out
    // client can never finish the job it started.
    mockDeleteAccount.mockRejectedValue(new Error("offline"));

    const { result } = renderExit("user-1");
    await confirmAndSettle(result);

    await waitFor(() => expect(result.current.state).toBe("failed"));
    expect(mockSignOut).not.toHaveBeenCalled();
    expect(mockCaptureError).toHaveBeenCalled();
  });

  it("retries the deletion on demand, and reports erased once it lands", async () => {
    mockDeleteAccount.mockRejectedValueOnce(new Error("offline"));

    const { result } = renderExit("user-1");
    await confirmAndSettle(result);
    await waitFor(() => expect(result.current.state).toBe("failed"));

    await confirmAndSettle(result);

    await waitFor(() => expect(result.current.state).toBe("erased"));
    expect(mockDeleteAccount).toHaveBeenCalledTimes(2);
    expect(mockSignOut).toHaveBeenCalledWith("global");
  });

  it("still blocks the device when there is no verdict to act on", async () => {
    // A returning blocked device carries the flag and no verdict: the flag
    // holds an expiry and nothing else, so it can name no account.
    const { result } = renderExit(null, null);

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
    const { result } = renderExit(null, null);
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
    await confirmAndSettle(result);

    await waitFor(() => expect(result.current.state).toBe("erased"));
    expect(mockCaptureError).toHaveBeenCalled();
  });
});

/**
 * ☠️☠️ #2195: the block is device-scoped and the erasure is account-scoped, and
 * for 24 hours after one person's verdict the two were not the same account.
 *
 * The scenario every test here is about: person A answers below their floor on
 * a shared phone; inside the window person B signs into their own established
 * account and reaches `(app)`, which renders this screen for B's session.
 */
describe("the account the under-floor exit may act on", () => {
  it("never erases an account the verdict did not judge", async () => {
    const { result } = renderExit("user-a", "user-b");

    await waitFor(() => expect(result.current.state).toBe("nothing-to-erase"));
    // Even if the control were somehow pressed: the guard is next to the call,
    // not only in the render.
    await confirmAndSettle(result);

    expect(mockDeleteAccount).not.toHaveBeenCalled();
    expect(mockSignOut).not.toHaveBeenCalled();
    expect(result.current.state).toBe("nothing-to-erase");
  });

  it("still blocks the device it cannot vouch for, so the floor is untouched", async () => {
    // The fix removes the DESTRUCTION from a session the flag cannot vouch for.
    // It must not remove the block - that would turn a wrong-subject bug into a
    // way past the age floor.
    const { result } = renderExit(null, "user-b");

    await waitFor(async () =>
      expect(await AsyncStorage.getItem(UNDER_FLOOR_BLOCK_KEY)).not.toBeNull(),
    );
    expect(result.current.state).toBe("nothing-to-erase");
  });

  it("stops offering the erasure the moment another account is the signed-in one", async () => {
    // The verdict's own account, then a different one on the same mount: the
    // offer has to withdraw, because the RPC deletes auth.uid() and would take
    // the newcomer instead.
    const { rerender, result } = renderExit("user-a", "user-a");
    await waitFor(() => expect(result.current.state).toBe("awaiting-confirmation"));

    mockSessionUserId = "user-b";
    rerender(undefined);

    await waitFor(() => expect(result.current.state).toBe("nothing-to-erase"));
    await confirmAndSettle(result);
    expect(mockDeleteAccount).not.toHaveBeenCalled();
  });

  it("does not re-label an erasure that already landed when the sign-out clears the session", async () => {
    // ☠️ The successful path ENDS with no session at all, so a naive "no
    // session, nothing to erase" would overwrite the one state that tells the
    // person their account is gone.
    mockSignOut.mockImplementation(async () => {
      mockSessionUserId = null;
    });

    const { rerender, result } = renderExit("user-1");
    await confirmAndSettle(result);
    await waitFor(() => expect(result.current.state).toBe("erased"));

    rerender(undefined);
    await act(async () => {});

    expect(result.current.state).toBe("erased");
  });
});
