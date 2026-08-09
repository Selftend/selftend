import { groundingSlugs } from "@/src/constants/grounding";

import {
  activityWindowForTarget,
  buildExpoPushMessage,
  buildRoutineExpoPushMessage,
  classifyExpoTicket,
  classifyPushError,
  getZonedParts,
  GROUNDING_EXERCISE_NAMES,
  isAllowedPushEndpoint,
  nextRoutineReminderKeys,
  reminderKeyIfDue,
  resolveReminderLanguage,
  routineNotificationCopy,
  routineReminderKeyIfDue,
  routineTag,
  routineUrl,
  startOfZonedDay,
  fetchAllPaged,
  PAGE_SIZE,
  type PagedQuery,
  type RoutineReminderRow,
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

describe("routineReminderKeyIfDue (#47 - per-routine fan-out)", () => {
  const baseRoutine: RoutineReminderRow = {
    id: "r1",
    user_id: "u1",
    name: "Morning reset",
    reminder_enabled: true,
    reminder_hour: 9,
    reminder_minute: 0,
    reminder_timezone: "UTC",
  };
  const baseChannel = { time_zone: "UTC", last_routine_reminder_keys: null };
  const now = new Date("2026-05-24T09:02:00.000Z"); // inside the 09:00-09:05 window

  it("returns the day key when due inside the 5-minute window", () => {
    expect(routineReminderKeyIfDue(baseRoutine, baseChannel, now)).toBe("2026-05-24");
  });

  it("returns null when the routine reminder is disabled (opt-in gate)", () => {
    expect(
      routineReminderKeyIfDue({ ...baseRoutine, reminder_enabled: false }, baseChannel, now),
    ).toBeNull();
  });

  it("returns null when hour/minute were never configured", () => {
    expect(
      routineReminderKeyIfDue({ ...baseRoutine, reminder_hour: null }, baseChannel, now),
    ).toBeNull();
    expect(
      routineReminderKeyIfDue({ ...baseRoutine, reminder_minute: null }, baseChannel, now),
    ).toBeNull();
  });

  it("returns null when this routine is already stamped today (<= 1/routine/day per channel)", () => {
    const channel = { time_zone: "UTC", last_routine_reminder_keys: { r1: "2026-05-24" } };
    expect(routineReminderKeyIfDue(baseRoutine, channel, now)).toBeNull();
  });

  it("another routine's stamp does not suppress this routine", () => {
    const channel = { time_zone: "UTC", last_routine_reminder_keys: { other: "2026-05-24" } };
    expect(routineReminderKeyIfDue(baseRoutine, channel, now)).toBe("2026-05-24");
  });

  it("returns null outside the window and at/after the upper boundary", () => {
    expect(
      routineReminderKeyIfDue(baseRoutine, baseChannel, new Date("2026-05-24T10:02:00.000Z")),
    ).toBeNull();
    expect(
      routineReminderKeyIfDue(baseRoutine, baseChannel, new Date("2026-05-24T09:05:00.000Z")),
    ).toBeNull();
  });

  it("spans the hour boundary for target minutes 56-59 (same */5 cron fix as tools)", () => {
    const routine = { ...baseRoutine, reminder_hour: 9, reminder_minute: 58 };
    expect(
      routineReminderKeyIfDue(routine, baseChannel, new Date("2026-05-24T10:00:00.000Z")),
    ).toBe("2026-05-24");
    expect(
      routineReminderKeyIfDue(routine, baseChannel, new Date("2026-05-24T09:55:00.000Z")),
    ).toBeNull();
  });

  it("falls back to the routine timezone when the channel has none, then UTC", () => {
    // 09:02 UTC == 12:02 in Europe/Sofia (UTC+3 in May); routine set for 12:00 Sofia is due.
    const channel = { time_zone: null, last_routine_reminder_keys: null };
    expect(
      routineReminderKeyIfDue(
        { ...baseRoutine, reminder_hour: 12, reminder_timezone: "Europe/Sofia" },
        channel,
        now,
      ),
    ).toBe("2026-05-24");
    expect(routineReminderKeyIfDue({ ...baseRoutine, reminder_timezone: null }, channel, now)).toBe(
      "2026-05-24",
    );
  });

  it("prefers the channel timezone over the routine timezone (same precedence as tools)", () => {
    // Channel tz Sofia: 09:02 UTC is 12:02 local, so a 09:00 routine is NOT due.
    const channel = { time_zone: "Europe/Sofia", last_routine_reminder_keys: null };
    expect(routineReminderKeyIfDue(baseRoutine, channel, now)).toBeNull();
  });

  it("returns null for an invalid timezone", () => {
    expect(
      routineReminderKeyIfDue(
        { ...baseRoutine, reminder_timezone: "Not/AZone" },
        { time_zone: null, last_routine_reminder_keys: null },
        now,
      ),
    ).toBeNull();
  });

  it("fires a midnight (hour 0) routine reminder (Intl 1-24 clock normalization)", () => {
    expect(
      routineReminderKeyIfDue(
        { ...baseRoutine, reminder_hour: 0 },
        baseChannel,
        new Date("2026-05-24T00:02:00.000Z"),
      ),
    ).toBe("2026-05-24");
  });

  describe("schedule gate (#113 - cadence-aware suppression)", () => {
    // Anchor dates (all 09:02 UTC, inside the 09:00-09:05 window):
    // 2026-05-23 Sat, 2026-05-25 Mon, 2026-05-27 Wed, 2026-05-28 Thu.
    const monday = new Date("2026-05-25T09:02:00.000Z");
    const saturday = new Date("2026-05-23T09:02:00.000Z");

    it("weekdays routine is due on Monday but not on Saturday", () => {
      const routine = { ...baseRoutine, cadence: "weekdays" as const };
      expect(routineReminderKeyIfDue(routine, baseChannel, monday)).toBe("2026-05-25");
      expect(routineReminderKeyIfDue(routine, baseChannel, saturday)).toBeNull();
    });

    it("custom routine is due only on its custom_days (Mon+Wed: due Wed, not Thu)", () => {
      const routine = { ...baseRoutine, cadence: "custom" as const, custom_days: [1, 3] };
      expect(
        routineReminderKeyIfDue(routine, baseChannel, new Date("2026-05-27T09:02:00.000Z")),
      ).toBe("2026-05-27");
      expect(
        routineReminderKeyIfDue(routine, baseChannel, new Date("2026-05-28T09:02:00.000Z")),
      ).toBeNull();
    });

    it("on-demand routine is never due, even inside the window on any day", () => {
      const routine = { ...baseRoutine, cadence: "on-demand" as const };
      expect(routineReminderKeyIfDue(routine, baseChannel, now)).toBeNull();
      expect(routineReminderKeyIfDue(routine, baseChannel, monday)).toBeNull();
      expect(routineReminderKeyIfDue(routine, baseChannel, saturday)).toBeNull();
    });

    it("daily routine fires on any day (weekend included)", () => {
      const routine = { ...baseRoutine, cadence: "daily" as const };
      expect(routineReminderKeyIfDue(routine, baseChannel, monday)).toBe("2026-05-25");
      expect(routineReminderKeyIfDue(routine, baseChannel, saturday)).toBe("2026-05-23");
    });

    it("uses the LOCAL weekday, not the UTC one (late-UTC Friday = Auckland Saturday)", () => {
      // 2026-05-22T13:02Z (Friday in UTC) is already Saturday 01:02 in
      // Pacific/Auckland (NZST, UTC+12 in May). A weekdays routine set for
      // 01:00 local must be suppressed; a daily one proves the window matched
      // and stamps the LOCAL Saturday day key.
      const lateUtcFriday = new Date("2026-05-22T13:02:00.000Z");
      const channel = { time_zone: "Pacific/Auckland", last_routine_reminder_keys: null };
      const routine = { ...baseRoutine, reminder_hour: 1, reminder_minute: 0 };
      expect(
        routineReminderKeyIfDue({ ...routine, cadence: "weekdays" }, channel, lateUtcFriday),
      ).toBeNull();
      expect(
        routineReminderKeyIfDue({ ...routine, cadence: "daily" }, channel, lateUtcFriday),
      ).toBe("2026-05-23");
    });

    it("gates on the TARGET day when the due window crosses midnight (Fri 23:58 → Sat 00:00)", () => {
      // A 23:58 target is never hit by the */5 cron before midnight (ticks at
      // :55, :00), so it intentionally fires at the next day's 00:00 tick. That
      // occurrence belongs to FRIDAY, so a weekdays routine is due even though
      // the send-day is Saturday.
      const routine = {
        ...baseRoutine,
        cadence: "weekdays" as const,
        reminder_hour: 23,
        reminder_minute: 58,
      };
      expect(
        routineReminderKeyIfDue(routine, baseChannel, new Date("2026-05-23T00:00:00.000Z")),
      ).toBe("2026-05-23");
      expect(
        routineReminderKeyIfDue(routine, baseChannel, new Date("2026-05-23T00:02:00.000Z")),
      ).toBe("2026-05-23");
    });

    it("does not fire an unscheduled Monday 23:58 target at the Tuesday 00:00 tick (custom Tue-only)", () => {
      const routine = {
        ...baseRoutine,
        cadence: "custom" as const,
        custom_days: [2],
        reminder_hour: 23,
        reminder_minute: 58,
      };
      // Tuesday 00:00: the target occurrence is Monday 23:58 - not scheduled.
      expect(
        routineReminderKeyIfDue(routine, baseChannel, new Date("2026-05-26T00:00:00.000Z")),
      ).toBeNull();
      // Wednesday 00:00: the target occurrence is Tuesday 23:58 - scheduled, due.
      expect(
        routineReminderKeyIfDue(routine, baseChannel, new Date("2026-05-27T00:00:00.000Z")),
      ).toBe("2026-05-27");
    });

    it("wraps Sunday back to Saturday for a crossed-midnight Saturday target", () => {
      // Saturday 23:58 target, evaluated at the Sunday 00:00 tick: target
      // weekday is (0 + 6) % 7 = 6 (Sat), so a Sat-only custom routine fires.
      const routine = {
        ...baseRoutine,
        cadence: "custom" as const,
        custom_days: [6],
        reminder_hour: 23,
        reminder_minute: 58,
      };
      expect(
        routineReminderKeyIfDue(routine, baseChannel, new Date("2026-05-24T00:00:00.000Z")),
      ).toBe("2026-05-24");
    });

    it("treats a missing/undefined cadence as daily (pre-#103-migration rows)", () => {
      // baseRoutine carries no cadence at all; a null cadence gets the same treatment.
      expect(routineReminderKeyIfDue(baseRoutine, baseChannel, saturday)).toBe("2026-05-23");
      expect(
        routineReminderKeyIfDue({ ...baseRoutine, cadence: null }, baseChannel, saturday),
      ).toBe("2026-05-23");
    });
  });
});

describe("nextRoutineReminderKeys", () => {
  it("stamps the routine and keeps other active routines' stamps", () => {
    expect(nextRoutineReminderKeys({ r2: "2026-05-23" }, "r1", "2026-05-24", ["r1", "r2"])).toEqual(
      { r1: "2026-05-24", r2: "2026-05-23" },
    );
  });

  it("prunes stamps for routines no longer in the active set (deleted / disabled)", () => {
    expect(
      nextRoutineReminderKeys({ gone: "2026-05-20", r1: "2026-05-23" }, "r1", "2026-05-24", ["r1"]),
    ).toEqual({ r1: "2026-05-24" });
  });

  it("handles a null map (fresh channel row)", () => {
    expect(nextRoutineReminderKeys(null, "r1", "2026-05-24", ["r1"])).toEqual({
      r1: "2026-05-24",
    });
  });
});

describe("routine url/tag helpers", () => {
  it("deep-links to the routine detail screen and tags per routine", () => {
    expect(routineUrl("abc")).toBe("/routines/abc");
    // Distinct per routine so two routines' notifications never replace each other.
    expect(routineTag("abc")).not.toBe(routineTag("def"));
  });
});

describe("routineNotificationCopy", () => {
  const routine: RoutineReminderRow = {
    id: "r1",
    user_id: "u1",
    name: "Morning reset",
    reminder_enabled: true,
    reminder_hour: 9,
    reminder_minute: 0,
    reminder_timezone: "UTC",
  };
  const fallback = { title: "Your routine", body: "A couple of small steps." };

  it("titles the notification with the routine's decrypted-view name", () => {
    expect(routineNotificationCopy(routine, fallback)).toEqual({
      title: "Morning reset",
      body: "A couple of small steps.",
    });
  });

  it("falls back to the static localized copy for a blank or missing name", () => {
    expect(routineNotificationCopy({ ...routine, name: "  " }, fallback)).toEqual(fallback);
    expect(routineNotificationCopy({ ...routine, name: null }, fallback)).toEqual(fallback);
  });
});

describe("buildRoutineExpoPushMessage", () => {
  it("builds an Expo push message deep-linking to the routine", () => {
    expect(
      buildRoutineExpoPushMessage("ExponentPushToken[x]", "r1", { title: "T", body: "B" }),
    ).toEqual({
      to: "ExponentPushToken[x]",
      title: "T",
      body: "B",
      sound: "default",
      data: { url: "/routines/r1" },
    });
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

describe("fetchAllPaged", () => {
  interface HeapRow {
    id: number;
    user_id: string;
  }

  /**
   * A table that answers `.range()` out of a mutable *heap order*, and only sorts
   * when `.order()` was called - which is exactly what Postgres does. `moveIdsToEnd`
   * simulates an `UPDATE` landing new heap tuples at the end of the table between
   * two statements of the same drain.
   */
  function makeFakeTable(
    rowCount: number,
    perturbation?: { afterStatement: number; ids: number[] },
  ) {
    let heap: HeapRow[] = Array.from({ length: rowCount }, (_, i) => ({
      id: i + 1,
      user_id: `u${i + 1}`,
    }));
    let statements = 0;
    let builds = 0;
    const orderColumns: string[] = [];

    function read(orderBy: string | null, from: number, to: number) {
      statements += 1;
      const source = orderBy
        ? [...heap].sort((a, b) => {
            const av = a[orderBy as keyof HeapRow];
            const bv = b[orderBy as keyof HeapRow];
            return typeof av === "number" && typeof bv === "number"
              ? av - bv
              : String(av).localeCompare(String(bv));
          })
        : heap;
      const page = source.slice(from, to + 1);
      if (perturbation && perturbation.afterStatement === statements) {
        const moved = heap.filter((row) => perturbation.ids.includes(row.id));
        heap = [...heap.filter((row) => !perturbation.ids.includes(row.id)), ...moved];
      }
      return page;
    }

    function build(): PagedQuery {
      builds += 1;
      let orderBy: string | null = null;
      const query: PagedQuery = {
        order(column: string) {
          orderBy = column;
          orderColumns.push(column);
          return query;
        },
        range(from: number, to: number) {
          return Promise.resolve({ data: read(orderBy, from, to), error: null });
        },
      };
      return query;
    }

    return {
      build,
      orderColumns,
      readUnordered: (from: number, to: number) => read(null, from, to),
      get builds() {
        return builds;
      },
    };
  }

  // Three pages, with a two-row UPDATE between the first and the second.
  const ROWS = PAGE_SIZE * 2 + 5;
  const PERTURBATION = { afterStatement: 1, ids: [500, 501] };

  it("reproduces #831: draining by offset alone skips rows an update moved past the boundary", async () => {
    // The control. Without an ORDER BY the drain is not merely mis-ordered - it is
    // INCOMPLETE, and this is the assertion that fails once the ordering is applied.
    const table = makeFakeTable(ROWS, PERTURBATION);
    const collected: HeapRow[] = [];
    for (let from = 0; ; from += PAGE_SIZE) {
      const page = table.readUnordered(from, from + PAGE_SIZE - 1);
      collected.push(...page);
      if (page.length < PAGE_SIZE) break;
    }

    const seen = new Set(collected.map((row) => row.id));
    expect(seen.size).toBeLessThan(ROWS);
    // The two rows that were pushed past the page-1 boundary are never returned;
    // for the cron that is a subscriber who gets no reminder for that run.
    expect(seen.has(PAGE_SIZE + 1)).toBe(false);
    expect(seen.has(PAGE_SIZE + 2)).toBe(false);
    // ...and the two the UPDATE moved are returned twice: a double push.
    expect(collected.filter((row) => row.id === 500)).toHaveLength(2);
  });

  it("returns every row exactly once despite the same mid-drain update", async () => {
    const table = makeFakeTable(ROWS, PERTURBATION);
    const rows = (await fetchAllPaged("id", table.build)) as HeapRow[];

    expect(rows).toHaveLength(ROWS);
    expect(new Set(rows.map((row) => row.id)).size).toBe(ROWS);
    expect(rows.map((row) => row.id)).toEqual(
      Array.from({ length: ROWS }, (_, index) => index + 1),
    );
  });

  it("orders by the column the caller names, on every page", async () => {
    // `user_preferences` is keyed on `user_id` and has no `id` column at all, so the
    // ordering column cannot be hardcoded here.
    const table = makeFakeTable(ROWS);
    await fetchAllPaged("user_id", table.build);

    expect(table.orderColumns).toEqual(["user_id", "user_id", "user_id"]);
  });

  it("rebuilds the query for each page, because a builder is single-use", async () => {
    const table = makeFakeTable(ROWS);
    await fetchAllPaged("id", table.build);

    expect(table.builds).toBe(3);
  });

  it("stops after one read when the first page is short", async () => {
    const table = makeFakeTable(3);
    const rows = await fetchAllPaged("id", table.build);

    expect(rows).toHaveLength(3);
    expect(table.builds).toBe(1);
  });

  it("throws the read error instead of returning a truncated drain", async () => {
    const failing = (): PagedQuery => {
      const query: PagedQuery = {
        order: () => query,
        range: () => Promise.resolve({ data: null, error: new Error("read failed") }),
      };
      return query;
    };

    await expect(fetchAllPaged("id", failing)).rejects.toThrow("read failed");
  });
});
