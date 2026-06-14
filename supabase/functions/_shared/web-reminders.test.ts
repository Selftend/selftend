import { groundingSlugs } from "@/src/constants/grounding";

import {
  activityWindowForTarget,
  buildExpoPushMessage,
  classifyExpoTicket,
  classifyPushError,
  getZonedParts,
  GROUNDING_EXERCISE_NAMES,
  isAllowedPushEndpoint,
  reminderKeyIfDue,
  resolveReminderLanguage,
  startOfZonedDay,
  type UserPreferenceRow,
  type WebPushSubscriptionRow,
} from "./web-reminders";

const basePrefs: UserPreferenceRow = {
  user_id: "u1",
  notifications_enabled_global: true,
  reminder_consent: true,
  language: "en",
  cbt_reminders_enabled: true,
  cbt_reminder_hour: 9,
  cbt_reminder_minute: 0,
  cbt_reminder_timezone: "UTC",
  meditation_reminders_enabled: false,
  meditation_reminder_hour: 0,
  meditation_reminder_minute: 0,
  meditation_reminder_timezone: null,
  act_reminders_enabled: false,
  act_reminder_hour: 0,
  act_reminder_minute: 0,
  act_reminder_timezone: null,
};

const baseSub: WebPushSubscriptionRow = {
  auth: "a",
  endpoint: "https://push.example/x",
  failure_count: 0,
  id: "s1",
  last_cbt_reminder_key: null,
  last_meditation_reminder_key: null,
  last_act_reminder_key: null,
  p256dh: "p",
  time_zone: "UTC",
  user_id: "u1",
};

describe("isAllowedPushEndpoint", () => {
  it("allows real push-service endpoints over https", () => {
    expect(isAllowedPushEndpoint("https://fcm.googleapis.com/fcm/send/abc123")).toBe(true);
    expect(isAllowedPushEndpoint("https://web.push.apple.com/QABC")).toBe(true);
    expect(isAllowedPushEndpoint("https://db5p.notify.windows.com/w/?token=x")).toBe(true);
    expect(isAllowedPushEndpoint("https://updates.push.services.mozilla.com/wpush/v2/g")).toBe(
      true,
    );
    expect(isAllowedPushEndpoint("https://push.services.mozilla.com/wpush/v2/g")).toBe(true);
  });

  it("rejects internal / SSRF targets and non-https schemes", () => {
    expect(isAllowedPushEndpoint("http://fcm.googleapis.com/fcm/send/x")).toBe(false);
    expect(isAllowedPushEndpoint("https://169.254.169.254/latest/meta-data/")).toBe(false);
    expect(isAllowedPushEndpoint("https://localhost/internal")).toBe(false);
    expect(isAllowedPushEndpoint("https://internal-host:8080/admin")).toBe(false);
    expect(isAllowedPushEndpoint("http://localhost:5432")).toBe(false);
    expect(isAllowedPushEndpoint("not a url")).toBe(false);
    expect(isAllowedPushEndpoint("")).toBe(false);
  });

  it("rejects allowlist-suffix spoofing and userinfo tricks", () => {
    // hostname is attacker.com here, not the push host in the userinfo segment.
    expect(isAllowedPushEndpoint("https://fcm.googleapis.com@attacker.com/x")).toBe(false);
    // ".push.apple.com" must be a real label boundary, not a substring of the host.
    expect(isAllowedPushEndpoint("https://evilpush.apple.com.attacker.com/x")).toBe(false);
    // non-default port on an otherwise-allowed host is rejected.
    expect(isAllowedPushEndpoint("https://fcm.googleapis.com:9000/fcm/send/x")).toBe(false);
  });
});

describe("getZonedParts", () => {
  it("formats a date into zoned parts for a valid timezone", () => {
    const parts = getZonedParts(new Date("2026-05-24T09:03:00.000Z"), "UTC");
    expect(parts).toEqual({ year: "2026", month: "05", day: "24", hour: 9, minute: 3 });
  });

  it("returns null for an invalid timezone", () => {
    expect(getZonedParts(new Date("2026-05-24T09:00:00.000Z"), "Not/AZone")).toBeNull();
  });

  it("normalizes midnight to hour 0 (not the Intl 1-24 clock's 24)", () => {
    // Intl.DateTimeFormat({ hour12: false }) yields the 1-24 clock, so 00:0x -> "24".
    // getZonedParts must normalize that to 0 so a midnight reminder (targetHour 0)
    // actually matches; otherwise parts.hour 24 !== targetHour 0 and it never fires.
    expect(getZonedParts(new Date("2026-05-24T00:03:00.000Z"), "UTC")?.hour).toBe(0);
  });
});

