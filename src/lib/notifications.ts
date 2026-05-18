import { Platform } from "react-native";
import * as Notifications from "expo-notifications";
import * as SecureStore from "expo-secure-store";
import {
  deleteWebPushSubscription,
  upsertWebPushSubscription,
} from "@/src/features/settings/repository";
import i18n from "@/src/i18n";
import { appEnv } from "@/src/lib/env";

export type ReminderTarget = "cbt" | "meditation" | "act";

const REMINDER_TARGETS: ReminderTarget[] = ["cbt", "meditation", "act"];
const REMINDER_KEY_PREFIX = "selftend:reminder-id:";
const LEGACY_CBT_REMINDER_KEY = "selftend:cbt-reminder-id";
const WEB_PUSH_WORKER_PATH = "/selftend-push-worker.js";

export type ReminderScheduleFailureReason =
  | "missing-user"
  | "missing-vapid-key"
  | "permission-denied"
  | "service-worker-unavailable"
  | "subscription-failed"
  | "unsupported";

export type ReminderScheduleResult =
  | { enabled: true }
  | { enabled: false; reason: ReminderScheduleFailureReason };

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
    shouldShowList: true,
  }),
});

function reminderStorageKey(target: ReminderTarget) {
  return `${REMINDER_KEY_PREFIX}${target}`;
}

async function getStoredReminderId(target: ReminderTarget) {
  const id = await SecureStore.getItemAsync(reminderStorageKey(target));
  if (id) return id;

  // Migrate from the legacy CBT-only key the first time we read.
  if (target === "cbt") {
    const legacy = await SecureStore.getItemAsync(LEGACY_CBT_REMINDER_KEY);
    if (legacy) {
      await SecureStore.setItemAsync(reminderStorageKey(target), legacy);
      await SecureStore.deleteItemAsync(LEGACY_CBT_REMINDER_KEY);
      return legacy;
    }
  }
  return null;
}

async function setStoredReminderId(target: ReminderTarget, notificationId: string | null) {
  const key = reminderStorageKey(target);
  if (!notificationId) {
    await SecureStore.deleteItemAsync(key);
    return;
  }

  await SecureStore.setItemAsync(key, notificationId);
}

function getNotificationCopy(target: ReminderTarget) {
  return {
    title: i18n.t(`${target}:notifications.title`),
    body: i18n.t(`${target}:notifications.body`),
  };
}

function getWebPushGlobals() {
  if (Platform.OS !== "web" || typeof window === "undefined" || typeof navigator === "undefined") {
    return null;
  }

  return {
    notification: "Notification" in window ? window.Notification : undefined,
    serviceWorker: "serviceWorker" in navigator ? navigator.serviceWorker : undefined,
  };
}

function urlBase64ToUint8Array(value: string) {
  const padding = "=".repeat((4 - (value.length % 4)) % 4);
  const base64 = `${value}${padding}`.replace(/-/g, "+").replace(/_/g, "/");
  const raw = window.atob(base64);
  const output = new Uint8Array(raw.length);

  for (let index = 0; index < raw.length; index += 1) {
    output[index] = raw.charCodeAt(index);
  }

  return output;
}

function getCurrentTimeZone() {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone ?? null;
  } catch {
    return null;
  }
}

function getCurrentUserAgent() {
  if (typeof navigator === "undefined") {
    return null;
  }

  return navigator.userAgent || null;
}

export function getReminderTimeZone() {
  return getCurrentTimeZone();
}

export async function registerWebPushServiceWorker() {
  const globals = getWebPushGlobals();
  if (!globals?.serviceWorker) {
    return false;
  }

  try {
    await globals.serviceWorker.register(WEB_PUSH_WORKER_PATH);
    return true;
  } catch {
    return false;
  }
}

function getSubscriptionJson(subscription: PushSubscription) {
  const json = subscription.toJSON();
  const keys = json.keys;

  if (!json.endpoint || !keys?.auth || !keys.p256dh) {
    return null;
  }

  return {
    auth: keys.auth,
    endpoint: json.endpoint,
    p256dh: keys.p256dh,
    timeZone: getCurrentTimeZone(),
    userAgent: getCurrentUserAgent(),
  };
}

