import { act, renderHook, waitFor } from "@testing-library/react-native";
import { AppState, Platform } from "react-native";

import { defaultUserPreferences, type UserPreferences } from "@/src/features/modules/types";
import { useNotificationSync } from "@/src/features/notifications/use-notification-sync";
import { cancelReminder, scheduleReminder } from "@/src/lib/notifications";

jest.mock("@/src/lib/notifications", () => ({
  cancelReminder: jest.fn().mockResolvedValue(undefined),
  scheduleReminder: jest.fn().mockResolvedValue({ enabled: true }),
}));

const mockScheduleReminder = jest.mocked(scheduleReminder);
const mockCancelReminder = jest.mocked(cancelReminder);

const mockListeners: ((state: string) => void)[] = [];
const mockRemove = jest.fn();

function setPlatformOS(os: string) {
  Object.defineProperty(Platform, "OS", { configurable: true, get: () => os });
}

function makePreferences(overrides: Partial<UserPreferences> = {}): UserPreferences {
  return { ...defaultUserPreferences, ...overrides };
}

describe("useNotificationSync", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockListeners.length = 0;
    mockRemove.mockClear();
    setPlatformOS("android");
    jest.spyOn(AppState, "addEventListener").mockImplementation((_event, handler) => {
      mockListeners.push(handler as (state: string) => void);
      return { remove: mockRemove };
    });
  });

  afterAll(() => {
    setPlatformOS("ios");
  });

  it("schedules an enabled target on initial load", async () => {
    const prefs = makePreferences({
      cbtRemindersEnabled: true,
      cbtReminderHour: 19,
      cbtReminderMinute: 30,
    });

    renderHook(() => useNotificationSync("user-1", prefs));

    await waitFor(() => {
      expect(mockScheduleReminder).toHaveBeenCalledWith("cbt", 19, 30, "user-1");
    });
  });

  it("cancels a disabled target on initial load", async () => {
    const prefs = makePreferences({ cbtRemindersEnabled: false });

    renderHook(() => useNotificationSync("user-1", prefs));

    await waitFor(() => {
      expect(mockCancelReminder).toHaveBeenCalledWith("cbt", "user-1");
    });
    expect(mockScheduleReminder).not.toHaveBeenCalledWith(
      "cbt",
      expect.anything(),
      expect.anything(),
      expect.anything(),
    );
  });

  it("cancels all targets when global is disabled regardless of per-target toggle", async () => {
    const prefs = makePreferences({
      notificationsEnabledGlobal: false,
      cbtRemindersEnabled: true,
      actRemindersEnabled: true,
      meditationRemindersEnabled: true,
    });

    renderHook(() => useNotificationSync("user-1", prefs));

    await waitFor(() => {
      expect(mockCancelReminder).toHaveBeenCalledWith("cbt", "user-1");
      expect(mockCancelReminder).toHaveBeenCalledWith("act", "user-1");
      expect(mockCancelReminder).toHaveBeenCalledWith("meditation", "user-1");
    });
    expect(mockScheduleReminder).not.toHaveBeenCalled();
  });

  it("does nothing when preferences is undefined", async () => {
    renderHook(() => useNotificationSync("user-1", undefined));

    await act(async () => {});

    expect(mockScheduleReminder).not.toHaveBeenCalled();
    expect(mockCancelReminder).not.toHaveBeenCalled();
  });

  it("does nothing when userId is null", async () => {
    const prefs = makePreferences({ cbtRemindersEnabled: true });

    renderHook(() => useNotificationSync(null, prefs));

    await act(async () => {});

    expect(mockScheduleReminder).not.toHaveBeenCalled();
    expect(mockCancelReminder).not.toHaveBeenCalled();
  });

  it("re-syncs when app comes to foreground", async () => {
    const prefs = makePreferences({
      cbtRemindersEnabled: true,
      cbtReminderHour: 8,
      cbtReminderMinute: 0,
    });

    renderHook(() => useNotificationSync("user-1", prefs));

    await waitFor(() => {
      expect(mockScheduleReminder).toHaveBeenCalledWith("cbt", 8, 0, "user-1");
    });

    mockScheduleReminder.mockClear();
    mockCancelReminder.mockClear();

    await act(async () => {
      for (const listener of mockListeners) listener("active");
    });

    await waitFor(() => {
      expect(mockScheduleReminder).toHaveBeenCalledWith("cbt", 8, 0, "user-1");
    });
  });

  it("skips a second concurrent sync if one is already in progress", async () => {
    let resolveFirst!: () => void;
    mockScheduleReminder.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          resolveFirst = () => resolve({ enabled: true });
        }),
    );

    const prefs = makePreferences({ cbtRemindersEnabled: true });
    renderHook(() => useNotificationSync("user-1", prefs));

    act(() => {
      for (const listener of mockListeners) listener("active");
    });

    expect(mockScheduleReminder).toHaveBeenCalledTimes(1);

    await act(async () => {
      resolveFirst();
    });
  });

  it("is a no-op on web", async () => {
    setPlatformOS("web");
    const prefs = makePreferences({ cbtRemindersEnabled: true });

    renderHook(() => useNotificationSync("user-1", prefs));

    await act(async () => {});

    expect(mockScheduleReminder).not.toHaveBeenCalled();
    expect(mockCancelReminder).not.toHaveBeenCalled();
    expect(AppState.addEventListener).not.toHaveBeenCalled();
  });
});
