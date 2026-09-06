import { act, renderHook } from "@testing-library/react-native";

import { signOut } from "@/src/features/auth/api";
import { cancelAllReminders } from "@/src/lib/notifications";
import { useSignOut } from "@/src/features/auth/use-sign-out";
import { captureError } from "@/src/lib/sentry";
import { useToastStore } from "@/src/stores/toast-store";

jest.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));
jest.mock("@/src/features/auth/api", () => ({ signOut: jest.fn() }));
jest.mock("@/src/lib/notifications", () => ({ cancelAllReminders: jest.fn() }));
jest.mock("@/src/lib/sentry", () => ({
  captureError: jest.fn(),
  // The real predicate, so "offline is not reported" is tested against the rule
  // the rest of the app reports by rather than against a stub of it.
  isReportableError: jest.requireActual("@/src/lib/sentry").isReportableError,
}));
jest.mock("@/src/stores/toast-store", () => ({ useToastStore: jest.fn() }));

const mockSignOut = signOut as jest.MockedFunction<typeof signOut>;
const mockCancel = cancelAllReminders as jest.MockedFunction<typeof cancelAllReminders>;
const mockCaptureError = captureError as jest.MockedFunction<typeof captureError>;
const mockUseToastStore = useToastStore as unknown as jest.Mock;
const showToast = jest.fn();
const clearToasts = jest.fn();

// ☠️ Identified by its EMAIL, not by `is_anonymous: false` (#1896). The hook's
// parameter is `Pick<User, "id" | "email">` now, so the flag is not merely
// unused here - it cannot be passed at all.
const registeredUser = { id: "user-1", email: "user@example.com" };

/** Runs a sign-out that fails at `signOut` with `error`. */
async function signOutFailingWith(error: unknown) {
  mockSignOut.mockRejectedValue(error);
  const { result } = renderHook(() => useSignOut(registeredUser));

  await act(async () => {
    await result.current.signOut();
  });
}

