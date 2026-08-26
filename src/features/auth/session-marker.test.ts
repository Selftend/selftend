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

  it("round-trips: written means present", async () => {
    await writeSessionMarker();

    expect(await readSessionMarker()).toBe(true);
  });

  it("reads absent when nothing was ever written", async () => {
    expect(await readSessionMarker()).toBe(false);
  });

  it("clears for good", async () => {
    await writeSessionMarker();
    await clearSessionMarker();

    expect(await readSessionMarker()).toBe(false);
  });

  // The marker outlives the account it describes, so it must carry NO data -
  // a bare presence flag, never the (possibly purged) account's user id.
  it("stores no personal data - only a presence flag", async () => {
    await writeSessionMarker();

    const stored = await AsyncStorage.getItem("selftend_session_marker");
    expect(stored).toBe("1");
  });

  // Storage can be unavailable (private windows, full disk); a failed read
  // must degrade to "no marker", never block entry.
  it("a throwing storage reads as no marker", async () => {
    const spy = jest.spyOn(AsyncStorage, "getItem").mockRejectedValueOnce(new Error("nope"));

    expect(await readSessionMarker()).toBe(false);
    spy.mockRestore();
  });

  it("a throwing write is swallowed", async () => {
    const spy = jest.spyOn(AsyncStorage, "setItem").mockRejectedValueOnce(new Error("nope"));

    await expect(writeSessionMarker()).resolves.toBeUndefined();
    spy.mockRestore();
  });
});
