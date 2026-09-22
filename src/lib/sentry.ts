import * as Sentry from "@sentry/react-native";

const sentryDsn = process.env.EXPO_PUBLIC_SENTRY_DSN ?? "";
// One shared DSN across deployments; events are told apart by environment
// (production vs staging - decision #16). Unset means a production build.
const sentryEnvironment = process.env.EXPO_PUBLIC_APP_ENV ?? "production";

export function shouldEnableSentry(dsn: string, isDev: boolean): boolean {
  return Boolean(dsn) && !isDev;
}

function isEnabled(): boolean {
  return shouldEnableSentry(sentryDsn, __DEV__);
}

type ScrubbableEvent = {
  user?: { id?: string } & Record<string, unknown>;
  contexts?: { device?: Record<string, unknown> } & Record<string, unknown>;
};

// Safety net on top of sendDefaultPii:false - keep only the pseudonymous
// Supabase UUID, and strip the device name, which is often the owner's
// real name ("Vasil's Pixel").
export function scrubEvent<T extends ScrubbableEvent>(event: T): T {
  if (event.user) {
    event.user = event.user.id ? { id: event.user.id } : undefined;
  }

  if (event.contexts?.device) {
    delete event.contexts.device.name;
  }

  return event;
}

/** A route with its query string removed. Non-strings pass through untouched. */
function routeWithoutQuery(value: unknown): unknown {
  if (typeof value !== "string") return value;
  const queryStart = value.indexOf("?");
  return queryStart === -1 ? value : value.slice(0, queryStart);
}

/**
 * Console breadcrumbs are dropped whole - they can carry server error payloads.
 *
 * ☠️ Navigation breadcrumbs used to be waved through on the belief that they "carry only
 * routes", which was never true: the Android launcher's mood faces deep-link
 * `/tools/check-in/new?score=N` (#996), putting a health value in the breadcrumb trail.
 * #961 fixed the two in-app callers with an in-memory seed store, but a launcher tap is a
 * COLD-START deep link - there is no running JS to seed - and this repo has no OTA
 * channel, so already-installed builds keep minting that path forever. Scrubbing here is
 * the only fix that reaches them.
 *
 * The whole query string goes rather than a `score` key: a denylist of known-sensitive
 * params is satisfied forever by whatever was known when it was written, and the next
 * param carrying a value would leak in silence. The route still names the screen, which
 * is what the breadcrumb is for.
 *
 * http breadcrumbs keep theirs - a PostgREST query string is the filter, which is the
 * useful part, and none of them carries a health value today.
 */
export function scrubBreadcrumb<
  T extends { category?: string; message?: string; data?: Record<string, unknown> },
>(breadcrumb: T): T | null {
  if (breadcrumb.category === "console") return null;

  if (breadcrumb.category === "navigation") {
    if (typeof breadcrumb.message === "string") {
      breadcrumb.message = routeWithoutQuery(breadcrumb.message) as string;
    }
    for (const key of ["from", "to"]) {
      if (breadcrumb.data && key in breadcrumb.data) {
        breadcrumb.data[key] = routeWithoutQuery(breadcrumb.data[key]);
      }
    }
  }

  return breadcrumb;
}

/**
 * Device fingerprints whose events are discarded on sight (#2577).
 *
 * ⚠️ This is the only drop in this file that is NOT about privacy. Everything above
 * scrubs a field out of an event that still gets sent; this throws the event away whole,
 * and it does it for traffic triage - the sender is an emulator farm, not a person.
 * ADR-0013 records the decision, and is where to look when someone asks why a device
 * never reports.
 *
 * ☠️ BOTH halves must match, and that is the entire point. `device.model` on its own
 * would silence a genuine OnePlus 8 Pro owner; `os.build` is the narrow half. The farm's
 * profile is impossible on the handset it claims to be - 288x448 at density 0.6625
 * against a physical 1440x3168, `processor_count` 2 against 8, `x86_64` listed ahead of
 * `arm64-v8a`, a battery frozen at exactly 85% and 35 C on every event - but none of that
 * is in the key, because a key made of eight coincidences breaks the first time the farm
 * rotates one of them.
 *
 * Traffic triage belongs in a Sentry inbound filter rather than here, and that is where
 * #2577 first ruled it should go. It cannot: Sentry has no inbound filter keyed on tags
 * or device context, and closed both requests for one as "not planned" on 2026-06-04
 * (getsentry/sentry#22874, getsentry/sentry#29813). Hence a code-side drop, whose cost is
 * that it reaches only builds shipped after it - this repo has no OTA channel, so the
 * already-installed base keeps reporting the farm forever.
 */
