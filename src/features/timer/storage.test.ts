import AsyncStorage from "@react-native-async-storage/async-storage";

import {
  loadIntervalMinutes,
  loadLastSessionDuration,
  normalizeIntervalMinutes,
  normalizeTimerDuration,
  parseStoredTimerDuration,
  saveIntervalMinutes,
  saveLastSessionDuration,
} from "@/src/features/timer/storage";

const STORAGE_KEY = "selftend:timer:lastSessionDurationMinutes";
const INTERVAL_KEY = "selftend:timer:intervalMinutes";

describe("timer storage", () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
  });

  it("normalizes durations to the supported minute range", () => {
    expect(normalizeTimerDuration(15)).toBe(15);
    expect(normalizeTimerDuration(15.4)).toBe(15);
    expect(normalizeTimerDuration(0)).toBe(1);
    expect(normalizeTimerDuration(999)).toBe(120);
    expect(normalizeTimerDuration(Number.NaN, 20)).toBe(20);
    expect(normalizeTimerDuration(Number.NaN, Number.NaN)).toBe(10);
  });

  it("parses persisted durations", () => {
    expect(parseStoredTimerDuration("25")).toBe(25);
    expect(parseStoredTimerDuration("999")).toBe(120);
    expect(parseStoredTimerDuration("")).toBeNull();
    expect(parseStoredTimerDuration("twenty")).toBeNull();
    expect(parseStoredTimerDuration(null)).toBeNull();
  });

  it("loads a previously persisted duration", async () => {
    await AsyncStorage.setItem(STORAGE_KEY, "30");

    await expect(loadLastSessionDuration()).resolves.toBe(30);
  });

  it("persists a normalized duration", async () => {
    await saveLastSessionDuration(999);

    expect(await AsyncStorage.getItem(STORAGE_KEY)).toBe("120");
  });

  it("normalizes interval minutes (0 = off, clamped to the max)", () => {
    expect(normalizeIntervalMinutes(5)).toBe(5);
    expect(normalizeIntervalMinutes(5.6)).toBe(6);
    expect(normalizeIntervalMinutes(0)).toBe(0);
    expect(normalizeIntervalMinutes(-3)).toBe(0);
    expect(normalizeIntervalMinutes(999)).toBe(60);
    expect(normalizeIntervalMinutes(Number.NaN)).toBe(0);
  });

  it("loads and persists the interval, returning null when unset", async () => {
    await expect(loadIntervalMinutes()).resolves.toBeNull();

    await saveIntervalMinutes(10);
    expect(await AsyncStorage.getItem(INTERVAL_KEY)).toBe("10");
    await expect(loadIntervalMinutes()).resolves.toBe(10);

    await saveIntervalMinutes(0);
    await expect(loadIntervalMinutes()).resolves.toBe(0);
  });
});
