import * as Sentry from "@sentry/react-native";

const sentryDsn = process.env.EXPO_PUBLIC_SENTRY_DSN ?? "";

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

// Console logs can carry server error payloads; navigation/http breadcrumbs
// carry only routes and status codes, which is all we need.
export function dropConsoleBreadcrumb<T extends { category?: string }>(breadcrumb: T): T | null {
  return breadcrumb.category === "console" ? null : breadcrumb;
}

export function initSentry(): void {
  if (!isEnabled()) {
    return;
  }

  Sentry.init({
    dsn: sentryDsn,
    sendDefaultPii: false,
    beforeSend: (event) => scrubEvent(event as ScrubbableEvent) as typeof event,
    beforeBreadcrumb: (breadcrumb) => dropConsoleBreadcrumb(breadcrumb as { category?: string }),
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
