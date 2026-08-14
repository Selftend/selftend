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
    // Order matters: reminders must be deregistered while the session is still valid.
    expect(mockCancel.mock.invocationCallOrder[0]).toBeLessThan(
      mockSignOut.mock.invocationCallOrder[0],
    );
    expect(showToast).not.toHaveBeenCalled();
  });

  // The `setErrorMessage` this used to take is gone with the R7 banner pair (#982):
  // the toast was already firing beside the banner, so the failure is reported once
  // rather than twice on a page the user is trying to leave.
  it("reports a failed sign-out through the toast, and only the toast", async () => {
    mockSignOut.mockRejectedValue(new Error("boom"));
    const { result } = renderHook(() => useSignOut("user-1"));

    await act(async () => {
      await result.current();
    });

    expect(showToast).toHaveBeenCalledWith(
      expect.objectContaining({ description: "boom", tone: "error" }),
    );
  });
});
