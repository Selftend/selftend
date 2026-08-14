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

export function captureError(error: unknown, context?: Record<string, unknown>): void {
  if (!isEnabled()) {
    return;
  }

  Sentry.captureException(error, context ? { extra: context } : undefined);
}

// Expected-in-normal-operation failures that must not page anyone: user is
// offline, request aborted on unmount, or an auth token simply expired.
export function isReportableError(error: unknown): boolean {
  if (!(error instanceof Error)) {
    return true;
  }

  if (error.name === "AbortError") {
    return false;
  }

  if (
    error.message.includes("Network request failed") ||
    error.message.includes("Failed to fetch")
  ) {
    return false;
  }

  const status = (error as { status?: unknown }).status;
  if (error.name.startsWith("Auth") && typeof status === "number" && status < 500) {
    return false;
  }

  return true;
}
