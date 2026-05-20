import AsyncStorage from "@react-native-async-storage/async-storage";

import {
  loadLastSessionDuration,
  normalizeTimerDuration,
  parseStoredTimerDuration,
  saveLastSessionDuration,
} from "@/src/features/timer/storage";

const STORAGE_KEY = "selftend:timer:lastSessionDurationMinutes";

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
});
