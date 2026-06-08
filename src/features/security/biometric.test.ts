import { Platform } from "react-native";
import { authenticateAsync, hasHardwareAsync, isEnrolledAsync } from "expo-local-authentication";

import { authenticate, isBiometricAvailable } from "@/src/features/security/biometric";

jest.mock("expo-local-authentication", () => ({
  authenticateAsync: jest.fn(),
  hasHardwareAsync: jest.fn(),
  isEnrolledAsync: jest.fn(),
}));

const mockAuthenticateAsync = authenticateAsync as jest.MockedFunction<typeof authenticateAsync>;
const mockHasHardwareAsync = hasHardwareAsync as jest.MockedFunction<typeof hasHardwareAsync>;
const mockIsEnrolledAsync = isEnrolledAsync as jest.MockedFunction<typeof isEnrolledAsync>;

function setPlatform(os: typeof Platform.OS) {
  Object.defineProperty(Platform, "OS", { configurable: true, value: os });
}

describe("biometric", () => {
  const originalOS = Platform.OS;

  afterEach(() => {
    setPlatform(originalOS);
    jest.clearAllMocks();
  });

  describe("isBiometricAvailable", () => {
    it("is false on web without touching the native module", async () => {
      setPlatform("web");

      await expect(isBiometricAvailable()).resolves.toBe(false);
      expect(mockHasHardwareAsync).not.toHaveBeenCalled();
      expect(mockIsEnrolledAsync).not.toHaveBeenCalled();
    });

    it("is true on native when hardware exists and a credential is enrolled", async () => {
      setPlatform("ios");
      mockHasHardwareAsync.mockResolvedValue(true);
      mockIsEnrolledAsync.mockResolvedValue(true);

      await expect(isBiometricAvailable()).resolves.toBe(true);
    });

    it("is false on native when hardware is missing", async () => {
      setPlatform("ios");
      mockHasHardwareAsync.mockResolvedValue(false);
      mockIsEnrolledAsync.mockResolvedValue(true);

      await expect(isBiometricAvailable()).resolves.toBe(false);
    });

    it("is false on native when nothing is enrolled", async () => {
      setPlatform("android");
      mockHasHardwareAsync.mockResolvedValue(true);
      mockIsEnrolledAsync.mockResolvedValue(false);

      await expect(isBiometricAvailable()).resolves.toBe(false);
    });
  });

  describe("authenticate", () => {
    it("is false on web without prompting", async () => {
      setPlatform("web");

      await expect(authenticate("Unlock")).resolves.toBe(false);
      expect(mockAuthenticateAsync).not.toHaveBeenCalled();
    });

    it("reflects a successful native prompt", async () => {
      setPlatform("ios");
      mockAuthenticateAsync.mockResolvedValue({ success: true });

      await expect(authenticate("Unlock Selftend")).resolves.toBe(true);
      expect(mockAuthenticateAsync).toHaveBeenCalledWith({
        promptMessage: "Unlock Selftend",
        disableDeviceFallback: false,
      });
    });

    it("reflects a failed native prompt", async () => {
      setPlatform("android");
      mockAuthenticateAsync.mockResolvedValue({
        success: false,
        error: "user_cancel",
      });

      await expect(authenticate("Unlock")).resolves.toBe(false);
    });
  });
});
