import AsyncStorage from "@react-native-async-storage/async-storage";

export const MIN_TIMER_DURATION_MINUTES = 1;
export const MAX_TIMER_DURATION_MINUTES = 120;
export const DEFAULT_TIMER_DURATION_MINUTES = 10;

const LAST_SESSION_DURATION_STORAGE_KEY = "selftend:timer:lastSessionDurationMinutes";

export function normalizeTimerDuration(
  value: number,
  fallback = DEFAULT_TIMER_DURATION_MINUTES,
): number {
  const safeFallback = Number.isFinite(fallback) ? fallback : DEFAULT_TIMER_DURATION_MINUTES;
  const fallbackDuration = Math.max(
    MIN_TIMER_DURATION_MINUTES,
    Math.min(MAX_TIMER_DURATION_MINUTES, Math.round(safeFallback)),
  );

  if (!Number.isFinite(value)) {
    return fallbackDuration;
  }

  return Math.max(
    MIN_TIMER_DURATION_MINUTES,
    Math.min(MAX_TIMER_DURATION_MINUTES, Math.round(value)),
  );
}

export function parseStoredTimerDuration(value: string | null): number | null {
  if (!value || !/^\d+$/.test(value)) {
    return null;
  }

  return normalizeTimerDuration(Number(value));
}

export async function loadLastSessionDuration(): Promise<number | null> {
  const stored = await AsyncStorage.getItem(LAST_SESSION_DURATION_STORAGE_KEY);
  return parseStoredTimerDuration(stored);
}

export async function saveLastSessionDuration(minutes: number): Promise<void> {
  await AsyncStorage.setItem(
    LAST_SESSION_DURATION_STORAGE_KEY,
    String(normalizeTimerDuration(minutes)),
  );
}

export const MAX_INTERVAL_MINUTES = 60;

const INTERVAL_MINUTES_STORAGE_KEY = "selftend:timer:intervalMinutes";

/** Clamps an interval to a whole number of minutes. `0` (or anything non-positive) means off. */
export function normalizeIntervalMinutes(value: number): number {
  if (!Number.isFinite(value) || value <= 0) {
    return 0;
  }
  return Math.min(MAX_INTERVAL_MINUTES, Math.round(value));
}

export async function loadIntervalMinutes(): Promise<number | null> {
  const stored = await AsyncStorage.getItem(INTERVAL_MINUTES_STORAGE_KEY);
  if (stored === null || !/^\d+$/.test(stored)) {
    return null;
  }
  return normalizeIntervalMinutes(Number(stored));
}

export async function saveIntervalMinutes(minutes: number): Promise<void> {
  await AsyncStorage.setItem(
    INTERVAL_MINUTES_STORAGE_KEY,
    String(normalizeIntervalMinutes(minutes)),
  );
}
