import * as Notifications from "expo-notifications";
import { Platform } from "react-native";

import { disableDevicePushToken, ensureDevicePushToken } from "@/src/lib/push-token";
import { deleteDevicePushToken, upsertDevicePushToken } from "@/src/features/settings/repository";

jest.mock("expo-notifications", () => ({
  getPermissionsAsync: jest.fn(),
  requestPermissionsAsync: jest.fn(),
  getExpoPushTokenAsync: jest.fn(),
}));
jest.mock("expo-constants", () => ({ expoConfig: { extra: { eas: { projectId: "proj-1" } } } }));
jest.mock("@/src/features/settings/repository", () => ({
  upsertDevicePushToken: jest.fn(),
  deleteDevicePushToken: jest.fn(),
}));

const mockGetPerms = jest.mocked(Notifications.getPermissionsAsync);
const mockReqPerms = jest.mocked(Notifications.requestPermissionsAsync);
const mockGetToken = jest.mocked(Notifications.getExpoPushTokenAsync);
const mockUpsert = jest.mocked(upsertDevicePushToken);
const mockDelete = jest.mocked(deleteDevicePushToken);

function setPlatformOS(os: string) {
  Object.defineProperty(Platform, "OS", { configurable: true, get: () => os });
}

describe("ensureDevicePushToken", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    setPlatformOS("android");
    mockGetPerms.mockResolvedValue({ granted: true } as never);
    mockGetToken.mockResolvedValue({ data: "ExponentPushToken[abc]" } as never);
  });
  afterAll(() => setPlatformOS("ios"));

  it("registers and upserts the token when permission is granted", async () => {
    await expect(ensureDevicePushToken("user-1")).resolves.toEqual({ enabled: true });
    expect(mockGetToken).toHaveBeenCalledWith({ projectId: "proj-1" });
    expect(mockUpsert).toHaveBeenCalledWith("user-1", {
      token: "ExponentPushToken[abc]",
      platform: "android",
      timeZone: expect.any(String),
    });
  });

  it("requests permission when not yet granted and bails if denied", async () => {
    mockGetPerms.mockResolvedValue({ granted: false } as never);
    mockReqPerms.mockResolvedValue({ granted: false } as never);
    await expect(ensureDevicePushToken("user-1")).resolves.toEqual({
      enabled: false,
      reason: "permission-denied",
    });
    expect(mockUpsert).not.toHaveBeenCalled();
  });

  it("is a no-op on web", async () => {
    setPlatformOS("web");
    await expect(ensureDevicePushToken("user-1")).resolves.toEqual({
      enabled: false,
      reason: "unsupported",
    });
    expect(mockGetToken).not.toHaveBeenCalled();
  });

  it("does nothing without a user", async () => {
    await expect(ensureDevicePushToken(null)).resolves.toEqual({
      enabled: false,
      reason: "missing-user",
    });
  });
});

describe("disableDevicePushToken", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    setPlatformOS("android");
    mockGetToken.mockResolvedValue({ data: "ExponentPushToken[abc]" } as never);
    mockGetPerms.mockResolvedValue({ granted: true } as never);
  });

  it("deletes the current device's token", async () => {
    await disableDevicePushToken("user-1");
    expect(mockDelete).toHaveBeenCalledWith("user-1", "ExponentPushToken[abc]");
  });
});