describe("useSignOut", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseToastStore.mockImplementation(
      (selector: (s: { showToast: unknown; clearToasts: unknown }) => unknown) =>
        selector({ showToast, clearToasts }),
    );
    mockCancel.mockResolvedValue(undefined);
    mockSignOut.mockResolvedValue(undefined);
  });

  it("cancels this device's reminders BEFORE signing out (RLS context still valid)", async () => {
    const { result } = renderHook(() => useSignOut(registeredUser));

    await act(async () => {
      await result.current.signOut();
    });

    expect(mockCancel).toHaveBeenCalledWith("user-1");
    expect(mockSignOut).toHaveBeenCalledTimes(1);
    // This device only (#968) - leaving the user signed in on their phone.
    expect(mockSignOut).toHaveBeenCalledWith("local");
    // Order matters: reminders must be deregistered while the session is still valid.
    expect(mockCancel.mock.invocationCallOrder[0]).toBeLessThan(
      mockSignOut.mock.invocationCallOrder[0],
    );
    expect(showToast).not.toHaveBeenCalled();
  });

  // The `setErrorMessage` this used to take is gone with the R7 banner pair (#982):
  // the toast was already firing beside the banner, so the failure is reported once
  // rather than twice on a page the user is trying to leave.
  //
  // This asserted `description: "boom"` until #1055 - i.e. it pinned the raw thrown
  // message reaching the user. That contract is deliberately gone, not weakened: the
  // sentence is now translated. See the test below.
  it("reports a failed sign-out through the toast, and only the toast", async () => {
    await signOutFailingWith(new Error("boom"));

    expect(showToast).toHaveBeenCalledTimes(1);
    expect(showToast).toHaveBeenCalledWith(expect.objectContaining({ tone: "error" }));
  });

  // #1055: `signOut` throws Supabase/network strings - "Auth session missing!",
  // "Failed to fetch" - which are English whatever the user's language, and name
  // nothing they can act on. Unlike sign-IN, no message here maps to a next step,
  // so there is nothing to lose by saying it in the user's own language.
  it("describes the failure in the user's language, never the raw thrown message", async () => {
    await signOutFailingWith(new Error("Auth session missing!"));

    expect(showToast).toHaveBeenCalledWith(
      expect.objectContaining({ description: "signOut.error" }),
    );
  });

  // #1055: the title used to be `common:feedback.problem`, which reads "Something
  // did not save". Sign-out saves nothing - and that key is right for the ~30 save
  // failures that share it, so this needed its own sentence rather than a re-word.
  it("titles the failure as something going wrong, not as a failed save", async () => {
    await signOutFailingWith(new Error("boom"));

    expect(showToast).toHaveBeenCalledWith(
      expect.objectContaining({ title: "common:feedback.wentWrong" }),
    );
  });

  // The thrown message no longer reaches the screen, so Sentry is the only place a
  // failed sign-out is diagnosable from. `signOut` is not a TanStack mutation, so
  // query-client's global reporter never sees it (#1055).
  it("reports the discarded error to Sentry", async () => {
    const error = new Error("Auth session missing!");

    await signOutFailingWith(error);

    expect(mockCaptureError).toHaveBeenCalledWith(error);
  });

  // #1336: `AppToast` lives in the ROOT layout, so it outlives the session. Now
  // that an error toast never auto-dismisses, an unread failure from this account
  // would sit in the slot waiting for whoever signs in next.
  it("tears down the toast slot so a sticky error cannot leak into the next session", async () => {
    const { result } = renderHook(() => useSignOut(registeredUser));

    await act(async () => {
      await result.current.signOut();
    });

    expect(clearToasts).toHaveBeenCalledTimes(1);
  });

  // The clear is scoped to the success path for exactly this reason: a `finally`
  // - or a clear placed before `signOut` resolved - would wipe the failure toast
  // raised right after it, which is the only surface a failed sign-out has left.
  it("leaves the failure toast standing when sign-out fails", async () => {
    await signOutFailingWith(new Error("boom"));

    expect(clearToasts).not.toHaveBeenCalled();
    expect(showToast).toHaveBeenCalledTimes(1);
  });

  it("does not clear when the failure stopped sign-out from being attempted", async () => {
    mockCancel.mockRejectedValue(new Error("reminders offline"));
    const { result } = renderHook(() => useSignOut(registeredUser));

    await act(async () => {
      await result.current.signOut();
    });

    expect(mockSignOut).not.toHaveBeenCalled();
    expect(clearToasts).not.toHaveBeenCalled();
    expect(showToast).toHaveBeenCalledTimes(1);
  });

  // Being offline is expected operation, not an incident - the same rule
  // `reportQueryError` applies.
  it("does not report the offline case", async () => {
    await signOutFailingWith(new Error("Network request failed"));

    expect(mockCaptureError).not.toHaveBeenCalled();
    // Still told the user, though.
    expect(showToast).toHaveBeenCalledTimes(1);
  });

  // #1442: a guest signing out is silent irreversible data loss - their session
  // token is the only key to the account. Both surfaces (settings row, header
  // menu) render their sign-out control off this one flag, so this is the
  // single place the guard can regress.
  describe("canSignOut", () => {
    // ☠️ `email: ""`, never an ABSENT key (#1896). That is what a guest's user
    // object actually carries - the type says `email?: string` and the value is
    // the empty string - and a fixture that omits the key instead would pass
    // whether the predicate used `!email` or `?? `, which is precisely the trap
    // `isGuestAccount`'s docblock exists to warn about.
    const guest = { id: "guest-1", email: "" };

    it("is false for a guest", () => {
      const { result } = renderHook(() => useSignOut(guest));

      expect(result.current.canSignOut).toBe(false);
    });

    // The layer enforces, not just advertises: a surface that forgets to check
    // still cannot sign a guest out.
    it("the handler itself refuses to sign a guest out", async () => {
      const { result } = renderHook(() => useSignOut(guest));

      await act(async () => {
        await result.current.signOut();
      });

      expect(mockCancel).not.toHaveBeenCalled();
      expect(mockSignOut).not.toHaveBeenCalled();
    });

    it("is true for a registered user", () => {
      const { result } = renderHook(() => useSignOut(registeredUser));

      expect(result.current.canSignOut).toBe(true);
    });

    /**
     * ☠️☠️ THE WINDOW THIS MOVED FOR (#1896). `convertGuestWithPassword` flips
     * `is_anonymous` server-side while the live JWT keeps claiming `true` until
     * the token is minted again. The old predicate read that flag, so for the
     * length of the window a just-converted person was refused Sign Out — and
     * `user-menu.tsx` had already moved its Sign in door onto the email, so the
     * same person was offered NEITHER control.
     *
     * The fixture is that person: converted, holding an email, and still
     * carrying a stale `is_anonymous: true` claim. ⚠️ The claim cannot be
     * written into the fixture at all any more — the parameter is
     * `Pick<User, "id" | "email">` — and that is the strongest form of the fix:
     * a later "restore the flag check" edit does not typecheck.
     */
    it("is true for a just-converted user whose flag is still stale", () => {
      const { result } = renderHook(() =>
        useSignOut({ id: "converted-1", email: "converted@example.com" }),
      );

      expect(result.current.canSignOut).toBe(true);
    });

    /**
     * ⚠️ REPLACES "is true when the claim is absent", whose premise the move
     * retired rather than whose assertion was flipped. That test read a missing
     * `is_anonymous` as "an older token that predates the claim, so registered".
     * Nothing reads the claim now, so the question no longer exists — and the
     * fixture it used, `{ id: "user-1" }` with no email, describes a user this
     * predicate calls a GUEST.
     *
     * That is the intended reading, not a regression: `isGuestAccount` rests on
     * every registered identity attaching an email (password, Google, Apple's
     * private relay; no phone auth), so a session with none is a guest. Pinned
     * here so the structural claim is asserted somewhere rather than only
     * argued in a docblock.
     */
    it("is false for a session carrying no email at all", () => {
      const { result } = renderHook(() => useSignOut({ id: "user-1" }));

      expect(result.current.canSignOut).toBe(false);
    });

    it("is false with no user at all", () => {
      const { result } = renderHook(() => useSignOut(null));

      expect(result.current.canSignOut).toBe(false);
    });
  });
});
