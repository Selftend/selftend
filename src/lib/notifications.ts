import { Platform } from "react-native";
import {
  deleteWebPushSubscription,
  upsertWebPushSubscription,
} from "@/src/features/settings/repository";
import { appEnv } from "@/src/lib/env";
import { disableDevicePushToken, ensureDevicePushToken } from "@/src/lib/push-token";

export type ReminderTarget =
  | "cbt"
  | "meditation"
  | "act"
  | "mood"
  | "journal"
  | "gratitude"
  | "grounding"
  | "breathing"
  | "sleep"
  | "habits";

const WEB_PUSH_WORKER_PATH = "/selftend-push-worker.js";
type NotificationsModule = typeof import("expo-notifications");
let notificationsModule: NotificationsModule | null = null;

type ReminderScheduleFailureReason =
  | "missing-user"
  | "missing-vapid-key"
  | "permission-denied"
  | "service-worker-unavailable"
  | "subscription-failed"
  | "unsupported";

type ReminderScheduleResult =
  { enabled: true } | { enabled: false; reason: ReminderScheduleFailureReason };

function getNativeNotifications() {
  if (Platform.OS === "web") {
    return null;
  }

  if (!notificationsModule) {
    // Lazy-load on native only; the web module registers a push-token listener at import time.
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const Notifications = require("expo-notifications") as NotificationsModule;

    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowBanner: true,
        shouldPlaySound: false,
        shouldSetBadge: false,
        shouldShowList: true,
      }),
    });

    notificationsModule = Notifications;
  }

  return notificationsModule;
}

// ----- Deep-link routing (server push carries the route in data.url) -----

/**
 * Server-minted reminder routes. Mirrors the edge function's `TARGET_CONFIGS[*].url` and
 * `routineUrl()` in `supabase/functions/_shared/web-reminders.ts` - the only place these URLs
 * originate. Defense-in-depth: a tapped notification's `data.url` is trusted today, but this
 * allowlist ensures a malformed or off-origin value can never reach `router.navigate()`.
 */
const ALLOWED_REMINDER_ROUTES = new Set<string>([
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
]);

// `/routines/<id>` - a single non-slash path segment, so `//host`, `../` traversal, and
// absolute/scheme URLs are all rejected.
const ROUTINE_ROUTE_PATTERN = /^\/routines\/[A-Za-z0-9-]+$/;

/** True when `url` is a known server-minted reminder route (fixed tool route or `/routines/<id>`). */
export function isAllowedReminderRoute(url: string): boolean {
  return ALLOWED_REMINDER_ROUTES.has(url) || ROUTINE_ROUTE_PATTERN.test(url);
}

/** Pulls the deep-link route out of a tapped notification's response, or null if not allowlisted. */
function reminderUrlFromResponse(response: unknown): string | null {
  const url = (
    response as { notification?: { request?: { content?: { data?: { url?: unknown } } } } } | null
  )?.notification?.request?.content?.data?.url;
  return typeof url === "string" && isAllowedReminderRoute(url) ? url : null;
}

/** The route the app was cold-launched into by tapping a reminder, or null. */
export async function getInitialReminderUrl(): Promise<string | null> {
  if (Platform.OS === "web") return null;
  const Notifications = getNativeNotifications();
  if (!Notifications) return null;
  const response = await Notifications.getLastNotificationResponseAsync();
  return reminderUrlFromResponse(response);
}

/** Subscribes to reminder taps while the app runs; calls back with the deep-link route. */
export function addReminderResponseListener(onUrl: (url: string) => void): {
  remove: () => void;
} {
  if (Platform.OS === "web") return { remove: () => {} };
  const Notifications = getNativeNotifications();
  if (!Notifications) return { remove: () => {} };
  const subscription = Notifications.addNotificationResponseReceivedListener((response) => {
    const url = reminderUrlFromResponse(response);
    if (url) onUrl(url);
  });
  return { remove: () => subscription.remove() };
}

// ----- Web push (browser service worker + VAPID) -----

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

// ----- Public API (server-driven on every platform) -----

/**
 * "Enables" a reminder for the current channel. Reminder content + timing are server-driven
 * (read from user_preferences - or, for `"routine"`, the per-routine reminder fields on the
 * routines rows - by the send-web-reminders edge function); this only ensures the channel is
 * registered: a web push subscription on web, a device push token on native. The hour/minute
 * params are unused on native and kept for the web/signature compatibility.
 */
export async function scheduleReminder(
  target: ReminderTarget | "routine",
  _hour: number,
  _minute: number,
  userId?: string | null,
): Promise<ReminderScheduleResult> {
  if (Platform.OS === "web") {
    return ensureWebPushSubscription(userId);
  }

  const result = await ensureDevicePushToken(userId ?? null);
  if (result.enabled) return { enabled: true };
  return {
    enabled: false,
    reason: result.reason === "permission-denied" ? "permission-denied" : "unsupported",
  };
}

/**
 * Disabling a single target is reflected in user_preferences and honored server-side, so there
 * is nothing to cancel per-target on either channel (web's subscription is shared; native's
 * token serves all targets). No-op by design.
 */
export async function cancelReminder(_target: ReminderTarget, _userId?: string | null) {}

/**
 * Turns the channel off entirely when the user disables the global master: unsubscribe the web
 * push subscription, or delete this device's push token on native.
 */
export async function cancelAllReminders(userId?: string | null) {
  if (Platform.OS === "web") {
    await unsubscribeWebPushIfPresent(userId);
    return;
  }
  await disableDevicePushToken(userId ?? null);
}

/**
 * One-time migration off local notifications: clear any OS-scheduled reminders left by the
 * pre-push build so nothing fires twice now that delivery is server-driven.
 */
export async function clearLegacyLocalReminders() {
  const Notifications = getNativeNotifications();
  if (!Notifications) return;
  await Notifications.cancelAllScheduledNotificationsAsync();
}
