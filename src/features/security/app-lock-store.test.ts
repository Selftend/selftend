import AsyncStorage from "@react-native-async-storage/async-storage";

import { APP_LOCK_STORAGE_KEY, useAppLockStore } from "@/src/features/security/app-lock-store";

describe("app-lock store", () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
    useAppLockStore.setState({ enabled: false, hydrated: false });
  });

  it("defaults to disabled when nothing is stored", async () => {
    await useAppLockStore.getState().hydrate();

    expect(useAppLockStore.getState().enabled).toBe(false);
    expect(useAppLockStore.getState().hydrated).toBe(true);
  });

  it("hydrates an enabled preference from storage", async () => {
    await AsyncStorage.setItem(APP_LOCK_STORAGE_KEY, "1");

    await useAppLockStore.getState().hydrate();

    expect(useAppLockStore.getState().enabled).toBe(true);
  });

  it("treats any non-'1' stored value as disabled", async () => {
    await AsyncStorage.setItem(APP_LOCK_STORAGE_KEY, "0");

    await useAppLockStore.getState().hydrate();

    expect(useAppLockStore.getState().enabled).toBe(false);
  });

  it("persists '1' to storage when enabled", async () => {
    await useAppLockStore.getState().setEnabled(true);

    expect(useAppLockStore.getState().enabled).toBe(true);
    expect(await AsyncStorage.getItem(APP_LOCK_STORAGE_KEY)).toBe("1");
  });

  it("persists '0' to storage when disabled", async () => {
    await useAppLockStore.getState().setEnabled(true);
    await useAppLockStore.getState().setEnabled(false);

    expect(useAppLockStore.getState().enabled).toBe(false);
    expect(await AsyncStorage.getItem(APP_LOCK_STORAGE_KEY)).toBe("0");
  });

  it("still flips `hydrated` (safe passthrough) when the storage read fails", async () => {
    const spy = jest
      .spyOn(AsyncStorage, "getItem")
      .mockRejectedValueOnce(new Error("storage unavailable"));

    // Must not reject — a read failure should degrade, not brick the gate.
    await expect(useAppLockStore.getState().hydrate()).resolves.toBeUndefined();
    expect(useAppLockStore.getState().hydrated).toBe(true);
    expect(useAppLockStore.getState().enabled).toBe(false);

    spy.mockRestore();
  });
});
