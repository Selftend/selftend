import * as Notifications from "expo-notifications";
import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";

import {
  cancelCbtReminder,
  registerWebPushServiceWorker,
  scheduleCbtReminder,
} from "@/src/lib/notifications";
import {
  deleteWebPushSubscription,
  upsertWebPushSubscription,
} from "@/src/features/settings/repository";

jest.mock("expo-notifications", () => ({
  SchedulableTriggerInputTypes: {
    DAILY: "daily",
  },
  cancelScheduledNotificationAsync: jest.fn(),
  getPermissionsAsync: jest.fn(),
  requestPermissionsAsync: jest.fn(),
  scheduleNotificationAsync: jest.fn(),
  setNotificationHandler: jest.fn(),
}));

jest.mock("expo-secure-store", () => ({
  deleteItemAsync: jest.fn(),
  getItemAsync: jest.fn(),
  setItemAsync: jest.fn(),
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

const REMINDER_KEY = "selftend:cbt-reminder-id";

const mockCancelScheduledNotificationAsync = jest.mocked(
  Notifications.cancelScheduledNotificationAsync,
);
const mockGetPermissionsAsync = jest.mocked(Notifications.getPermissionsAsync);
const mockRequestPermissionsAsync = jest.mocked(Notifications.requestPermissionsAsync);
const mockScheduleNotificationAsync = jest.mocked(Notifications.scheduleNotificationAsync);
const mockDeleteItemAsync = jest.mocked(SecureStore.deleteItemAsync);
const mockGetItemAsync = jest.mocked(SecureStore.getItemAsync);
const mockSetItemAsync = jest.mocked(SecureStore.setItemAsync);
const mockDeleteWebPushSubscription = jest.mocked(deleteWebPushSubscription);
const mockUpsertWebPushSubscription = jest.mocked(upsertWebPushSubscription);

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

describe("CBT reminder notifications", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    setPlatformOS("ios");
    mockDeleteWebPushSubscription.mockResolvedValue(undefined);
    mockUpsertWebPushSubscription.mockResolvedValue(undefined);
  });

  afterAll(() => {
    setPlatformOS("ios");
  });

  it("does not schedule when native notification permission is denied", async () => {
    mockGetPermissionsAsync.mockResolvedValue({
      granted: false,
    } as Awaited<ReturnType<typeof Notifications.getPermissionsAsync>>);
    mockRequestPermissionsAsync.mockResolvedValue({
      granted: false,
    } as Awaited<ReturnType<typeof Notifications.requestPermissionsAsync>>);

    await expect(scheduleCbtReminder(19, 0)).resolves.toEqual({
      enabled: false,
      reason: "permission-denied",
    });

    expect(mockRequestPermissionsAsync).toHaveBeenCalled();
    expect(mockScheduleNotificationAsync).not.toHaveBeenCalled();
    expect(mockSetItemAsync).not.toHaveBeenCalled();
  });

  it("cancels any existing native reminder before scheduling a new one", async () => {
    mockGetPermissionsAsync.mockResolvedValue({
      granted: true,
    } as Awaited<ReturnType<typeof Notifications.getPermissionsAsync>>);
    mockGetItemAsync.mockResolvedValue("existing-reminder-id");
    mockScheduleNotificationAsync.mockResolvedValue("new-reminder-id");

    await expect(scheduleCbtReminder(8, 30)).resolves.toEqual({ enabled: true });

    expect(mockCancelScheduledNotificationAsync).toHaveBeenCalledWith("existing-reminder-id");
    expect(mockDeleteItemAsync).toHaveBeenCalledWith(REMINDER_KEY);
    expect(mockScheduleNotificationAsync).toHaveBeenCalledWith({
      content: {
        body: expect.any(String),
        title: expect.any(String),
      },
      trigger: {
        hour: 8,
        minute: 30,
        type: Notifications.SchedulableTriggerInputTypes.DAILY,
      },
    });
    expect(mockSetItemAsync).toHaveBeenCalledWith(REMINDER_KEY, "new-reminder-id");
  });

  it("cancels the stored native reminder and clears local storage when disabled", async () => {
    mockGetItemAsync.mockResolvedValue("existing-reminder-id");

    await cancelCbtReminder();

    expect(mockCancelScheduledNotificationAsync).toHaveBeenCalledWith("existing-reminder-id");
    expect(mockDeleteItemAsync).toHaveBeenCalledWith(REMINDER_KEY);
  });

  it("returns unsupported on web when browser push APIs are unavailable", async () => {
    setPlatformOS("web");
    setWindowProperty("Notification", undefined);

    await expect(scheduleCbtReminder(19, 0, "user-1")).resolves.toEqual({
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

    await expect(scheduleCbtReminder(19, 0, "user-1")).resolves.toEqual({ enabled: true });

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

  it("returns permission denied when the browser denies notifications", async () => {
    setPlatformOS("web");
    const { notification } = createWebPushMocks();
    notification.requestPermission.mockResolvedValue("denied");

    await expect(scheduleCbtReminder(19, 0, "user-1")).resolves.toEqual({
      enabled: false,
      reason: "permission-denied",
    });
    expect(mockUpsertWebPushSubscription).not.toHaveBeenCalled();
  });

  it("unsubscribes the current browser subscription when web reminders are disabled", async () => {
    setPlatformOS("web");
    const { pushManager, subscription } = createWebPushMocks();
    pushManager.getSubscription.mockResolvedValue(subscription);

    await cancelCbtReminder("user-1");

    expect(subscription.unsubscribe).toHaveBeenCalled();
    expect(mockDeleteWebPushSubscription).toHaveBeenCalledWith(
      "user-1",
      "https://push.example/subscription",
    );
  });
});
