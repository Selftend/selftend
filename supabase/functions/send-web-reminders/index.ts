import { createClient } from "npm:@supabase/supabase-js@2.103.2";
import webpush from "npm:web-push@3.6.7";
import bgCbt from "../../../src/i18n/locales/bg/cbt.json" with { type: "json" };
import enCbt from "../../../src/i18n/locales/en/cbt.json" with { type: "json" };

interface WebPushSubscriptionRow {
  auth: string;
  endpoint: string;
  failure_count: number;
  id: string;
  last_reminder_key: string | null;
  p256dh: string;
  time_zone: string | null;
  user_id: string;
}

interface UserPreferenceRow {
  cbt_reminder_hour: number;
  cbt_reminder_minute: number;
  cbt_reminder_timezone: string | null;
  cbt_reminders_enabled: boolean;
  language: string | null;
  reminder_consent: boolean;
  user_id: string;
}

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
const notificationCopyByLanguage = {
  bg: bgCbt.notifications,
  en: enCbt.notifications,
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

function isReminderDue(
  subscription: WebPushSubscriptionRow,
  preferences: UserPreferenceRow,
  now: Date,
) {
  const timeZone = subscription.time_zone ?? preferences.cbt_reminder_timezone ?? "UTC";
  const parts = getZonedParts(now, timeZone);
  if (!parts) {
    return null;
  }

  const reminderKey = `${parts.year}-${parts.month}-${parts.day}`;
  if (subscription.last_reminder_key === reminderKey) {
    return null;
  }

  if (parts.hour !== preferences.cbt_reminder_hour) {
    return null;
  }

  if (
    parts.minute < preferences.cbt_reminder_minute ||
    parts.minute >= preferences.cbt_reminder_minute + 5
  ) {
    return null;
  }

  return reminderKey;
}

function getNotificationCopy(language: string | null) {
  return language?.toLowerCase().startsWith("bg")
    ? notificationCopyByLanguage.bg
    : notificationCopyByLanguage.en;
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
      .select("id,user_id,endpoint,p256dh,auth,time_zone,last_reminder_key,failure_count")
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
        "user_id,reminder_consent,cbt_reminders_enabled,cbt_reminder_hour,cbt_reminder_minute,cbt_reminder_timezone,language",
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
      if (!preferences?.reminder_consent || !preferences.cbt_reminders_enabled) {
        continue;
      }

      const reminderKey = isReminderDue(subscription, preferences, now);
      if (!reminderKey) {
        continue;
      }
      const copy = getNotificationCopy(preferences.language);

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
            tag: "selftend-cbt-reminder",
            title: copy.title,
            url: "/cbt",
          }),
        );

        await supabase
          .from("web_push_subscriptions")
          .update({
            failure_count: 0,
            last_failure_at: null,
            last_reminder_key: reminderKey,
            last_success_at: now.toISOString(),
          })
          .eq("id", subscription.id);
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