const SPOOFED_DEVICE_FINGERPRINTS: readonly { osBuild: string; deviceModel: string }[] = [
  { osBuild: "QKR1.191246.002", deviceModel: "OnePlus8Pro" },
];

type ScreenableEvent = {
  contexts?: { device?: { model?: unknown }; os?: { build?: unknown } };
};

/**
 * True when the event carries a known spoofed fingerprint and must not be sent.
 *
 * A missing `os` or `device` context - web, or any platform that attaches neither - can
 * never match, because `undefined` is not one of the strings above.
 */
export function isSpoofedDeviceEvent<T extends ScreenableEvent>(event: T): boolean {
  const osBuild = event.contexts?.os?.build;
  const deviceModel = event.contexts?.device?.model;

  return SPOOFED_DEVICE_FINGERPRINTS.some(
    (fingerprint) => osBuild === fingerprint.osBuild && deviceModel === fingerprint.deviceModel,
  );
}

export function initSentry(): void {
  if (!isEnabled()) {
    return;
  }

  Sentry.init({
    dsn: sentryDsn,
    environment: sentryEnvironment,
    sendDefaultPii: false,
    // The screen runs before the scrubbers: a farm event is discarded whole, so there
    // is nothing left on it worth scrubbing.
    beforeSend: (event) => {
      if (isSpoofedDeviceEvent(event as ScreenableEvent)) return null;
      return scrubEvent(event as ScrubbableEvent) as typeof event;
    },
    beforeBreadcrumb: (breadcrumb) =>
      scrubBreadcrumb(breadcrumb as { category?: string; message?: string }),
  });
}

export function setSentryUser(userId: string | null): void {
  if (!isEnabled()) {
    return;
  }

  Sentry.setUser(userId ? { id: userId } : null);
}

type ErrorLike = { name?: unknown; message?: unknown; status?: unknown; code?: unknown };

/** The thrown value's own fields, or an empty bag when it is a primitive. */
function errorLikeFields(value: unknown): ErrorLike {
  return typeof value === "object" && value !== null ? (value as ErrorLike) : {};
}

/**
 * A message for a value that arrived without a usable one.
 *
 * Only the shape is described - the key names, plus `code`/`status`, which are server
 * diagnostics rather than anything the user typed. The value itself still travels as
 * `cause`, so nothing is lost; this is only what has to read well as a Sentry title.
 */
function describeThrownValue(value: unknown, fields: ErrorLike): string {
  if (typeof value !== "object" || value === null) {
    return `Non-Error thrown: ${String(value)}`;
  }

  const parts: string[] = [];
  if (typeof fields.code === "string" || typeof fields.code === "number") {
    parts.push(`code ${fields.code}`);
  }
  if (typeof fields.status === "number") {
    parts.push(`status ${fields.status}`);
  }
  const keys = Object.keys(value as Record<string, unknown>);
  if (keys.length > 0) {
    parts.push(`keys: ${keys.join(", ")}`);
  }

  return parts.length > 0 ? `Non-Error thrown (${parts.join(", ")})` : "Non-Error thrown (no keys)";
}

/**
 * Turn any thrown value into an `Error`, keeping the original as `cause`.
 *
 * Two things depend on this (#1548). Sentry serialises a thrown non-`Error` into
 * "Object captured as exception with keys: message" - which, for the PostgREST-shaped
 * `{ message: "" }` seen eleven times in SELFTEND-9, said nothing at all: no message, no
 * stack, no way to tell which layer failed. And `isReportableError` below reads
 * `name`/`message`/`status`, so a non-`Error` used to skip every suppression rule and page
 * someone for being offline.
 *
 * `instanceof Error` is unreliable across realms and bundles, so a genuine `Error` can
 * arrive here looking like a plain object; copying `name`, `message` and `status` off the
 * value means such an error is judged on its fields either way.
 */
export function normalizeError(value: unknown): Error {
  if (value instanceof Error) {
    return value;
  }

  const fields = errorLikeFields(value);
  const message =
    typeof value === "string" && value
      ? value
      : typeof fields.message === "string" && fields.message
        ? fields.message
        : describeThrownValue(value, fields);

  const normalized = new Error(message);
  // Assigned rather than passed to the constructor: the `cause` option is ES2022, and this
  // has to hold on whatever Hermes an already-installed build ships.
  normalized.cause = value;

  if (typeof fields.name === "string" && fields.name) {
    normalized.name = fields.name;
  }
  if (typeof fields.status === "number") {
    (normalized as Error & { status?: number }).status = fields.status;
  }

  return normalized;
}

