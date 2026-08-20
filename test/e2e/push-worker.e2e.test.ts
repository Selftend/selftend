import type { BrowserContext, CDPSession, Page, Worker } from "@playwright/test";

import { test, expect } from "@playwright/test";

// Service-worker push handler coverage (#1117): public/selftend-push-worker.js
// is loaded by no jest suite and, before this file, no e2e ever fired a push
// event into it. The enabling mechanism (docs/research/
// playwright-web-push-ceiling.md, #1110) is the CDP command
// ServiceWorker.deliverPushMessage, which dispatches a REAL `push` event to the
// registered worker without needing any push subscription - so the handler
// under test is the deployed file itself, running in a real SW global, fed by
// the browser's own event dispatch. Chromium-only (the whole suite is), and
// the ServiceWorker CDP domain is experimental - if a Chromium roll ever drops
// it, these tests fail loudly at ServiceWorker.enable, not silently.
//
// Fidelity boundaries, empirically established (2026-08-19, Playwright 1.59
// bundled chromium headless shell):
// - The push event, its payload string, the worker's JSON parsing, and the
//   notification construction are all real.
// - registration.showNotification itself REJECTS in the headless shell
//   ("No notification permission has been granted for this origin") even when
//   the context permission is genuinely granted - the SW-side sibling of the
//   Notification.permission lie (crbug.com/1052332) that
//   reminder-rearm.e2e.test.ts mirrors around. getNotifications() therefore
//   never holds anything here, so the assertion surface is a spy installed
//   over registration.showNotification. The spy calls through, so in any
//   environment that honors the grant (headed, future new-headless) nothing
//   is masked; the rejection is swallowed only after being recorded as a call.
// - The payload arrives unencrypted - CDP skips the web-push crypto path.
//   That path is the browser's code, not this repo's.
// - notificationclick cannot be triggered by a real notification the platform
//   refuses to show, and NotificationEvent's `notification` member only
//   accepts a platform Notification object that headless cannot mint. The
//   click tests instead dispatch a plain Event carrying `notification` /
//   `waitUntil` expandos - the handler is duck-typed, so the REAL registered
//   listener runs end to end against stubbed `clients`, and the same-origin
//   guard it exercises is the real safeTargetUrl.
//
// Quarantine note: reminder-rearm.e2e.test.ts confines
// grantPermissions(["notifications"]) to specs that make a granted permission
// safe. Here it is safe for a different reason: this file uses plain
// @playwright/test (no fixtures.ts auth injection), so no authenticated shell
// ever mounts, the focus reconcile never runs, and nothing can attempt a real
// pushManager.subscribe(). The grant only makes the push delivery run under
// the same permission state production has.

const WORKER_PATH = "/selftend-push-worker.js";
const FALLBACK_PATH = "/modules/cbt";

interface ShowCall {
  title: string;
  options: {
    body?: string;
    data?: { url?: string };
    icon?: string;
    tag?: string;
  };
}

interface PushRig {
  sw: Worker;
  origin: string;
  deliver: (data: string) => Promise<void>;
}

// Register the worker from an unauthenticated page and wire the CDP push
// channel. The registering document is the static baked-env manifest, not the
// app shell: a service worker registers from any same-origin document, and
// skipping the full Expo bundle boot keeps six parallel rigs from starving
// each other into the serviceworker-event timeout. The app never registers a
// service worker on its own here (that only happens post-auth with a granted
// permission), so the one registration observed is ours - the predicate pins
// it to the worker file regardless.
async function setUpPushRig(page: Page, context: BrowserContext): Promise<PushRig> {
  await context.grantPermissions(["notifications"]);
  await page.goto("/e2e-baked-env.json");
  const origin = new URL(page.url()).origin;

  const swPromise = context.waitForEvent("serviceworker", {
    predicate: (worker) => worker.url().endsWith(WORKER_PATH),
  });
  await page.evaluate(async (workerPath) => {
    await navigator.serviceWorker.register(workerPath);
    await navigator.serviceWorker.ready;
  }, WORKER_PATH);
  // Belt over the event: if Playwright attached the worker before the waiter
  // saw it fire, the handle is already in the context's list.
  const sw =
    context.serviceWorkers().find((worker) => worker.url().endsWith(WORKER_PATH)) ??
    (await swPromise);

  const cdp = await context.newCDPSession(page);
  const registrationId = await waitForRegistrationId(cdp, origin);

  // The spy must be in place before any delivery; evaluate resolves before
  // deliver() can be called, so no push can slip past it.
  await sw.evaluate(() => {
    const scope = self as unknown as {
      registration: {
        showNotification: (title: string, options?: unknown) => Promise<void>;
      };
      __shows: unknown[];
    };
    scope.__shows = [];
    const realShow = scope.registration.showNotification.bind(scope.registration);
    scope.registration.showNotification = (title, options) => {
      scope.__shows.push({ title, options });
      // Call through for fidelity; the headless shell rejects (see header),
      // production resolves. Swallow after recording so the handler's
      // waitUntil never surfaces platform-refusal noise.
      return realShow(title, options).catch(() => undefined);
    };
  });

  const deliver = async (data: string) => {
    await cdp.send("ServiceWorker.deliverPushMessage", { origin, registrationId, data });
  };

  return { sw, origin, deliver };
}

