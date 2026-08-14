import { Platform } from "react-native";

import { reminderChannelErrorKey } from "@/src/features/notifications/channel-errors";
import type { ReminderScheduleFailureReason } from "@/src/lib/notifications";
import en from "@/src/i18n/locales/en/notifications.json";
import bg from "@/src/i18n/locales/bg/notifications.json";

const ALL_REASONS: ReminderScheduleFailureReason[] = [
  "missing-user",
  "missing-vapid-key",
  "permission-denied",
  "service-worker-unavailable",
  "subscription-failed",
  "timeout",
  "unsupported",
];

/** The two a native user can actually reach - `ensureReminderChannel` maps the rest away. */
const NATIVE_REACHABLE: ReminderScheduleFailureReason[] = ["permission-denied", "unsupported"];

function setPlatformOS(os: string) {
  Object.defineProperty(Platform, "OS", { configurable: true, get: () => os });
}

function resolve(locale: Record<string, unknown>, key: string): string {
  const value = key.split(".").reduce<unknown>((node, part) => {
    if (node && typeof node === "object") return (node as Record<string, unknown>)[part];
    return undefined;
  }, locale);
  expect(typeof value).toBe("string");
  return value as string;
}

afterEach(() => setPlatformOS("ios"));

describe("reminderChannelErrorKey", () => {
  it.each(["web", "ios", "android"])("every reason resolves in both locales on %s", (os) => {
    setPlatformOS(os);
    for (const reason of ALL_REASONS) {
      const key = reminderChannelErrorKey(reason);
      expect(resolve(en, key).length).toBeGreaterThan(0);
      expect(resolve(bg, key).length).toBeGreaterThan(0);
    }
  });

  it("never sends a native user to browser settings", () => {
    for (const os of ["ios", "android"]) {
      setPlatformOS(os);
      for (const reason of NATIVE_REACHABLE) {
        const key = reminderChannelErrorKey(reason);
        // The defect this split fixes: an iOS user who declined the system dialog was told
        // to check their *browser* settings, which names a place that isn't there.
        expect(resolve(en, key).toLowerCase()).not.toContain("browser");
        expect(resolve(bg, key).toLowerCase()).not.toContain("браузър");
      }
    }
  });

  it("keeps the browser wording on web", () => {
    setPlatformOS("web");
    expect(resolve(en, reminderChannelErrorKey("permission-denied"))).toContain("browser");
    expect(resolve(en, reminderChannelErrorKey("unsupported"))).toContain("browser");
  });

  it("leaves the web-only reasons on a single string", () => {
    setPlatformOS("web");
    const webKey = reminderChannelErrorKey("timeout");
    setPlatformOS("ios");
    expect(reminderChannelErrorKey("timeout")).toBe(webKey);
  });
});
