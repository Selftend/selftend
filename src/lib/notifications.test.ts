import * as Notifications from "expo-notifications";
import { Platform } from "react-native";

import {
  cancelAllReminders,
  cancelReminder,
  clearLegacyLocalReminders,
  registerWebPushServiceWorker,
  scheduleReminder,
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

  it("registers a device push token on native scheduleReminder", async () => {
    setPlatformOS("android");

    await expect(scheduleReminder("mood", 12, 0, "user-1")).resolves.toEqual({ enabled: true });

    expect(mockEnsureDevicePushToken).toHaveBeenCalledWith("user-1");
  });

  it("surfaces permission-denied from native token registration", async () => {
    setPlatformOS("android");
    mockEnsureDevicePushToken.mockResolvedValue({ enabled: false, reason: "permission-denied" });

    await expect(scheduleReminder("mood", 12, 0, "user-1")).resolves.toEqual({
      enabled: false,
      reason: "permission-denied",
    });
  });

  it("disables the device token when cancelAllReminders runs on native", async () => {
    setPlatformOS("android");

    await cancelAllReminders("user-1");

    expect(mockDisableDevicePushToken).toHaveBeenCalledWith("user-1");
  });

  it("cancelReminder is a no-op (per-target enablement lives in preferences)", async () => {
    setPlatformOS("android");

    await cancelReminder("cbt", "user-1");

    expect(mockCancelAllScheduled).not.toHaveBeenCalled();
    expect(mockDisableDevicePushToken).not.toHaveBeenCalled();
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

    await expect(scheduleReminder("cbt", 19, 0, "user-1")).resolves.toEqual({
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

    await expect(scheduleReminder("cbt", 19, 0, "user-1")).resolves.toEqual({ enabled: true });

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

    await expect(scheduleReminder("cbt", 19, 0, "user-1")).resolves.toEqual({ enabled: true });
    await expect(scheduleReminder("meditation", 7, 0, "user-1")).resolves.toEqual({
      enabled: true,
    });

    expect(pushManager.subscribe).toHaveBeenCalledTimes(1);
    expect(mockUpsertWebPushSubscription).toHaveBeenCalledTimes(2);
  });

  it("returns permission denied when the browser denies notifications", async () => {
    setPlatformOS("web");
    const { notification } = createWebPushMocks();
    notification.requestPermission.mockResolvedValue("denied");

    await expect(scheduleReminder("cbt", 19, 0, "user-1")).resolves.toEqual({
      enabled: false,
      reason: "permission-denied",
    });
    expect(mockUpsertWebPushSubscription).not.toHaveBeenCalled();
  });

  it("does not unsubscribe a single web target on cancel (subscription is shared)", async () => {
    setPlatformOS("web");
    const { pushManager, subscription } = createWebPushMocks();
    pushManager.getSubscription.mockResolvedValue(subscription);

    await cancelReminder("cbt", "user-1");

    expect(subscription.unsubscribe).not.toHaveBeenCalled();
    expect(mockDeleteWebPushSubscription).not.toHaveBeenCalled();
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
