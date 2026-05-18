import { createClient } from "npm:@supabase/supabase-js@2.103.2";
import webpush from "npm:web-push@3.6.7";
import bgCbt from "../../../src/i18n/locales/bg/cbt.json" with { type: "json" };
import enCbt from "../../../src/i18n/locales/en/cbt.json" with { type: "json" };
import bgAct from "../../../src/i18n/locales/bg/act.json" with { type: "json" };
import enAct from "../../../src/i18n/locales/en/act.json" with { type: "json" };
import bgMeditation from "../../../src/i18n/locales/bg/meditation.json" with { type: "json" };
import enMeditation from "../../../src/i18n/locales/en/meditation.json" with { type: "json" };

type ReminderTarget = "cbt" | "meditation" | "act";

interface WebPushSubscriptionRow {
  auth: string;
  endpoint: string;
  failure_count: number;
  id: string;
  last_cbt_reminder_key: string | null;
  last_meditation_reminder_key: string | null;
  last_act_reminder_key: string | null;
  p256dh: string;
  time_zone: string | null;
  user_id: string;
}

interface UserPreferenceRow {
  user_id: string;
  notifications_enabled_global: boolean | null;
  reminder_consent: boolean;
  language: string | null;
  cbt_reminders_enabled: boolean;
  cbt_reminder_hour: number;
  cbt_reminder_minute: number;
  cbt_reminder_timezone: string | null;
  meditation_reminders_enabled: boolean;
  meditation_reminder_hour: number;
  meditation_reminder_minute: number;
  meditation_reminder_timezone: string | null;
  act_reminders_enabled: boolean;
  act_reminder_hour: number;
  act_reminder_minute: number;
  act_reminder_timezone: string | null;
}

interface TargetConfig {
  enabledField: keyof UserPreferenceRow;
  hourField: keyof UserPreferenceRow;
  minuteField: keyof UserPreferenceRow;
  timezoneField: keyof UserPreferenceRow;
  lastKeyField: keyof WebPushSubscriptionRow;
  url: string;
  tag: string;
}

const TARGET_CONFIGS: Record<ReminderTarget, TargetConfig> = {
  cbt: {
    enabledField: "cbt_reminders_enabled",
    hourField: "cbt_reminder_hour",
    minuteField: "cbt_reminder_minute",
    timezoneField: "cbt_reminder_timezone",
    lastKeyField: "last_cbt_reminder_key",
    url: "/modules/cbt",
    tag: "selftend-cbt-reminder",
  },
  meditation: {
    enabledField: "meditation_reminders_enabled",
    hourField: "meditation_reminder_hour",
    minuteField: "meditation_reminder_minute",
    timezoneField: "meditation_reminder_timezone",
    lastKeyField: "last_meditation_reminder_key",
    url: "/tools/meditation",
    tag: "selftend-meditation-reminder",
  },
  act: {
    enabledField: "act_reminders_enabled",
    hourField: "act_reminder_hour",
    minuteField: "act_reminder_minute",
    timezoneField: "act_reminder_timezone",
    lastKeyField: "last_act_reminder_key",
    url: "/modules/act",
    tag: "selftend-act-reminder",
  },
};

const TARGETS: ReminderTarget[] = ["cbt", "meditation", "act"];

const notificationCopyByLanguage: Record<
  "bg" | "en",
  Record<ReminderTarget, { title: string; body: string }>
> = {
  bg: {
    cbt: bgCbt.notifications,
    meditation: bgMeditation.notifications,
    act: bgAct.notifications,
  },
  en: {
    cbt: enCbt.notifications,
    meditation: enMeditation.notifications,
    act: enAct.notifications,
  },
};

interface ZonedParts {
  day: string;
  hour: number;
  minute: number;
  month: string;
  year: string;
}

const jsonHeaders = {
  "Content-Type": "application/json",
};

function requiredEnv(name: string) {
  const value = Deno.env.get(name);
  if (!value) {
    throw new Error(`Missing ${name}`);
  }
  return value;
}

function getZonedParts(date: Date, timeZone: string): ZonedParts | null {
  try {
    const formatter = new Intl.DateTimeFormat("en-CA", {
      day: "2-digit",
      hour: "2-digit",
      hour12: false,
      minute: "2-digit",
      month: "2-digit",
      timeZone,
      year: "numeric",
    });
    const parts = Object.fromEntries(
      formatter.formatToParts(date).map((part) => [part.type, part.value]),
    );

    return {
      day: parts.day,
      hour: Number(parts.hour),
      minute: Number(parts.minute),
      month: parts.month,
      year: parts.year,
    };
  } catch {
    return null;
  }
}

function reminderKeyIfDue(
  target: ReminderTarget,
  subscription: WebPushSubscriptionRow,
  preferences: UserPreferenceRow,
  now: Date,
): string | null {
  const config = TARGET_CONFIGS[target];
  if (!preferences[config.enabledField]) return null;

  const timeZone =
    subscription.time_zone ?? (preferences[config.timezoneField] as string | null) ?? "UTC";
  const parts = getZonedParts(now, timeZone);
  if (!parts) return null;

  const reminderKey = `${parts.year}-${parts.month}-${parts.day}`;
  if (subscription[config.lastKeyField] === reminderKey) return null;

  const targetHour = preferences[config.hourField] as number;
  const targetMinute = preferences[config.minuteField] as number;

  if (parts.hour !== targetHour) return null;
  if (parts.minute < targetMinute || parts.minute >= targetMinute + 5) return null;

  return reminderKey;
}

