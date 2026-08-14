import * as Notifications from "expo-notifications";
import { Platform } from "react-native";

import {
  cancelAllReminders,
  clearLegacyLocalReminders,
  ensureReminderChannel,
  getReminderChannelStatus,
  isAllowedReminderRoute,
  peekReminderChannelStatus,
  reconcileWebReminderChannel,
  registerWebPushServiceWorker,
  resetWebReminderReconciliation,
} from "@/src/lib/notifications";
import {
  deleteWebPushSubscription,
  upsertWebPushSubscription,
} from "@/src/features/settings/repository";
import { disableDevicePushToken, ensureDevicePushToken } from "@/src/lib/push-token";

jest.mock("expo-notifications", () => ({
  cancelAllScheduledNotificationsAsync: jest.fn(),
  getLastNotificationResponseAsync: jest.fn(),
  addNotificationResponseReceivedListener: jest.fn(() => ({ remove: jest.fn() })),
  setNotificationHandler: jest.fn(),
}));

jest.mock("@/src/lib/env", () => ({
  appEnv: {
    webPushVapidPublicKey:
      "BEl6KyZfMZf5bI1gAj2c8Z9B8dVt8YB8dVt8YB8dVt8YB8dVt8YB8dVt8YB8dVt8YB8dVt8YB8dVt8YB8dVt8YB8",
  },
}));

jest.mock("@/src/features/settings/repository", () => ({
  deleteWebPushSubscription: jest.fn(),
  upsertWebPushSubscription: jest.fn(),
}));

jest.mock("@/src/lib/push-token", () => ({
  ensureDevicePushToken: jest.fn().mockResolvedValue({ enabled: true }),
  disableDevicePushToken: jest.fn().mockResolvedValue(undefined),
}));

const mockCancelAllScheduled = jest.mocked(Notifications.cancelAllScheduledNotificationsAsync);
const mockDeleteWebPushSubscription = jest.mocked(deleteWebPushSubscription);
const mockUpsertWebPushSubscription = jest.mocked(upsertWebPushSubscription);
const mockEnsureDevicePushToken = jest.mocked(ensureDevicePushToken);
const mockDisableDevicePushToken = jest.mocked(disableDevicePushToken);

function setPlatformOS(os: string) {
  Object.defineProperty(Platform, "OS", {
    configurable: true,
    get: () => os,
  });
}

function setWindowProperty(name: string, value: unknown) {
  if (typeof window === "undefined") {
    Object.defineProperty(globalThis, "window", {
      configurable: true,
      value: {
        atob: (input: string) => Buffer.from(input, "base64").toString("binary"),
      },
    });
  }

  Object.defineProperty(window, name, {
    configurable: true,
    value,
  });
}

function ensureNavigator() {
  if (typeof navigator === "undefined") {
    Object.defineProperty(globalThis, "navigator", {
      configurable: true,
      value: {},
    });
  }
}

function createWebPushMocks() {
  const subscription = {
    endpoint: "https://push.example/subscription",
    toJSON: () => ({
      endpoint: "https://push.example/subscription",
      keys: {
        auth: "auth-secret",
        p256dh: "p256dh-key",
      },
    }),
    unsubscribe: jest.fn().mockResolvedValue(true),
  } as unknown as PushSubscription;
  const pushManager = {
    getSubscription: jest.fn().mockResolvedValue(null),
    subscribe: jest.fn().mockResolvedValue(subscription),
  };
  const registration = {
    pushManager,
  } as unknown as ServiceWorkerRegistration;
  const serviceWorker = {
    getRegistration: jest.fn().mockResolvedValue(registration),
    ready: Promise.resolve(registration),
    register: jest.fn().mockResolvedValue(registration),
  };
  const notification = {
    permission: "default",
    requestPermission: jest.fn().mockResolvedValue("granted"),
  };

  setWindowProperty("Notification", notification);
  setWindowProperty("PushManager", function PushManager() {});
  ensureNavigator();
  Object.defineProperty(navigator, "serviceWorker", {
    configurable: true,
    value: serviceWorker,
  });
  Object.defineProperty(navigator, "userAgent", {
    configurable: true,
    value: "jest-browser",
  });

  return {
    notification,
    pushManager,
    registration,
    serviceWorker,
    subscription,
  };
}

