import { act, renderHook } from "@testing-library/react-native";

import { signOut } from "@/src/features/auth/api";
import { cancelAllReminders } from "@/src/lib/notifications";
import { useSignOut } from "@/src/features/settings/use-sign-out";
import { useToastStore } from "@/src/stores/toast-store";

jest.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));
jest.mock("@/src/features/auth/api", () => ({ signOut: jest.fn() }));
jest.mock("@/src/lib/notifications", () => ({ cancelAllReminders: jest.fn() }));
jest.mock("@/src/stores/toast-store", () => ({ useToastStore: jest.fn() }));

const mockSignOut = signOut as jest.MockedFunction<typeof signOut>;
const mockCancel = cancelAllReminders as jest.MockedFunction<typeof cancelAllReminders>;
const mockUseToastStore = useToastStore as unknown as jest.Mock;
const showToast = jest.fn();

describe("useSignOut", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseToastStore.mockImplementation((selector: (s: { showToast: unknown }) => unknown) =>
      selector({ showToast }),
    );
    mockCancel.mockResolvedValue(undefined);
    mockSignOut.mockResolvedValue(undefined);
  });

  it("cancels this device's reminders BEFORE signing out (RLS context still valid)", async () => {
    const { result } = renderHook(() => useSignOut("user-1"));

    await act(async () => {
      await result.current();
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
    mockSignOut.mockRejectedValue(new Error("boom"));
    const { result } = renderHook(() => useSignOut("user-1"));

    await act(async () => {
      await result.current();
    });

    expect(showToast).toHaveBeenCalledTimes(1);
    expect(showToast).toHaveBeenCalledWith(expect.objectContaining({ tone: "error" }));
  });

  // #1055: `signOut` throws Supabase/network strings - "Auth session missing!",
  // "Failed to fetch" - which are English whatever the user's language, and name
  // nothing they can act on. Unlike sign-IN, no message here maps to a next step,
  // so there is nothing to lose by saying it in the user's own language.
  it("describes the failure in the user's language, never the raw thrown message", async () => {
    mockSignOut.mockRejectedValue(new Error("Auth session missing!"));
    const { result } = renderHook(() => useSignOut("user-1"));

    await act(async () => {
      await result.current();
    });

    expect(showToast).toHaveBeenCalledWith(
      expect.objectContaining({ description: "account.signOutError" }),
    );
  });

  // #1055: the title used to be `common:feedback.problem`, which reads "Something
  // did not save". Sign-out saves nothing - and that key is right for the ~30 save
  // failures that share it, so this needed its own sentence rather than a re-word.
  it("titles the failure as something going wrong, not as a failed save", async () => {
    mockSignOut.mockRejectedValue(new Error("boom"));
    const { result } = renderHook(() => useSignOut("user-1"));

    await act(async () => {
      await result.current();
    });

    expect(showToast).toHaveBeenCalledWith(
      expect.objectContaining({ title: "common:feedback.wentWrong" }),
    );
  });
});
