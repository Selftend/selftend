import {
  classifyPushError,
  getZonedParts,
  reminderKeyIfDue,
  resolveReminderLanguage,
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

describe("getZonedParts", () => {
  it("formats a date into zoned parts for a valid timezone", () => {
    const parts = getZonedParts(new Date("2026-05-24T09:03:00.000Z"), "UTC");
    expect(parts).toEqual({ year: "2026", month: "05", day: "24", hour: 9, minute: 3 });
  });

  it("returns null for an invalid timezone", () => {
    expect(getZonedParts(new Date("2026-05-24T09:00:00.000Z"), "Not/AZone")).toBeNull();
  });

  it("returns hour 24 (not 0) at midnight — known Intl 1-24 clock quirk, documented not endorsed", () => {
    // Intl.DateTimeFormat({ hour12: false }) yields the 1-24 clock, so 00:0x -> "24".
    // Downstream effect: a reminder set for hour 0 (midnight) never matches
    // (parts.hour 24 !== targetHour 0). This is a pre-existing bug flagged for a
    // separate fix; NOT changed here per the Phase 2 no-product-behavior-change rule.
    expect(getZonedParts(new Date("2026-05-24T00:03:00.000Z"), "UTC")?.hour).toBe(24);
  });
});

describe("reminderKeyIfDue", () => {
  const now = new Date("2026-05-24T09:02:00.000Z"); // 09:02 UTC, inside the 09:00–09:05 window

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
