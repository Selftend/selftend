import { act, renderHook, waitFor } from "@testing-library/react-native";

import { authenticate, isBiometricAvailable } from "@/src/features/security/biometric";
import { useAppLock } from "@/src/features/settings/use-app-lock";
import { useAppLockStore } from "@/src/features/security/app-lock-store";
import { useToastStore } from "@/src/stores/toast-store";

jest.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));
jest.mock("@/src/features/security/biometric", () => ({
  authenticate: jest.fn(),
  isBiometricAvailable: jest.fn(),
}));
jest.mock("@/src/features/security/app-lock-store", () => ({ useAppLockStore: jest.fn() }));
jest.mock("@/src/stores/toast-store", () => ({ useToastStore: jest.fn() }));

const mockAuthenticate = authenticate as jest.MockedFunction<typeof authenticate>;
const mockIsAvailable = isBiometricAvailable as jest.MockedFunction<typeof isBiometricAvailable>;
const mockUseStore = useAppLockStore as unknown as jest.Mock;
const mockUseToastStore = useToastStore as unknown as jest.Mock;

const setEnabled = jest.fn();
const hydrate = jest.fn();
const showToast = jest.fn();

describe("useAppLock", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    setEnabled.mockResolvedValue(undefined);
    hydrate.mockResolvedValue(undefined);
    mockUseStore.mockImplementation((selector: (s: unknown) => unknown) =>
      selector({ enabled: false, setEnabled, hydrate }),
    );
    mockUseToastStore.mockImplementation((selector: (s: { showToast: unknown }) => unknown) =>
      selector({ showToast }),
    );
    mockIsAvailable.mockResolvedValue(true);
  });

  it("cannot toggle until biometric availability resolves true", async () => {
    const { result } = renderHook(() => useAppLock());
    expect(result.current.canToggle).toBe(false);
    await waitFor(() => expect(result.current.canToggle).toBe(true));
    expect(hydrate).toHaveBeenCalled();
  });

  it("does not flip the lock when authentication is not confirmed", async () => {
    mockAuthenticate.mockResolvedValue(false);
    const { result } = renderHook(() => useAppLock());
    await waitFor(() => expect(result.current.canToggle).toBe(true));

    await act(async () => {
      await result.current.toggle(true);
    });

    expect(mockAuthenticate).toHaveBeenCalled();
    expect(setEnabled).not.toHaveBeenCalled();
  });

  it("requires a confirmed auth in BOTH directions (on and off)", async () => {
    mockAuthenticate.mockResolvedValue(true);
    const { result } = renderHook(() => useAppLock());
    await waitFor(() => expect(result.current.canToggle).toBe(true));

    await act(async () => {
      await result.current.toggle(true);
    });
    expect(setEnabled).toHaveBeenCalledWith(true);

    await act(async () => {
      await result.current.toggle(false);
    });
    expect(setEnabled).toHaveBeenCalledWith(false);
    expect(mockAuthenticate).toHaveBeenCalledTimes(2);
  });

  it("shows an error toast when the persist throws", async () => {
    mockAuthenticate.mockResolvedValue(true);
    setEnabled.mockRejectedValue(new Error("write failed"));
    const { result } = renderHook(() => useAppLock());
    await waitFor(() => expect(result.current.canToggle).toBe(true));

    await act(async () => {
      await result.current.toggle(true);
    });

    expect(showToast).toHaveBeenCalledWith(expect.objectContaining({ tone: "error" }));
  });
});