async function ensureWebPushSubscription(userId?: string | null): Promise<ReminderScheduleResult> {
  if (!userId) {
    return { enabled: false, reason: "missing-user" };
  }

  if (!appEnv.webPushVapidPublicKey) {
    return { enabled: false, reason: "missing-vapid-key" };
  }

  const globals = getWebPushGlobals();
  if (!globals?.notification || !globals.serviceWorker || !("PushManager" in window)) {
    return { enabled: false, reason: "unsupported" };
  }

  if (globals.notification.permission === "denied") {
    return { enabled: false, reason: "permission-denied" };
  }

  const permission =
    globals.notification.permission === "granted"
      ? "granted"
      : await globals.notification.requestPermission();

  if (permission !== "granted") {
    return { enabled: false, reason: "permission-denied" };
  }

  const registered = await registerWebPushServiceWorker();
  if (!registered) {
    return { enabled: false, reason: "service-worker-unavailable" };
  }

  try {
    const registration = await globals.serviceWorker.ready;
    const existingSubscription = await registration.pushManager.getSubscription();
    const subscription =
      existingSubscription ??
      (await registration.pushManager.subscribe({
        applicationServerKey: urlBase64ToUint8Array(appEnv.webPushVapidPublicKey),
        userVisibleOnly: true,
      }));
    const payload = getSubscriptionJson(subscription);

    if (!payload) {
      return { enabled: false, reason: "subscription-failed" };
    }

    await upsertWebPushSubscription(userId, payload);
    return { enabled: true };
  } catch {
    return { enabled: false, reason: "subscription-failed" };
  }
}

async function unsubscribeWebPushIfPresent(userId?: string | null) {
  const globals = getWebPushGlobals();
  if (!globals?.serviceWorker) {
    return;
  }

  const registration = await globals.serviceWorker.getRegistration();
  const subscription = await registration?.pushManager.getSubscription();
  const endpoint = subscription?.endpoint;

  if (subscription) {
    await subscription.unsubscribe();
  }

  if (userId && endpoint) {
    await deleteWebPushSubscription(userId, endpoint);
  }
}

export async function ensureReminderPermission() {
  if (Platform.OS === "web") {
    return false;
  }

  const permissions = await Notifications.getPermissionsAsync();
  if (permissions.granted) {
    return true;
  }

  const next = await Notifications.requestPermissionsAsync();
  return next.granted;
}

export async function cancelReminder(target: ReminderTarget, userId?: string | null) {
  if (Platform.OS === "web") {
    // Web subscription is shared across targets and gated server-side by
    // each target's *_reminders_enabled flag. Nothing to do here.
    return;
  }

  const existingId = await getStoredReminderId(target);
  if (existingId) {
    await Notifications.cancelScheduledNotificationAsync(existingId);
  }
  await setStoredReminderId(target, null);
}

export async function scheduleReminder(
  target: ReminderTarget,
  hour: number,
  minute: number,
  userId?: string | null,
): Promise<ReminderScheduleResult> {
  if (Platform.OS === "web") {
    return ensureWebPushSubscription(userId);
  }

  const granted = await ensureReminderPermission();
  if (!granted) {
    return { enabled: false, reason: "permission-denied" };
  }

  await cancelReminder(target);

  const copy = getNotificationCopy(target);
  const notificationId = await Notifications.scheduleNotificationAsync({
    content: {
      title: copy.title,
      body: copy.body,
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DAILY,
      hour,
      minute,
    },
  });

  await setStoredReminderId(target, notificationId);
  return { enabled: true };
}

/**
 * Cancels every target's scheduled reminder and (on web) unsubscribes the
 * shared push subscription. Used when the user turns the global master off.
 */
export async function cancelAllReminders(userId?: string | null) {
  for (const target of REMINDER_TARGETS) {
    await cancelReminder(target, userId);
  }
  if (Platform.OS === "web") {
    await unsubscribeWebPushIfPresent(userId);
  }
}
