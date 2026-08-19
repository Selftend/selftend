import type { BrowserContext, Page } from "@playwright/test";

import { test, expect } from "./fixtures";
import { createServiceClient } from "./helpers";
import { E2E_WEB_PUSH_VAPID_PUBLIC_KEY } from "../../playwright.config";

// Reminder channel re-arm coverage (#966, spec on #1114).
//
// Fidelity: stubbed-primitive e2e. The stub below replaces ONLY what bundled
// Chromium cannot honestly provide - holding a push subscription (no FCM
// backend, so a real `subscribe()` rejects with AbortError), plus a mirror for
// the one property headless Chromium breaks outright (see installPushStub).
// Everything else is real: the context-level notification permission itself
// (context.grantPermissions), the service-worker registration of
// public/selftend-push-worker.js, the hook wiring, the window focus event, and
// the PostgREST upsert into web_push_subscriptions under RLS against local
// Supabase. What this proves is that the app re-arms correctly; it does not
// prove the browser can mint a subscription - that half is the browser's code
// and the push service's, not ours.
//
// Quarantine: the stub, the `grantPermissions(["notifications"])` calls, and
// the baked-env canary all stay in THIS file. A suite-wide grant would make
// every window focus in every spec attempt a real subscribe() and fail with
// AbortError noise everywhere - only this file carries the stub that makes a
// granted permission safe.

// Pinned so every DB timezone assertion is deterministic on any machine and in
// CI, and distinct from the wrong zone test 3 seeds.
const CONTEXT_TIME_ZONE = "Asia/Tokyo";
test.use({ timezoneId: CONTEXT_TIME_ZONE });

// Must pass the endpoint allowlist CHECK in
// supabase/migrations/20260571_web_push_endpoint_allowlist.sql (covered by
// settings-repository.integration.test.ts). Unique per test so concurrently
// running tests in this file never watch each other's rows.
function stubEndpoint(userId: string, tag: string) {
  return `https://fcm.googleapis.com/fcm/send/e2e-rearm-${tag}-${userId}`;
}

// Patch PushManager.prototype BEFORE app boot: the service-worker registration
// is real, so the real registration's pushManager serves this stub through both
// call sites (ensureWebPushSubscription's getSubscription() ?? subscribe()
// chain, and the reconcile's own getSubscription()). A minimal stateful pair:
// subscribe() stores and returns a canned PushSubscription-shaped object,
// getSubscription() returns whatever is stored and STARTS NULL - per-page
// state, so page.reload() resets it alongside the in-memory lastReconciled
// memo (src/lib/notifications.ts), exactly like a browser that revoked the
// subscription while the page was gone. toJSON() must carry endpoint plus
// keys.auth and keys.p256dh: getSubscriptionJson bails to subscription-failed
// - writing nothing - when any of the three is missing.
async function installPushStub(context: BrowserContext, endpoint: string) {
  await context.addInitScript((stubbedEndpoint: string) => {
    // Headless Chromium hard-wires the sync `Notification.permission` property
    // to "denied" (crbug.com/1052332) even when the context permission is
    // genuinely granted - navigator.permissions.query truthfully reports
    // "granted" while the property lies, and the reconcile guard reads the
    // property. This mirror derives the property from the truthful permissions
    // API (kept live via its `change` event, so a grantPermissions() call made
    // mid-test becomes observable exactly like a user flipping browser site
    // settings). It never invents a state the context does not hold.
    let notificationPermission: NotificationPermission = "default";
    const applyPermissionState = (state: string) => {
      notificationPermission =
        state === "granted" ? "granted" : state === "denied" ? "denied" : "default";
    };
    navigator.permissions
      .query({ name: "notifications" })
      .then((status) => {
        applyPermissionState(status.state);
        status.addEventListener("change", () => applyPermissionState(status.state));
      })
      .catch(() => undefined);
    Object.defineProperty(Notification, "permission", {
      configurable: true,
      get: () => notificationPermission,
    });

    const state: { subscription: unknown } = { subscription: null };
    const makeSubscription = () => ({
      endpoint: stubbedEndpoint,
      expirationTime: null,
      getKey: () => new ArrayBuffer(0),
      toJSON: () => ({
        endpoint: stubbedEndpoint,
        expirationTime: null,
        keys: { auth: "e2e-stub-auth", p256dh: "e2e-stub-p256dh" },
      }),
      unsubscribe: async () => {
        state.subscription = null;
        return true;
      },
    });
    PushManager.prototype.subscribe = async function subscribe() {
      state.subscription ??= makeSubscription();
      return state.subscription as PushSubscription;
    };
    PushManager.prototype.getSubscription = async function getSubscription() {
      return state.subscription as PushSubscription | null;
    };
  }, endpoint);
}

// Service-client reader passed unwrapped to expect.poll (the
// button-tours.e2e.test.ts precedent) - never the waitForTimeout idiom.
async function readSubscriptionRow(userId: string, endpoint: string) {
  const admin = createServiceClient();
  const { data, error } = await admin
    .from("web_push_subscriptions")
    .select("enabled, time_zone")
    .eq("user_id", userId)
    .eq("endpoint", endpoint)
    .maybeSingle();
  if (error) throw new Error(`Could not read web_push_subscriptions: ${error.message}`);
  return data;
}

