import AsyncStorage from "@react-native-async-storage/async-storage";

import {
  clearSessionMarker,
  readSessionMarker,
  writeSessionMarker,
} from "@/src/features/auth/session-marker";

describe("session marker (#1450)", () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
  });

  it("round-trips the last session's user id", async () => {
    await writeSessionMarker("user-1");

    expect(await readSessionMarker()).toBe("user-1");
  });

  it("reads null when nothing was ever written", async () => {
    expect(await readSessionMarker()).toBeNull();
  });

  it("clears for good", async () => {
    await writeSessionMarker("user-1");
    await clearSessionMarker();

    expect(await readSessionMarker()).toBeNull();
  });

  // Storage can be unavailable (private windows, full disk); a failed read
  // must degrade to "no marker", never block entry.
  it("a throwing storage reads as no marker", async () => {
    const spy = jest.spyOn(AsyncStorage, "getItem").mockRejectedValueOnce(new Error("nope"));

    expect(await readSessionMarker()).toBeNull();
    spy.mockRestore();
  });

  it("a throwing write is swallowed", async () => {
    const spy = jest.spyOn(AsyncStorage, "setItem").mockRejectedValueOnce(new Error("nope"));

    await expect(writeSessionMarker("user-1")).resolves.toBeUndefined();
    spy.mockRestore();
  });
});
