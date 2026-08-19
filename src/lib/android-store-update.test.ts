import { Platform } from "react-native";

import { checkAndroidStoreUpdate } from "@/src/lib/android-store-update";

jest.mock("expo-in-app-updates", () => ({ checkForUpdate: jest.fn() }));

const { checkForUpdate } = jest.requireMock("expo-in-app-updates") as {
  checkForUpdate: jest.Mock;
};

function setPlatform(os: "android" | "ios" | "web") {
  Object.defineProperty(Platform, "OS", { configurable: true, value: os });
}

beforeEach(() => {
  jest.clearAllMocks();
  setPlatform("android");
  // jest-expo runs with __DEV__ true; production is the case under test.
  (globalThis as unknown as { __DEV__: boolean }).__DEV__ = false;
});

afterEach(() => {
  setPlatform("ios");
  (globalThis as unknown as { __DEV__: boolean }).__DEV__ = true;
});

describe("checkAndroidStoreUpdate", () => {
  it("reports the store's versionCode when Play has a newer build", async () => {
    checkForUpdate.mockResolvedValue({ updateAvailable: true, storeVersion: "18" });

    await expect(checkAndroidStoreUpdate()).resolves.toBe("18");
  });

  it("reports nothing when Play says the install is current", async () => {
    checkForUpdate.mockResolvedValue({ updateAvailable: false, storeVersion: "18" });

    await expect(checkAndroidStoreUpdate()).resolves.toBeNull();
  });

  // Play answers `updateAvailable` and the version separately; an availability
  // with no version to key a dismissal on is unusable, not an offer.
  it("reports nothing when Play omits the version", async () => {
    checkForUpdate.mockResolvedValue({ updateAvailable: true, storeVersion: undefined });

    await expect(checkAndroidStoreUpdate()).resolves.toBeNull();
  });

  // A sideloaded build, an adb install, or a device with no Play Store rejects
  // with a message-only CodedException - APP_NOT_OWNED / PLAY_STORE_NOT_FOUND /
  // API_NOT_AVAILABLE are not machine-readable from JS, so every rejection is
  // "no answer" rather than an error the user should see.
  it("stays silent when Play Core rejects", async () => {
    checkForUpdate.mockRejectedValue(new Error("APP_NOT_OWNED"));

    await expect(checkAndroidStoreUpdate()).resolves.toBeNull();
  });

  it.each(["ios", "web"] as const)("never asks Play on %s", async (os) => {
    setPlatform(os);

    await expect(checkAndroidStoreUpdate()).resolves.toBeNull();
    // Not merely "returned null": the module must not be reached at all on iOS.
    // See the require() comment in the implementation - touching it there took
    // the whole bundle down on launch in WikiCanvas (#606).
    expect(checkForUpdate).not.toHaveBeenCalled();
  });

  it("stays silent in dev builds, without asking Play", async () => {
    (globalThis as unknown as { __DEV__: boolean }).__DEV__ = true;

    await expect(checkAndroidStoreUpdate()).resolves.toBeNull();
    expect(checkForUpdate).not.toHaveBeenCalled();
  });
});