// ServiceWorker.enable replays registrations to new sessions, so listening
// before sending never races the already-registered worker.
function waitForRegistrationId(cdp: CDPSession, origin: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(
      () => reject(new Error("ServiceWorker.enable produced no registration for the e2e origin")),
      15_000,
    );
    cdp.on("ServiceWorker.workerRegistrationUpdated", (event) => {
      const registration = event.registrations.find((entry) => entry.scopeURL.startsWith(origin));
      if (registration) {
        clearTimeout(timer);
        resolve(registration.registrationId);
      }
    });
    cdp.send("ServiceWorker.enable").catch((error) => {
      clearTimeout(timer);
      reject(error instanceof Error ? error : new Error(String(error)));
    });
  });
}

function readShows(sw: Worker): Promise<ShowCall[]> {
  return sw.evaluate(() => (self as unknown as { __shows: unknown[] }).__shows) as Promise<
    ShowCall[]
  >;
}

interface ClickCapture {
  closed: boolean;
  navigated: string[];
  focused: string[];
  openedWindows: string[];
}

// Dispatch a synthetic notificationclick through the worker's real listener.
// `clients.matchAll` is stubbed to return the given window clients (focusless
// entries omit `focus` entirely - the handler's `"focus" in client` check);
// `openWindow` is stubbed to record instead of opening. The returned capture
// resolves only after the promise the handler passed to waitUntil settles.
function dispatchNotificationClick(
  sw: Worker,
  config: { url: string; windowClients: { url: string; focusable: boolean }[] },
): Promise<ClickCapture> {
  return sw.evaluate((cfg) => {
    const scope = self as unknown as {
      clients: {
        matchAll: (options?: unknown) => Promise<unknown[]>;
        openWindow: (url: string) => Promise<unknown>;
      };
      dispatchEvent: (event: Event) => boolean;
    };
    const captured = {
      closed: false,
      navigated: [] as string[],
      focused: [] as string[],
      openedWindows: [] as string[],
    };

    scope.clients.matchAll = async () =>
      cfg.windowClients.map((entry) => {
        const client: Record<string, unknown> = {
          url: entry.url,
          navigate: (url: string) => {
            captured.navigated.push(url);
            return Promise.resolve();
          },
        };
        if (entry.focusable) {
          client.focus = () => {
            captured.focused.push(entry.url);
            return Promise.resolve();
          };
        }
        return client;
      });
    scope.clients.openWindow = (url: string) => {
      captured.openedWindows.push(url);
      return Promise.resolve(null);
    };

    let settled: Promise<unknown> = Promise.resolve();
    const event = new Event("notificationclick") as Event & {
      notification?: unknown;
      waitUntil?: (promise: Promise<unknown>) => void;
    };
    event.notification = {
      data: { url: cfg.url },
      close: () => {
        captured.closed = true;
      },
    };
    event.waitUntil = (promise: Promise<unknown>) => {
      settled = promise;
    };
    scope.dispatchEvent(event);
    return Promise.resolve(settled).then(() => captured);
  }, config);
}

test("push: a full payload constructs the notification verbatim", async ({ page, context }) => {
  const { sw, deliver } = await setUpPushRig(page, context);

  await deliver(
    JSON.stringify({
      title: "Mood check-in",
      body: "How are you feeling today?",
      url: "/tools/mood",
      tag: "selftend-mood-reminder",
    }),
  );

  await expect
    .poll(() => readShows(sw))
    .toEqual([
      {
        title: "Mood check-in",
        options: {
          body: "How are you feeling today?",
          data: { url: "/tools/mood" },
          icon: "/favicon.png",
          tag: "selftend-mood-reminder",
        },
      },
    ]);
});