function getNotificationCopy(language: string | null, target: ReminderTarget) {
  const lang = language?.toLowerCase().startsWith("bg") ? "bg" : "en";
  return notificationCopyByLanguage[lang][target];
}

Deno.serve(async (request) => {
  try {
    const cronSecret = requiredEnv("WEB_PUSH_CRON_SECRET");
    if (request.headers.get("x-selftend-cron-secret") !== cronSecret) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        headers: jsonHeaders,
        status: 401,
      });
    }

    webpush.setVapidDetails(
      requiredEnv("WEB_PUSH_VAPID_SUBJECT"),
      requiredEnv("WEB_PUSH_VAPID_PUBLIC_KEY"),
      requiredEnv("WEB_PUSH_VAPID_PRIVATE_KEY"),
    );

    const supabase = createClient(
      requiredEnv("SUPABASE_URL"),
      requiredEnv("SUPABASE_SERVICE_ROLE_KEY"),
    );
    const now = new Date();
    const { data: subscriptions, error: subscriptionError } = await supabase
      .from("web_push_subscriptions")
      .select(
        "id,user_id,endpoint,p256dh,auth,time_zone,last_cbt_reminder_key,last_meditation_reminder_key,last_act_reminder_key,failure_count",
      )
      .eq("enabled", true);

    if (subscriptionError) {
      throw subscriptionError;
    }

    const userIds = [...new Set((subscriptions ?? []).map((subscription) => subscription.user_id))];
    if (userIds.length === 0) {
      return new Response(JSON.stringify({ sent: 0 }), { headers: jsonHeaders });
    }

    const { data: preferencesRows, error: preferencesError } = await supabase
      .from("user_preferences")
      .select(
        [
          "user_id",
          "notifications_enabled_global",
          "reminder_consent",
          "language",
          "cbt_reminders_enabled",
          "cbt_reminder_hour",
          "cbt_reminder_minute",
          "cbt_reminder_timezone",
          "meditation_reminders_enabled",
          "meditation_reminder_hour",
          "meditation_reminder_minute",
          "meditation_reminder_timezone",
          "act_reminders_enabled",
          "act_reminder_hour",
          "act_reminder_minute",
          "act_reminder_timezone",
        ].join(","),
      )
      .in("user_id", userIds);

    if (preferencesError) {
      throw preferencesError;
    }

    const preferencesByUser = new Map(
      ((preferencesRows ?? []) as UserPreferenceRow[]).map((preferences) => [
        preferences.user_id,
        preferences,
      ]),
    );
    let sent = 0;
    let disabled = 0;

    for (const subscription of (subscriptions ?? []) as WebPushSubscriptionRow[]) {
      const preferences = preferencesByUser.get(subscription.user_id);
      if (!preferences) continue;
      if (preferences.notifications_enabled_global === false) continue;
      if (!preferences.reminder_consent) continue;

      let subscriptionDisabled = false;
      for (const target of TARGETS) {
        if (subscriptionDisabled) break;

        const reminderKey = reminderKeyIfDue(target, subscription, preferences, now);
        if (!reminderKey) continue;

        const config = TARGET_CONFIGS[target];
        const copy = getNotificationCopy(preferences.language, target);

        try {
          await webpush.sendNotification(
            {
              endpoint: subscription.endpoint,
              keys: {
                auth: subscription.auth,
                p256dh: subscription.p256dh,
              },
            },
            JSON.stringify({
              body: copy.body,
              tag: config.tag,
              title: copy.title,
              url: config.url,
            }),
          );

          await supabase
            .from("web_push_subscriptions")
            .update({
              failure_count: 0,
              last_failure_at: null,
              [config.lastKeyField]: reminderKey,
              last_success_at: now.toISOString(),
            })
            .eq("id", subscription.id);

          // Keep the local copy in sync so a second target in the same loop
          // also sees the freshly written key.
          (subscription as unknown as Record<string, unknown>)[config.lastKeyField] = reminderKey;
          sent += 1;
        } catch (error) {
          const statusCode =
            error && typeof error === "object" && "statusCode" in error
              ? Number(error.statusCode)
              : null;
          const expired = statusCode === 404 || statusCode === 410;
          const nextFailureCount = subscription.failure_count + 1;

          await supabase
            .from("web_push_subscriptions")
            .update({
              enabled: expired ? false : true,
              failure_count: nextFailureCount,
              last_failure_at: now.toISOString(),
            })
            .eq("id", subscription.id);

          if (expired) {
            disabled += 1;
            subscriptionDisabled = true;
          }
        }
      }
    }

    return new Response(JSON.stringify({ disabled, sent }), { headers: jsonHeaders });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: message }), {
      headers: jsonHeaders,
      status: 500,
    });
  }
});
