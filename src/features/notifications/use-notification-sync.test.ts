import { act, renderHook, waitFor } from "@testing-library/react-native";
import { AppState, Platform } from "react-native";

import { defaultUserPreferences, type UserPreferences } from "@/src/features/modules/types";
import { useNotificationSync } from "@/src/features/notifications/use-notification-sync";
import {
  cancelAllReminders,
  clearLegacyLocalReminders,
  ensureReminderChannel,
  reconcileWebReminderChannel,
} from "@/src/lib/notifications";

jest.mock("@/src/lib/notifications", () => ({
  cancelAllReminders: jest.fn().mockResolvedValue(undefined),
  ensureReminderChannel: jest.fn().mockResolvedValue({ enabled: true }),
  reconcileWebReminderChannel: jest.fn().mockResolvedValue(undefined),
  clearLegacyLocalReminders: jest.fn().mockResolvedValue(undefined),
}));

const mockEnsureChannel = jest.mocked(ensureReminderChannel);
const mockReconcileWeb = jest.mocked(reconcileWebReminderChannel);
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
      expect(mockEnsureChannel).toHaveBeenCalled();
    });
    expect(mockEnsureChannel.mock.calls[0]?.[0]).toBe("user-1");
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
    expect(mockEnsureChannel).not.toHaveBeenCalled();
  });

  it("does nothing (no token churn) when no reminders are enabled", async () => {
    const prefs = makePreferences({ notificationsEnabledGlobal: true });

    renderHook(() => useNotificationSync("user-1", prefs));

    await act(async () => {});

    expect(mockEnsureChannel).not.toHaveBeenCalled();
    expect(mockCancelAllReminders).not.toHaveBeenCalled();
  });

  it("ensures a push token when only a ROUTINE reminder is enabled (#47)", async () => {
    // No per-tool target enabled - the routine opt-in alone must register the channel.
    const prefs = makePreferences({ notificationsEnabledGlobal: true });

    renderHook(() => useNotificationSync("user-1", prefs, true));

    await waitFor(() => {
      expect(mockEnsureChannel).toHaveBeenCalled();
    });
    expect(mockEnsureChannel.mock.calls[0]?.[0]).toBe("user-1");
  });

  it("routine reminders do not register the channel while global is off", async () => {
    const prefs = makePreferences({ notificationsEnabledGlobal: false });

    renderHook(() => useNotificationSync("user-1", prefs, true));

    await waitFor(() => {
      expect(mockCancelAllReminders).toHaveBeenCalledWith("user-1");
    });
    expect(mockEnsureChannel).not.toHaveBeenCalled();
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

    expect(mockEnsureChannel).not.toHaveBeenCalled();
    expect(mockCancelAllReminders).not.toHaveBeenCalled();
    expect(mockClearLegacyLocalReminders).not.toHaveBeenCalled();
  });

  it("registers no device token on web, and repairs the web subscription instead", async () => {
    setPlatformOS("web");
    const prefs = makePreferences({ sleepRemindersEnabled: true });

    renderHook(() => useNotificationSync("user-1", prefs));

    await act(async () => {});

    expect(mockEnsureChannel).not.toHaveBeenCalled();
    expect(mockClearLegacyLocalReminders).not.toHaveBeenCalled();
    expect(AppState.addEventListener).not.toHaveBeenCalled();
    // The hole this closes: master-off (and every sign-out) deletes the
    // web_push_subscriptions row, and nothing on web ever registered it again (#981).
    expect(mockReconcileWeb).toHaveBeenCalledWith("user-1");
  });

  it("does not reconcile on web while the master is off", async () => {
    setPlatformOS("web");
    const prefs = makePreferences({
      notificationsEnabledGlobal: false,
      sleepRemindersEnabled: true,
    });

    renderHook(() => useNotificationSync("user-1", prefs));

    await act(async () => {});

    expect(mockReconcileWeb).not.toHaveBeenCalled();
  });
});