describe("reminderKeyIfDue", () => {
  const now = new Date("2026-05-24T09:02:00.000Z"); // 09:02 UTC, inside the 09:00-09:05 window

  it("returns the reminder key when due inside the 5-minute window", () => {
    expect(reminderKeyIfDue("cbt", baseSub, basePrefs, now)).toBe("2026-05-24");
  });

  it("returns null when the target is disabled", () => {
    expect(
      reminderKeyIfDue("cbt", baseSub, { ...basePrefs, cbt_reminders_enabled: false }, now),
    ).toBeNull();
  });

  it("returns null when already sent today (lastKey matches)", () => {
    expect(
      reminderKeyIfDue("cbt", { ...baseSub, last_cbt_reminder_key: "2026-05-24" }, basePrefs, now),
    ).toBeNull();
  });

  it("returns null when the hour does not match", () => {
    expect(
      reminderKeyIfDue("cbt", baseSub, basePrefs, new Date("2026-05-24T10:02:00.000Z")),
    ).toBeNull();
  });

  it("fires a midnight reminder (targetHour 0) inside the window", () => {
    // Regression guard: Intl's 1-24 clock reports midnight as hour 24, which would
    // never equal targetHour 0, so midnight reminders silently never fired.
    expect(
      reminderKeyIfDue(
        "cbt",
        baseSub,
        { ...basePrefs, cbt_reminder_hour: 0 },
        new Date("2026-05-24T00:02:00.000Z"),
      ),
    ).toBe("2026-05-24");
  });

  it("fires a minute 56-59 reminder at the next */5 cron tick that crosses the hour", () => {
    // Regression guard: a target of 09:58 is never hit by a */5 cron (ticks at :55, :00).
    // The 5-minute due window must span the hour boundary so the 10:00 tick fires it.
    const prefs = { ...basePrefs, cbt_reminder_hour: 9, cbt_reminder_minute: 58 };
    expect(reminderKeyIfDue("cbt", baseSub, prefs, new Date("2026-05-24T10:00:00.000Z"))).toBe(
      "2026-05-24",
    );
    // ...but not 3 minutes early at the 09:55 tick.
    expect(
      reminderKeyIfDue("cbt", baseSub, prefs, new Date("2026-05-24T09:55:00.000Z")),
    ).toBeNull();
  });

  it("returns null below the minute window", () => {
    expect(
      reminderKeyIfDue("cbt", baseSub, { ...basePrefs, cbt_reminder_minute: 5 }, now),
    ).toBeNull();
  });

  it("returns null at/after the upper minute boundary (targetMinute + 5)", () => {
    expect(
      reminderKeyIfDue("cbt", baseSub, basePrefs, new Date("2026-05-24T09:05:00.000Z")),
    ).toBeNull();
  });

  it("falls back to the preference timezone when the subscription has none", () => {
    // 09:02 UTC == 12:02 in Europe/Sofia (UTC+3/EEST in May); with pref tz Sofia and hour 12 it is due.
    const sub = { ...baseSub, time_zone: null };
    const prefs = { ...basePrefs, cbt_reminder_timezone: "Europe/Sofia", cbt_reminder_hour: 12 };
    expect(reminderKeyIfDue("cbt", sub, prefs, now)).toBe("2026-05-24");
  });

  it("falls back to UTC when neither subscription nor preference timezone is set", () => {
    const sub = { ...baseSub, time_zone: null };
    const prefs = { ...basePrefs, cbt_reminder_timezone: null };
    expect(reminderKeyIfDue("cbt", sub, prefs, now)).toBe("2026-05-24");
  });
});

describe("activityWindowForTarget", () => {
  const FIXED = new Date("2026-06-05T13:30:45.000Z"); // 13:30:45 UTC

  it("builds a start-of-day timestamp window for a ts-column target (UTC)", () => {
    expect(activityWindowForTarget("mood", "UTC", FIXED)).toEqual({
      table: "mood_logs",
      column: "logged_at",
      op: "gte",
      value: "2026-06-05T00:00:00.000Z",
    });
  });

  it("builds an equality date window for a date-column target (habits)", () => {
    expect(activityWindowForTarget("habits", "UTC", FIXED)).toEqual({
      table: "habit_logs",
      column: "logged_on",
      op: "eq",
      value: "2026-06-05",
    });
  });

  it("returns null for targets with no activity source (breathing, act)", () => {
    expect(activityWindowForTarget("breathing", "UTC", FIXED)).toBeNull();
    expect(activityWindowForTarget("act", "UTC", FIXED)).toBeNull();
  });

  it("anchors start-of-day to the user's timezone, not UTC", () => {
    // 2026-06-05T01:00Z is 04:00 in Europe/Sofia (UTC+3, summer);
    // start-of-day-in-Sofia is 2026-06-04T21:00Z.
    const window = activityWindowForTarget(
      "mood",
      "Europe/Sofia",
      new Date("2026-06-05T01:00:00.000Z"),
    );
    expect(window?.value).toBe("2026-06-04T21:00:00.000Z");
  });

  it("returns null for an invalid timezone", () => {
    expect(activityWindowForTarget("mood", "Not/AZone", FIXED)).toBeNull();
  });

  it("filters grounding by exercise_name against mindfulness_sessions (#24)", () => {
    // Grounding used to query the dropped noticing_logs table (suppression silently broken);
    // it now suppresses on a same-day grounding session in mindfulness_sessions.
    expect(activityWindowForTarget("grounding", "UTC", FIXED)).toEqual({
      table: "mindfulness_sessions",
      column: "completed_at",
      op: "gte",
      value: "2026-06-05T00:00:00.000Z",
      inColumn: "exercise_name",
      inValues: GROUNDING_EXERCISE_NAMES,
    });
  });
});