// The focus event is the exact trigger onWindowFocus (src/lib/window-focus.ts)
// subscribes to via use-notification-sync. Dispatched inside the poll because
// the listener attaches only once preferences load - a single dispatch can land
// before the effect mounts and be lost. Re-dispatching is idempotent: after a
// successful reconcile the lastReconciled memo turns further focuses into
// no-ops. Never calls reconcileWebReminderChannel directly - this file is the
// first true coverage of the focus wiring, and short-circuiting it would test
// nothing new.
function focusThenRead(page: Page, userId: string, endpoint: string) {
  return async () => {
    await page.evaluate(() => window.dispatchEvent(new Event("focus")));
    return readSubscriptionRow(userId, endpoint);
  };
}

// The app shell rendering is the readiness signal; DB state is then polled, so
// nothing here needs the prefs query to have settled.
async function waitForAppShell(page: Page) {
  await expect(page.getByRole("button", { name: "Open navigation", exact: true })).toBeVisible({
    timeout: 15_000,
  });
}

const ALL_TARGETS_OFF = {
  act_reminders_enabled: false,
  breathing_reminders_enabled: false,
  cbt_reminders_enabled: false,
  gratitude_reminders_enabled: false,
  grounding_reminders_enabled: false,
  habits_reminders_enabled: false,
  journal_reminders_enabled: false,
  meditation_reminders_enabled: false,
  mood_reminders_enabled: false,
  sleep_reminders_enabled: false,
} as const;

// Cleanup is mandatory: settings-account.e2e.test.ts's master-switch-back-ON
// assertion holds only because the clean seed leaves all ten targets off -
// under prompt-needed + needsRearm the switch is replaced by the pending
// spinner and the write gates on browser permission. Leaked target state from
// this spec would break it, and a leaked subscription row would leak state
// into any later spec on this worker's pool user.
test.afterEach(async ({ user }) => {
  const admin = createServiceClient();
  const { error: prefsError } = await admin
    .from("user_preferences")
    .update({ notifications_enabled_global: true, ...ALL_TARGETS_OFF })
    .eq("user_id", user.id);
  if (prefsError) {
    throw new Error(`Reminder prefs cleanup failed for ${user.id}: ${prefsError.message}`);
  }
  const { error: subsError } = await admin
    .from("web_push_subscriptions")
    .delete()
    .eq("user_id", user.id);
  if (subsError) {
    throw new Error(`web_push_subscriptions cleanup failed for ${user.id}: ${subsError.message}`);
  }
});

// Canary: the channel under test must not read "unsupported". The VAPID key is
// baked into the bundle at BUILD time, so a stale export (the E2E_SKIP_BUILD
// trap) or one built outside webServer.env would leave every test below
// silently exercising the unsupported early-return - no UI renders differently
// (there is no unsupported copy), so only this fails loudly. The manifest is
// written by scripts/e2e-web-server.js from the exact env the build saw.
test("canary: the bundle under test was baked with the e2e VAPID key", async ({ page }) => {
  const response = await page.request.get("/e2e-baked-env.json");
  expect(
    response.ok(),
    "e2e-baked-env.json is missing - the served export predates the baked-env manifest. Rebuild without E2E_SKIP_BUILD.",
  ).toBe(true);
  const baked = (await response.json()) as Record<string, string>;
  expect(
    baked.EXPO_PUBLIC_WEB_PUSH_VAPID_PUBLIC_KEY,
    "The served export was not baked with the pinned e2e VAPID key - the reminder channel would read 'unsupported' and this suite would test nothing. Rebuild without E2E_SKIP_BUILD.",
  ).toBe(E2E_WEB_PUSH_VAPID_PUBLIC_KEY);

  // The browser half of "not unsupported": the push primitives the channel
  // status check feature-detects.
  await page.goto("/");
  const support = await page.evaluate(() => ({
    notification: "Notification" in window,
    pushManager: "PushManager" in window,
    serviceWorker: "serviceWorker" in navigator,
  }));
  expect(support).toEqual({ notification: true, pushManager: true, serviceWorker: true });
});