test("push: unparseable and empty payloads fall back to the defaults", async ({
  page,
  context,
}) => {
  const { sw, deliver } = await setUpPushRig(page, context);

  // Both fallback layers: garbage exercises the json() catch, "{}" exercises
  // the field-level || defaults after a successful parse.
  await deliver("%%% not json %%%");
  await deliver("{}");

  const fallbackShow = {
    title: "Selftend",
    options: {
      body: undefined,
      data: { url: FALLBACK_PATH },
      icon: "/favicon.png",
      tag: "selftend-cbt-reminder",
    },
  };
  await expect.poll(() => readShows(sw)).toEqual([fallbackShow, fallbackShow]);
});

test("notificationclick: focuses and navigates the first same-origin window client", async ({
  page,
  context,
}) => {
  const { sw, origin } = await setUpPushRig(page, context);

  const captured = await dispatchNotificationClick(sw, {
    url: "/tools/mood",
    windowClients: [
      // Skipped: focusable but not on this origin.
      { url: "https://other.example/app", focusable: true },
      // Skipped: on-origin but exposes no focus().
      { url: `${origin}/settings`, focusable: false },
      { url: `${origin}/`, focusable: true },
    ],
  });

  expect(captured.closed).toBe(true);
  expect(captured.navigated).toEqual([`${origin}/tools/mood`]);
  expect(captured.focused).toEqual([`${origin}/`]);
  expect(captured.openedWindows).toEqual([]);
});

test("notificationclick: a cross-origin payload URL is guarded to the fallback route", async ({
  page,
  context,
}) => {
  const { sw, origin } = await setUpPushRig(page, context);

  const captured = await dispatchNotificationClick(sw, {
    url: "https://evil.example/phish",
    windowClients: [{ url: `${origin}/`, focusable: true }],
  });

  expect(captured.closed).toBe(true);
  expect(captured.navigated).toEqual([`${origin}${FALLBACK_PATH}`]);
  expect(captured.focused).toEqual([`${origin}/`]);
});

test("notificationclick: opens a new window when no window client exists", async ({
  page,
  context,
}) => {
  const { sw, origin } = await setUpPushRig(page, context);

  const captured = await dispatchNotificationClick(sw, {
    url: "/tools/mood",
    windowClients: [],
  });

  expect(captured.closed).toBe(true);
  expect(captured.navigated).toEqual([]);
  expect(captured.focused).toEqual([]);
  expect(captured.openedWindows).toEqual([`${origin}/tools/mood`]);
});

test("safeTargetUrl: resolves only same-origin targets, everything else falls back", async ({
  page,
  context,
}) => {
  const { sw, origin } = await setUpPushRig(page, context);

  // safeTargetUrl is a top-level function declaration in the worker's classic
  // script, so it is a global of the SW scope - callable directly, against the
  // real self.location.origin.
  const resolve = (raw: string | undefined) =>
    sw.evaluate(
      (rawUrl) =>
        (globalThis as unknown as { safeTargetUrl: (value: unknown) => string }).safeTargetUrl(
          rawUrl,
        ),
      raw,
    );

  const fallback = `${origin}${FALLBACK_PATH}`;
  await expect(resolve("/tools/mood?tab=history#top")).resolves.toBe(
    `${origin}/tools/mood?tab=history#top`,
  );
  await expect(resolve(`${origin}/settings/notifications`)).resolves.toBe(
    `${origin}/settings/notifications`,
  );
  await expect(resolve("https://evil.example/phish")).resolves.toBe(fallback);
  // Protocol-relative: new URL("//host/x", origin) adopts the base SCHEME but
  // the foreign host - the exact escape the origin check exists to catch.
  await expect(resolve("//evil.example/phish")).resolves.toBe(fallback);
  await expect(resolve(undefined)).resolves.toBe(fallback);
  await expect(resolve("")).resolves.toBe(fallback);
  // "https://" carries a scheme (so the base is ignored) yet has no host -
  // new URL throws, covering the catch branch.
  await expect(resolve("https://")).resolves.toBe(fallback);
});