describe("Reminder notifications", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    resetWebReminderReconciliation();
    setPlatformOS("ios");
    mockDeleteWebPushSubscription.mockResolvedValue(undefined);
    mockUpsertWebPushSubscription.mockResolvedValue(undefined);
    mockEnsureDevicePushToken.mockResolvedValue({ enabled: true });
    mockDisableDevicePushToken.mockResolvedValue(undefined);
  });

  afterAll(() => {
    setPlatformOS("ios");
  });

  // ---- Native: server-driven push (token registration only) ----

  it("registers a device push token on native", async () => {
    setPlatformOS("android");

    await expect(ensureReminderChannel("user-1")).resolves.toEqual({ enabled: true });

    expect(mockEnsureDevicePushToken).toHaveBeenCalledWith("user-1");
  });

  it("surfaces permission-denied from native token registration", async () => {
    setPlatformOS("android");
    mockEnsureDevicePushToken.mockResolvedValue({ enabled: false, reason: "permission-denied" });

    await expect(ensureReminderChannel("user-1")).resolves.toEqual({
      enabled: false,
      reason: "permission-denied",
    });
  });

  it("disables the device token when cancelAllReminders runs on native", async () => {
    setPlatformOS("android");

    await cancelAllReminders("user-1");

    expect(mockDisableDevicePushToken).toHaveBeenCalledWith("user-1");
  });

  it("clearLegacyLocalReminders cancels every previously-scheduled local notification", async () => {
    setPlatformOS("android");

    await clearLegacyLocalReminders();

    expect(mockCancelAllScheduled).toHaveBeenCalled();
  });

  // ---- Web: unchanged server push via the service worker ----

  it("returns unsupported on web when browser push APIs are unavailable", async () => {
    setPlatformOS("web");
    setWindowProperty("Notification", undefined);

    await expect(ensureReminderChannel("user-1")).resolves.toEqual({
      enabled: false,
      reason: "unsupported",
    });
  });

  it("registers the web push service worker", async () => {
    setPlatformOS("web");
    const { serviceWorker } = createWebPushMocks();

    await expect(registerWebPushServiceWorker()).resolves.toBe(true);

    expect(serviceWorker.register).toHaveBeenCalledWith("/selftend-push-worker.js");
  });

  it("stores a web push subscription after browser permission is granted", async () => {
    setPlatformOS("web");
    const { pushManager } = createWebPushMocks();

    await expect(ensureReminderChannel("user-1")).resolves.toEqual({ enabled: true });

    expect(pushManager.subscribe).toHaveBeenCalledWith({
      applicationServerKey: expect.any(Uint8Array),
      userVisibleOnly: true,
    });
    expect(mockUpsertWebPushSubscription).toHaveBeenCalledWith("user-1", {
      auth: "auth-secret",
      endpoint: "https://push.example/subscription",
      p256dh: "p256dh-key",
      timeZone: expect.any(String),
      userAgent: "jest-browser",
    });
  });

  it("subscribes only once per browser even when multiple targets schedule", async () => {
    setPlatformOS("web");
    const { pushManager, subscription } = createWebPushMocks();
    pushManager.subscribe.mockImplementation(async () => {
      pushManager.getSubscription.mockResolvedValue(subscription);
      return subscription;
    });

    await expect(ensureReminderChannel("user-1")).resolves.toEqual({ enabled: true });
    await expect(ensureReminderChannel("user-1")).resolves.toEqual({
      enabled: true,
    });

    expect(pushManager.subscribe).toHaveBeenCalledTimes(1);
    expect(mockUpsertWebPushSubscription).toHaveBeenCalledTimes(2);
  });

  it("resolves with a timeout failure when pushManager.subscribe never settles", async () => {
    jest.useFakeTimers();
    try {
      setPlatformOS("web");
      const { pushManager } = createWebPushMocks();
      // A blocked/unreachable push service: subscribe hangs forever (#473).
      pushManager.subscribe.mockReturnValue(new Promise(() => {}));

      const resultPromise = ensureReminderChannel("user-1");
      await jest.advanceTimersByTimeAsync(20_000);

      await expect(resultPromise).resolves.toEqual({ enabled: false, reason: "timeout" });
      expect(mockUpsertWebPushSubscription).not.toHaveBeenCalled();
    } finally {
      jest.useRealTimers();
    }
  });

  it("does not time out a subscribe that settles in time", async () => {
    jest.useFakeTimers();
    try {
      setPlatformOS("web");
      createWebPushMocks();

      const resultPromise = ensureReminderChannel("user-1");
      await jest.advanceTimersByTimeAsync(0);

      await expect(resultPromise).resolves.toEqual({ enabled: true });
    } finally {
      jest.useRealTimers();
    }
  });

  it("returns permission denied when the browser denies notifications", async () => {
    setPlatformOS("web");
    const { notification } = createWebPushMocks();
    notification.requestPermission.mockResolvedValue("denied");

    await expect(ensureReminderChannel("user-1")).resolves.toEqual({
      enabled: false,
      reason: "permission-denied",
    });
    expect(mockUpsertWebPushSubscription).not.toHaveBeenCalled();
  });

  // ---- Channel status: read without prompting (#981) ----

  it("reads the web channel status from the browser permission, without asking", async () => {
    setPlatformOS("web");
    const { notification } = createWebPushMocks();

    notification.permission = "default";
    expect(peekReminderChannelStatus()).toBe("prompt-needed");
    await expect(getReminderChannelStatus()).resolves.toBe("prompt-needed");

    notification.permission = "granted";
    expect(peekReminderChannelStatus()).toBe("granted");
    await expect(getReminderChannelStatus()).resolves.toBe("granted");

    notification.permission = "denied";
    expect(peekReminderChannelStatus()).toBe("blocked");
    await expect(getReminderChannelStatus()).resolves.toBe("blocked");

    // Nothing above may prompt: that is the whole point of a status a control can read
    // before it is tapped.
    expect(notification.requestPermission).not.toHaveBeenCalled();
  });

  it("reports unsupported when the browser has no push APIs", async () => {
    setPlatformOS("web");
    createWebPushMocks();
    setWindowProperty("Notification", undefined);

    await expect(getReminderChannelStatus()).resolves.toBe("unsupported");
  });

  // ---- Web reconciliation: repair, never ask ----

  it("re-arms the web subscription when permission is already granted", async () => {
    setPlatformOS("web");
    const { notification, pushManager } = createWebPushMocks();
    notification.permission = "granted";

    await reconcileWebReminderChannel("user-1");

    expect(pushManager.subscribe).toHaveBeenCalledTimes(1);
    expect(mockUpsertWebPushSubscription).toHaveBeenCalledWith("user-1", {
      auth: "auth-secret",
      endpoint: "https://push.example/subscription",
      p256dh: "p256dh-key",
      timeZone: expect.any(String),
      userAgent: "jest-browser",
    });
    expect(notification.requestPermission).not.toHaveBeenCalled();
  });

  it("never prompts: no permission yet means no reconciliation at all", async () => {
    setPlatformOS("web");
    const { notification, pushManager } = createWebPushMocks();
    notification.permission = "default";

    await reconcileWebReminderChannel("user-1");

    expect(notification.requestPermission).not.toHaveBeenCalled();
    expect(pushManager.subscribe).not.toHaveBeenCalled();
    expect(mockUpsertWebPushSubscription).not.toHaveBeenCalled();
  });

  it("re-upserts nothing on a second focus with the same subscription and zone", async () => {
    setPlatformOS("web");
    const { notification, pushManager, subscription } = createWebPushMocks();
    notification.permission = "granted";
    pushManager.subscribe.mockImplementation(async () => {
      pushManager.getSubscription.mockResolvedValue(subscription);
      return subscription;
    });

    await reconcileWebReminderChannel("user-1");
    await reconcileWebReminderChannel("user-1");

    expect(mockUpsertWebPushSubscription).toHaveBeenCalledTimes(1);
  });

  it("is a no-op on native and without a user", async () => {
    setPlatformOS("android");
    await reconcileWebReminderChannel("user-1");
    setPlatformOS("web");
    createWebPushMocks();
    await reconcileWebReminderChannel(null);

    expect(mockUpsertWebPushSubscription).not.toHaveBeenCalled();
  });

  it("unsubscribes the browser subscription when cancelAllReminders is called", async () => {
    setPlatformOS("web");
    const { pushManager, subscription } = createWebPushMocks();
    pushManager.getSubscription.mockResolvedValue(subscription);

    await cancelAllReminders("user-1");

    expect(subscription.unsubscribe).toHaveBeenCalled();
    expect(mockDeleteWebPushSubscription).toHaveBeenCalledWith(
      "user-1",
      "https://push.example/subscription",
    );
  });
});