// Test 1a (flagship): the focus reconcile arms the channel once permission
// appears, and a later page session recreates a row deleted server-side. The
// grant lands only AFTER the app booted, so the mount-time reconcile ran at
// prompt-needed and bailed - the write observed below can only have come
// through the focus wiring, which is exactly the real scenario: a permission
// granted in browser site settings becomes observable when the tab regains
// focus.
test("focus reconcile arms the channel and a new page session recreates a deleted row", async ({
  page,
  context,
  user,
}) => {
  const endpoint = stubEndpoint(user.id, "recreate");
  await installPushStub(context, endpoint);

  await page.goto("/");
  await waitForAppShell(page);
  expect(await readSubscriptionRow(user.id, endpoint)).toBeNull();

  await context.grantPermissions(["notifications"]);
  await expect
    .poll(focusThenRead(page, user.id, endpoint), { timeout: 30_000 })
    .toMatchObject({ enabled: true, time_zone: CONTEXT_TIME_ZONE });

  // The delivery-side hole: master-off and every ordinary sign-out delete the
  // row while the browser permission stays granted. Within the SAME page
  // session the lastReconciled memo deliberately skips re-upserting an
  // unchanged subscription, so the recovery surface is the next page session -
  // reload resets both the memo and the stub's held subscription.
  const admin = createServiceClient();
  const { error } = await admin
    .from("web_push_subscriptions")
    .delete()
    .eq("user_id", user.id)
    .eq("endpoint", endpoint);
  if (error) throw new Error(`Could not delete the armed row: ${error.message}`);

  await page.reload();
  await waitForAppShell(page);
  await expect
    .poll(focusThenRead(page, user.id, endpoint), { timeout: 30_000 })
    .toMatchObject({ enabled: true, time_zone: CONTEXT_TIME_ZONE });
});

// Test 1b: a dead-endpoint row (enabled=false is what the delivery function
// writes when a push service reports the endpoint gone) is revived - every
// reconcile upsert forces enabled: true.
test("focus reconcile revives a row the delivery function disabled", async ({
  page,
  context,
  user,
}) => {
  const endpoint = stubEndpoint(user.id, "revive");
  const admin = createServiceClient();
  const { error } = await admin.from("web_push_subscriptions").insert({
    user_id: user.id,
    endpoint,
    p256dh: "seeded-dead-p256dh",
    auth: "seeded-dead-auth",
    time_zone: CONTEXT_TIME_ZONE,
    enabled: false,
  });
  if (error) throw new Error(`Could not seed the disabled row: ${error.message}`);

  await installPushStub(context, endpoint);
  await page.goto("/");
  await waitForAppShell(page);
  await context.grantPermissions(["notifications"]);

  await expect
    .poll(focusThenRead(page, user.id, endpoint), { timeout: 30_000 })
    .toMatchObject({ enabled: true, time_zone: CONTEXT_TIME_ZONE });
});

// Test 2: master-on Path B happy path. With a target already enabled,
// re-enabling the global master must re-arm the channel BEFORE writing the
// preference (ensure first, write nothing on failure - the failure half stays
// unit, notifications-screen.test.tsx). This deliberately exercises the
// pending-spinner branch: while ensure() runs the switch is replaced by the
// notification-master-pending indicator.
test("turning the global master back on re-arms the channel and then writes the preference", async ({
  page,
  context,
  user,
}) => {
  const admin = createServiceClient();
  const { error } = await admin
    .from("user_preferences")
    .update({ notifications_enabled_global: false, mood_reminders_enabled: true })
    .eq("user_id", user.id);
  if (error) throw new Error(`Could not seed master-off prefs: ${error.message}`);

  const endpoint = stubEndpoint(user.id, "master-on");
  await installPushStub(context, endpoint);
  // Granted before load: Path B's ensure() must resolve through the stub, not
  // hang on a permission prompt headless Chromium would auto-dismiss.
  await context.grantPermissions(["notifications"]);

  await page.goto("/notifications");
  const masterSwitch = page.getByRole("switch", { name: "Notifications enabled", exact: true });
  await expect(masterSwitch).toHaveAttribute("aria-checked", "false", { timeout: 15_000 });

  await masterSwitch.click();

  await expect
    .poll(() => readSubscriptionRow(user.id, endpoint), { timeout: 30_000 })
    .toMatchObject({ enabled: true, time_zone: CONTEXT_TIME_ZONE });
  await expect
    .poll(async () => {
      const { data, error: readError } = await admin
        .from("user_preferences")
        .select("notifications_enabled_global")
        .eq("user_id", user.id)
        .single();
      if (readError) throw new Error(`Could not read prefs: ${readError.message}`);
      return data.notifications_enabled_global;
    })
    .toBe(true);
  await expect(masterSwitch).toHaveAttribute("aria-checked", "true", { timeout: 10_000 });
});

// Test 3: the reconcile refreshes a stale time_zone - the zone the edge
// function actually reads at send time (it prefers subscription.time_zone over
// the per-target columns), and a device fact with nowhere else to be refreshed
// since reminder saves stopped carrying it.
test("focus reconcile refreshes a stale time_zone to the device zone", async ({
  page,
  context,
  user,
}) => {
  const endpoint = stubEndpoint(user.id, "timezone");
  const admin = createServiceClient();
  const { error } = await admin.from("web_push_subscriptions").insert({
    user_id: user.id,
    endpoint,
    p256dh: "seeded-stale-p256dh",
    auth: "seeded-stale-auth",
    time_zone: "America/New_York",
    enabled: true,
  });
  if (error) throw new Error(`Could not seed the stale-zone row: ${error.message}`);

  await installPushStub(context, endpoint);
  await page.goto("/");
  await waitForAppShell(page);
  await context.grantPermissions(["notifications"]);

  await expect
    .poll(focusThenRead(page, user.id, endpoint), { timeout: 30_000 })
    .toMatchObject({ enabled: true, time_zone: CONTEXT_TIME_ZONE });
});
