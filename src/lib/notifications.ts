import { Platform } from "react-native";
import {
  deleteWebPushSubscription,
  upsertWebPushSubscription,
} from "@/src/features/settings/repository";
import { appEnv } from "@/src/lib/env";
import { disableDevicePushToken, ensureDevicePushToken } from "@/src/lib/push-token";

// `ReminderTarget` lived here as a second list of the ten reminder targets, existing only
// because `scheduleReminder` took a target it then ignored. With the channel API taking just
// a user (#981), `NotificationTargetKey` in the notifications registry is the only list.

const WEB_PUSH_WORKER_PATH = "/selftend-push-worker.js";
type NotificationsModule = typeof import("expo-notifications");
let notificationsModule: NotificationsModule | null = null;

export type ReminderScheduleFailureReason =
  | "missing-user"
  | "missing-vapid-key"
  | "permission-denied"
  | "service-worker-unavailable"
  | "subscription-failed"
  | "timeout"
  | "unsupported";

export type ReminderScheduleResult =
  { enabled: true } | { enabled: false; reason: ReminderScheduleFailureReason };

/**
 * What this device's reminder channel can do *right now*, read without prompting.
 *
 * The whole reminders screen branches on this before a control is touched (#981):
 * `granted` means a column write needs no channel call at all, `prompt-needed` means the
 * next enable has to be shaped as a request rather than a switch.
 *
 *   - `granted`      - a channel can be armed silently (permission already given).
 *   - `prompt-needed` - arming it will show the browser/OS permission dialog.
 *   - `blocked`      - the user said no; only they can undo it, in system settings.
 *   - `unsupported`  - no channel exists on this device/build at all.
 */
export type ReminderChannelStatus = "granted" | "prompt-needed" | "blocked" | "unsupported";

// `pushManager.subscribe()` with a valid VAPID key can hang forever when the
// browser's push service is blocked or unreachable (Brave-style configs,
// corporate networks, offline) - verified during the #473 sweep. Without a
// deadline the reminder save never resolves and the user gets zero feedback.
const WEB_PUSH_SUBSCRIBE_TIMEOUT_MS = 20_000;