describe("isAllowedReminderRoute (deep-link allowlist)", () => {
  it("accepts every server-minted fixed tool/module route", () => {
    for (const route of [
      "/modules/cbt",
      "/tools/meditation",
      "/modules/act",
      "/tools/mood-tracker",
      "/tools/journal",
      "/tools/gratitude-log",
      "/tools/grounding",
      "/tools/breathing",
      "/tools/sleep",
      "/tools/habits",
    ]) {
      expect(isAllowedReminderRoute(route)).toBe(true);
    }
  });

  it("accepts a single-segment /routines/<id> route", () => {
    expect(isAllowedReminderRoute("/routines/1f9a4c2e-0d6b-4e2a-9b31-abc123def456")).toBe(true);
    expect(isAllowedReminderRoute("/routines/abc-123")).toBe(true);
  });

  it("rejects off-origin, protocol-relative, scheme, and traversal URLs", () => {
    expect(isAllowedReminderRoute("https://evil.example/modules/cbt")).toBe(false);
    expect(isAllowedReminderRoute("//evil.example/modules/cbt")).toBe(false);
    expect(isAllowedReminderRoute("javascript:alert(1)")).toBe(false);
    expect(isAllowedReminderRoute("/routines/../../modules/cbt")).toBe(false);
    expect(isAllowedReminderRoute("/routines/id/extra")).toBe(false);
    expect(isAllowedReminderRoute("/unknown")).toBe(false);
    expect(isAllowedReminderRoute("")).toBe(false);
  });
});
