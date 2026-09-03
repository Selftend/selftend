import AsyncStorage from "@react-native-async-storage/async-storage";

import {
  UNDER_FLOOR_BLOCK_KEY,
  UNDER_FLOOR_BLOCK_MS,
  clearUnderFloorBlock,
  readUnderFloorBlock,
  writeUnderFloorBlock,
} from "./under-floor-block";

const NOW = new Date("2026-09-03T12:00:00.000Z");

beforeEach(async () => {
  jest.restoreAllMocks();
  await AsyncStorage.clear();
});

describe("readUnderFloorBlock", () => {
  it("is not blocked on a device that has never been here", async () => {
    await expect(readUnderFloorBlock(NOW)).resolves.toBe(false);
  });

  it("is blocked for the whole window after a write", async () => {
    await writeUnderFloorBlock(NOW);

    await expect(readUnderFloorBlock(NOW)).resolves.toBe(true);
    const lastMoment = new Date(NOW.getTime() + UNDER_FLOOR_BLOCK_MS - 1);
    await expect(readUnderFloorBlock(lastMoment)).resolves.toBe(true);
  });

  it("lets the window expire - it is a speed bump, not a ban", async () => {
    await writeUnderFloorBlock(NOW);

    const after = new Date(NOW.getTime() + UNDER_FLOOR_BLOCK_MS);
    await expect(readUnderFloorBlock(after)).resolves.toBe(false);
  });

  it("clears the expired entry rather than leaving it to be re-read forever", async () => {
    await writeUnderFloorBlock(NOW);

    await readUnderFloorBlock(new Date(NOW.getTime() + UNDER_FLOOR_BLOCK_MS));

    await expect(AsyncStorage.getItem(UNDER_FLOOR_BLOCK_KEY)).resolves.toBeNull();
  });

  it("treats junk in the key as no block", async () => {
    await AsyncStorage.setItem(UNDER_FLOOR_BLOCK_KEY, "tomorrow");

    await expect(readUnderFloorBlock(NOW)).resolves.toBe(false);
  });

  it("does not block when storage is unreadable", async () => {
    jest.spyOn(AsyncStorage, "getItem").mockRejectedValueOnce(new Error("no storage"));

    await expect(readUnderFloorBlock(NOW)).resolves.toBe(false);
  });
});

describe("what the flag stores", () => {
  it("holds one expiry timestamp and nothing else - no date of birth, no country, no id", async () => {
    await writeUnderFloorBlock(NOW);

    const stored = await AsyncStorage.getItem(UNDER_FLOOR_BLOCK_KEY);
    expect(stored).toBe(String(NOW.getTime() + UNDER_FLOOR_BLOCK_MS));
  });

  it("survives a storage write failure without throwing at the caller", async () => {
    jest.spyOn(AsyncStorage, "setItem").mockRejectedValueOnce(new Error("no storage"));

    await expect(writeUnderFloorBlock(NOW)).resolves.toBeUndefined();
  });
});

describe("clearUnderFloorBlock", () => {
  it("removes the block", async () => {
    await writeUnderFloorBlock(NOW);

    await clearUnderFloorBlock();

    await expect(readUnderFloorBlock(NOW)).resolves.toBe(false);
  });

  it("swallows a storage failure", async () => {
    jest.spyOn(AsyncStorage, "removeItem").mockRejectedValueOnce(new Error("no storage"));

    await expect(clearUnderFloorBlock()).resolves.toBeUndefined();
  });
});
