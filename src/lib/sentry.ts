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

export function initSentry(): void {
  if (!isEnabled()) {
    return;
  }

  Sentry.init({
    dsn: sentryDsn,
    environment: sentryEnvironment,
    sendDefaultPii: false,
    beforeSend: (event) => scrubEvent(event as ScrubbableEvent) as typeof event,
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

// Expected-in-normal-operation failures that must not page anyone: user is
// offline, request aborted on unmount, or an auth token simply expired.
//
// The rules run against the normalised error, so a non-`Error` throw - a bare string, or
// the `{ message }` object a fetch/PostgREST layer can reject with - is judged on the same
// fields as its `Error` twin instead of being waved straight through (#1548).
export function isReportableError(error: unknown): boolean {
  const normalized = normalizeError(error);

  if (normalized.name === "AbortError") {
    return false;
  }

  if (
    normalized.message.includes("Network request failed") ||
    normalized.message.includes("Failed to fetch")
  ) {
    return false;
  }

  const status = (normalized as { status?: unknown }).status;
  if (normalized.name.startsWith("Auth") && typeof status === "number" && status < 500) {
    return false;
  }

  return true;
}
