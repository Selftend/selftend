import { act, renderHook, waitFor } from "@testing-library/react-native";
import { AppState, Platform } from "react-native";

import { defaultUserPreferences, type UserPreferences } from "@/src/features/modules/types";
import { useNotificationSync } from "@/src/features/notifications/use-notification-sync";
import {
  cancelAllReminders,
  clearLegacyLocalReminders,
  scheduleReminder,
} from "@/src/lib/notifications";

jest.mock("@/src/lib/notifications", () => ({
  cancelAllReminders: jest.fn().mockResolvedValue(undefined),
  scheduleReminder: jest.fn().mockResolvedValue({ enabled: true }),
  clearLegacyLocalReminders: jest.fn().mockResolvedValue(undefined),
}));

const mockScheduleReminder = jest.mocked(scheduleReminder);
const mockCancelAllReminders = jest.mocked(cancelAllReminders);
const mockClearLegacyLocalReminders = jest.mocked(clearLegacyLocalReminders);

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
    mockRemove.mockClear();
    setPlatformOS("android");
    jest
      .spyOn(AppState, "addEventListener")
      .mockImplementation(() => ({ remove: mockRemove }) as never);
  });

  afterAll(() => {
    setPlatformOS("ios");
  });

  it("ensures a push token when global is on and at least one reminder is enabled", async () => {
    const prefs = makePreferences({
      notificationsEnabledGlobal: true,
      sleepRemindersEnabled: true,
    });

    renderHook(() => useNotificationSync("user-1", prefs));

    await waitFor(() => {
      expect(mockScheduleReminder).toHaveBeenCalled();
    });
    expect(mockScheduleReminder.mock.calls[0]?.[3]).toBe("user-1");
  });

  it("disables the token when global notifications are off", async () => {
    const prefs = makePreferences({
      notificationsEnabledGlobal: false,
      sleepRemindersEnabled: true,
    });

    renderHook(() => useNotificationSync("user-1", prefs));

    await waitFor(() => {
      expect(mockCancelAllReminders).toHaveBeenCalledWith("user-1");
    });
    expect(mockScheduleReminder).not.toHaveBeenCalled();
  });

  it("does nothing (no token churn) when no reminders are enabled", async () => {
    const prefs = makePreferences({ notificationsEnabledGlobal: true });

    renderHook(() => useNotificationSync("user-1", prefs));

    await act(async () => {});

    expect(mockScheduleReminder).not.toHaveBeenCalled();
    expect(mockCancelAllReminders).not.toHaveBeenCalled();
  });

  it("runs the one-time legacy local cleanup once", async () => {
    const prefs = makePreferences({
      notificationsEnabledGlobal: true,
      sleepRemindersEnabled: true,
    });

    renderHook(() => useNotificationSync("user-1", prefs));

    await waitFor(() => {
      expect(mockClearLegacyLocalReminders).toHaveBeenCalledTimes(1);
    });
  });

  it("does nothing when preferences is undefined", async () => {
    renderHook(() => useNotificationSync("user-1", undefined));

    await act(async () => {});

    expect(mockScheduleReminder).not.toHaveBeenCalled();
    expect(mockCancelAllReminders).not.toHaveBeenCalled();
    expect(mockClearLegacyLocalReminders).not.toHaveBeenCalled();
  });

  it("is a no-op on web", async () => {
    setPlatformOS("web");
    const prefs = makePreferences({ sleepRemindersEnabled: true });

    renderHook(() => useNotificationSync("user-1", prefs));

    await act(async () => {});

    expect(mockScheduleReminder).not.toHaveBeenCalled();
    expect(mockClearLegacyLocalReminders).not.toHaveBeenCalled();
    expect(AppState.addEventListener).not.toHaveBeenCalled();
  });
});