class WebPushTimeoutError extends Error {}

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new WebPushTimeoutError("web push timed out")), ms);
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (error: unknown) => {
        clearTimeout(timer);
        reject(error instanceof Error ? error : new Error(String(error)));
      },
    );
  });
}

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
 *
 * `/tools/mood-tracker` is deliberately NOT renamed to `/tools/check-in` (#732, decided on
 * #704). This gate runs BEFORE navigation, so no `<Redirect>` stub can rescue a de-allowlisted
 * path - dropping it here turns every already-scheduled mood reminder into a dead tap. The edge
 * function keeps minting the old path forever for the same reason; see the note there.
 * `test/check-in-route-compat.test.tsx` fails if either side is "tidied".
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

  const { serviceWorker } = globals;

  try {
    // The permission prompt above is deliberately NOT under this deadline (it
    // legitimately waits on the user); the ready/subscribe chain is.
    const subscription = await withTimeout(
      (async () => {
        const registration = await serviceWorker.ready;
        const existingSubscription = await registration.pushManager.getSubscription();
        return (
          existingSubscription ??
          (await registration.pushManager.subscribe({
            applicationServerKey: urlBase64ToUint8Array(appEnv.webPushVapidPublicKey),
            userVisibleOnly: true,
          }))
        );
      })(),
      WEB_PUSH_SUBSCRIBE_TIMEOUT_MS,
    );
    const payload = getSubscriptionJson(subscription);

    if (!payload) {
      return { enabled: false, reason: "subscription-failed" };
    }

    await upsertWebPushSubscription(userId, payload);
    return { enabled: true };
  } catch (error) {
    return {
      enabled: false,
      reason: error instanceof WebPushTimeoutError ? "timeout" : "subscription-failed",
    };
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
 * Reads what the channel can do without asking the user anything.
 *
 * Synchronous on web (`Notification.permission` is a plain property); native has to await
 * `getPermissionsAsync()`, so callers get a promise on both platforms and the hook that
 * wraps this seeds its first render from {@link peekReminderChannelStatus}.
 */
export async function getReminderChannelStatus(): Promise<ReminderChannelStatus> {
  if (Platform.OS === "web") {
    return readWebChannelStatus();
  }

  const Notifications = getNativeNotifications();
  if (!Notifications) return "unsupported";

  try {
    const permissions = await Notifications.getPermissionsAsync();
    if (permissions.granted) return "granted";
    // `canAskAgain` false is iOS's "the user declined and the dialog will never show
    // again" - the same dead end as the browser's `denied`, and the only difference
    // that matters to a caller deciding whether a tap can succeed.
    return permissions.canAskAgain ? "prompt-needed" : "blocked";
  } catch {
    return "unsupported";
  }
}

/**
 * The synchronously-knowable part of {@link getReminderChannelStatus}.
 *
 * Web answers exactly; native cannot answer without an await, so it reports the
 * conservative `prompt-needed` until the async read lands. Conservative is the safe
 * direction: it shapes one enable as a request that could have been instant, where the
 * optimistic guess would write a column for a channel that then prompts.
 */
export function peekReminderChannelStatus(): ReminderChannelStatus {
  if (Platform.OS === "web") {
    return readWebChannelStatus();
  }
  return "prompt-needed";
}

function readWebChannelStatus(): ReminderChannelStatus {
  if (!appEnv.webPushVapidPublicKey) return "unsupported";

  const globals = getWebPushGlobals();
  if (!globals?.notification || !globals.serviceWorker || !("PushManager" in window)) {
    return "unsupported";
  }

  if (globals.notification.permission === "granted") return "granted";
  if (globals.notification.permission === "denied") return "blocked";
  return "prompt-needed";
}

/**
 * Registers this device's reminder channel: a web push subscription on web, a device push
 * token on native. Prompts for permission if it has not been given yet.
 *
 * Reminder content and timing are server-driven - the send-web-reminders edge function reads
 * `user_preferences` (and, for routines, the per-routine reminder fields on the routines rows)
 * at send time - so there is nothing per-target or per-time to register here. That is why this
 * takes only a user: the old `scheduleReminder(target, hour, minute, userId)` signature ignored
 * its first three arguments, which is what made a time change look like it could fail (#981).
 */
export async function ensureReminderChannel(
  userId?: string | null,
): Promise<ReminderScheduleResult> {
  if (Platform.OS === "web") {
    return ensureWebPushSubscription(userId);
  }

  const result = await ensureDevicePushToken(userId ?? null);
  if (result.enabled) return { enabled: true };
  // `missing-user` and `permission-denied` carry through, because each has its own wording
  // and its own remedy; the remaining native reasons (no project id, registration failure)
  // have no user-actionable difference, so they collapse onto `unsupported`.
  if (result.reason === "permission-denied" || result.reason === "missing-user") {
    return { enabled: false, reason: result.reason };
  }
  return { enabled: false, reason: "unsupported" };
}

/**
 * The endpoint + timezone last reconciled in this page session, so a tab the user keeps
 * flipping back to does not re-upsert an unchanged row on every focus. Deliberately in
 * memory only: a reload should reconcile again, since the subscription can be revoked by
 * the browser while the page is gone.
 */
let lastReconciled: string | null = null;

/**
 * Re-arms the web push subscription **without ever prompting**.
 *
 * The hole this closes: `cancelAllReminders` deletes the `web_push_subscriptions` row (master
 * off, and every ordinary sign-out), master-on writes only the preference, and
 * `useNotificationSync` returns early on web - so every reminder went silently dead with the
 * browser's permission still granted and nothing on the client ever registering again.
 *
 * Gated on `permission === "granted"` so it is a repair, not an ask. Also refreshes
 * `subscription.time_zone`, which is the zone the edge function actually reads
 * (`web-reminders.ts:294` prefers it over the per-target columns) - a device fact that used
 * to ride along on every save and now has nowhere else to be refreshed.
 */
export async function reconcileWebReminderChannel(userId?: string | null): Promise<void> {
  if (Platform.OS !== "web" || !userId) return;
  if (readWebChannelStatus() !== "granted") return;

  const fingerprint = `${userId}|${getCurrentTimeZone() ?? ""}`;
  try {
    const globals = getWebPushGlobals();
    if (!globals?.serviceWorker) return;
    const registration = await globals.serviceWorker.getRegistration();
    const existing = await registration?.pushManager.getSubscription();
    if (existing && lastReconciled === `${fingerprint}|${existing.endpoint}`) return;

    const result = await ensureWebPushSubscription(userId);
    if (!result.enabled) return;
    const subscription = await (await globals.serviceWorker.ready).pushManager.getSubscription();
    lastReconciled = subscription ? `${fingerprint}|${subscription.endpoint}` : null;
  } catch {
    // Best-effort repair; the next focus tries again.
  }
}

/** Test seam: the reconciliation memo is module state that outlives a test's mocks. */
export function resetWebReminderReconciliation() {
  lastReconciled = null;
}

/**
 * Turns the channel off entirely when the user disables the global master: unsubscribe the web
 * push subscription, or delete this device's push token on native.
 */
export async function cancelAllReminders(userId?: string | null) {
  if (Platform.OS === "web") {
    // The subscription this memo describes is about to stop existing.
    lastReconciled = null;
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