export function captureError(error: unknown, context?: Record<string, unknown>): void {
  if (!isEnabled()) {
    return;
  }

  const normalized = normalizeError(error);
  // The raw value rides along as an extra for whatever the normalised copy left behind:
  // Sentry only follows `cause` when the cause is itself an `Error`.
  const extra = normalized === error ? context : { ...context, originalError: error };

  Sentry.captureException(normalized, extra ? { extra } : undefined);
}

/**
 * How a lost connection words itself, per platform.
 *
 * ☠️ **This list is per-platform, and it only ever held the two wordings a developer
 * sees on their own machine.** "Network request failed" is React Native's fetch and
 * "Failed to fetch" is Chromium's - between them they cover an Android device and a
 * desktop Chrome tab, which is exactly the pair you hit while building. Neither iOS
 * nor WebKit says either of those things, so an offline failure on those two platforms
 * walked straight through the filter and paged someone. The web build reported
 * SELFTEND-E on that hole and an iPhone reported SELFTEND-J; the docblock on
 * `PreferencesReadTimeoutError` had meanwhile written the gap down as a guarantee -
 * "Every genuinely-offline read still rejects with a network message" - which is part
 * of why it went unnoticed.
 *
 * Every entry is a wording an OS or engine produces for connectivity it lost on its
 * own, never a string this app writes. Adding one asserts the request never reached
 * the server, so a phrase a real server failure could also carry - a bare "Load
 * failed", say - does not belong here: it would silence the defect it names.
 */
const OFFLINE_ERROR_MESSAGES = [
  // React Native's fetch, both platforms.
  "Network request failed",
  // Chromium's fetch.
  "Failed to fetch",
  // WebKit's XHR and its `NetworkError` DOMException - SELFTEND-E, which reached
  // Sentry from the web build as an unhandled rejection with no frame of ours in it.
  "A network error occurred",
  // iOS URLSession's NSURLErrorNetworkConnectionLost (-1005), which arrives in JS
  // wrapped by whichever Expo module was mid-flight - SELFTEND-J.
  "The network connection was lost",
  // Its sibling NSURLErrorNotConnectedToInternet (-1009): the same class of failure,
  // named here rather than waiting for its own Sentry issue to prove it.
  "The Internet connection appears to be offline",
];

/**
 * Auth-callback outcomes that are the person's own path through the flow.
 *
 * `AuthCallbackError` names the step, not a fault: `cross_device` is an emailed link
 * opened in a browser that never held the PKCE verifier, and `expired_or_used` is a
 * link that sat in an inbox too long or that a mail scanner already clicked. Both land
 * on a calm translated card offering a new link, so nothing is broken and nobody needs
 * paging - SELFTEND-C was one of these, arriving from the OAuth path.
 *
 * ☠️ The existing auth rule below cannot cover them however it is widened: it gates on
 * a numeric `status`, and `AuthCallbackError` carries none - the whole point of the
 * class is that GoTrue's status and message are dropped before the throw. So the name
 * passes `startsWith("Auth")`, the status check fails, and it reports.
 *
 * Matched on the message rather than `instanceof`, deliberately: this module must not
 * import from `features/`, and `auth-callback:<code>` is already documented in
 * `callback-errors.ts` as a stable, non-sensitive identifier for exactly this use. The
 * other codes stay reportable - `generic`, `missing_params` and `identity_exists` can
 * each mean the app got something wrong.
 */
const EXPECTED_AUTH_CALLBACK_MESSAGES = new Set([
  "auth-callback:cross_device",
  "auth-callback:expired_or_used",
]);

// Expected-in-normal-operation failures that must not page anyone: user is
// offline, request aborted on unmount, an auth token simply expired, or an
// emailed link was opened somewhere it could not complete.
//
// The rules run against the normalised error, so a non-`Error` throw - a bare string, or
// the `{ message }` object a fetch/PostgREST layer can reject with - is judged on the same
// fields as its `Error` twin instead of being waved straight through (#1548).
export function isReportableError(error: unknown): boolean {
  const normalized = normalizeError(error);

  if (normalized.name === "AbortError") {
    return false;
  }

  if (OFFLINE_ERROR_MESSAGES.some((wording) => normalized.message.includes(wording))) {
    return false;
  }

  if (
    normalized.name === "AuthCallbackError" &&
    EXPECTED_AUTH_CALLBACK_MESSAGES.has(normalized.message)
  ) {
    return false;
  }

  const status = (normalized as { status?: unknown }).status;
  if (normalized.name.startsWith("Auth") && typeof status === "number" && status < 500) {
    return false;
  }

  return true;
}