describe("startOfZonedDay (#70 - DST-correct local midnight)", () => {
  it("returns UTC midnight for the UTC zone", () => {
    expect(startOfZonedDay(new Date("2026-06-05T13:30:45.000Z"), "UTC")?.toISOString()).toBe(
      "2026-06-05T00:00:00.000Z",
    );
  });

  it("anchors to the zone offset on a non-transition day", () => {
    // 2026-06-05T01:00Z is 04:00 in Europe/Sofia (UTC+3 summer); local midnight is 2026-06-04T21:00Z.
    expect(
      startOfZonedDay(new Date("2026-06-05T01:00:00.000Z"), "Europe/Sofia")?.toISOString(),
    ).toBe("2026-06-04T21:00:00.000Z");
  });

  it("is correct on a fall-back day (offset changes from -4 to -5 mid-day)", () => {
    // America/New_York falls back 2026-11-01 02:00 EDT -> 01:00 EST. Local midnight is still
    // EDT (00:00 EST-4 = 04:00Z). The naive constant-offset estimate would land at 05:00Z.
    expect(
      startOfZonedDay(new Date("2026-11-01T12:00:00.000Z"), "America/New_York")?.toISOString(),
    ).toBe("2026-11-01T04:00:00.000Z");
  });

  it("is correct on a spring-forward day (offset changes from -5 to -4 mid-day)", () => {
    // America/New_York springs forward 2026-03-08 02:00 EST -> 03:00 EDT. Local midnight is
    // still EST (00:00 EST-5 = 05:00Z). The naive constant-offset estimate would land at 04:00Z.
    expect(
      startOfZonedDay(new Date("2026-03-08T12:00:00.000Z"), "America/New_York")?.toISOString(),
    ).toBe("2026-03-08T05:00:00.000Z");
  });

  it("returns null for an invalid timezone", () => {
    expect(startOfZonedDay(new Date("2026-06-05T00:00:00.000Z"), "Not/AZone")).toBeNull();
  });
});

describe("GROUNDING_EXERCISE_NAMES parity", () => {
  it("matches the canonical grounding slugs (drift guard for #24)", () => {
    expect([...GROUNDING_EXERCISE_NAMES].sort()).toEqual([...groundingSlugs].sort());
  });
});

describe("buildExpoPushMessage", () => {
  it("builds an Expo push message with the target's url in data", () => {
    expect(buildExpoPushMessage("ExponentPushToken[x]", "mood", { title: "T", body: "B" })).toEqual(
      {
        to: "ExponentPushToken[x]",
        title: "T",
        body: "B",
        sound: "default",
        data: { url: "/tools/mood-tracker" },
      },
    );
  });
});

describe("classifyExpoTicket", () => {
  it("flags DeviceNotRegistered tickets for removal", () => {
    expect(
      classifyExpoTicket({ status: "error", details: { error: "DeviceNotRegistered" } }),
    ).toEqual({ ok: false, removeToken: true });
  });
  it("treats other errors as transient (no removal)", () => {
    expect(
      classifyExpoTicket({ status: "error", details: { error: "MessageRateExceeded" } }),
    ).toEqual({ ok: false, removeToken: false });
  });
  it("treats ok tickets as success", () => {
    expect(classifyExpoTicket({ status: "ok", id: "r1" })).toEqual({
      ok: true,
      removeToken: false,
    });
  });
});

describe("resolveReminderLanguage", () => {
  it.each([
    ["bg", "bg"],
    ["bg-BG", "bg"],
    ["en", "en"],
    ["en-US", "en"],
    [null, "en"],
    ["fr", "en"],
  ])("maps %s -> %s", (input, expected) => {
    expect(resolveReminderLanguage(input)).toBe(expected);
  });
});

describe("classifyPushError", () => {
  it.each([
    [404, true],
    [410, true],
    [500, false],
    [429, false],
  ])("statusCode %s -> expired %s", (code, expired) => {
    expect(classifyPushError({ statusCode: code })).toEqual({ statusCode: code, expired });
  });

  it("treats an unknown error shape as non-expired with null status", () => {
    expect(classifyPushError(new Error("boom"))).toEqual({ statusCode: null, expired: false });
  });
});
