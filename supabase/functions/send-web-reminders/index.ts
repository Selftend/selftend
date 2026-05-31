import { createClient } from "npm:@supabase/supabase-js@2.103.2";
import webpush from "npm:web-push@3.6.7";
import bgCbt from "../../../src/i18n/locales/bg/cbt.json" with { type: "json" };
import enCbt from "../../../src/i18n/locales/en/cbt.json" with { type: "json" };
import bgAct from "../../../src/i18n/locales/bg/act.json" with { type: "json" };
import enAct from "../../../src/i18n/locales/en/act.json" with { type: "json" };
import bgMeditation from "../../../src/i18n/locales/bg/meditation.json" with { type: "json" };
import enMeditation from "../../../src/i18n/locales/en/meditation.json" with { type: "json" };
import {
  classifyPushError,
  reminderKeyIfDue,
  resolveReminderLanguage,
  TARGET_CONFIGS,
  TARGETS,
  type ReminderTarget,
  type UserPreferenceRow,
  type WebPushSubscriptionRow,
} from "../_shared/web-reminders.ts";

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

// Constant-time string comparison so the cron-secret check does not leak the secret
// via response timing. Compares full length regardless of where bytes diverge.
function timingSafeEqual(a: string, b: string): boolean {
  const encoder = new TextEncoder();
  const aBytes = encoder.encode(a);
  const bBytes = encoder.encode(b);
  const length = Math.max(aBytes.length, bBytes.length);
  let mismatch = aBytes.length ^ bBytes.length;
  for (let i = 0; i < length; i++) {
    mismatch |= (aBytes[i] ?? 0) ^ (bBytes[i] ?? 0);
  }
  return mismatch === 0;
}

function getNotificationCopy(language: string | null, target: ReminderTarget) {
  return notificationCopyByLanguage[resolveReminderLanguage(language)][target];
}

Deno.serve(async (request) => {
  try {
    const cronSecret = requiredEnv("WEB_PUSH_CRON_SECRET");
    const providedSecret = request.headers.get("x-selftend-cron-secret") ?? "";
    if (!timingSafeEqual(providedSecret, cronSecret)) {
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
          const { expired } = classifyPushError(error);
          const nextFailureCount = subscription.failure_count + 1;

          const { error: failureUpdateError } = await supabase
            .from("web_push_subscriptions")
            .update({
              enabled: expired ? false : true,
              failure_count: nextFailureCount,
              last_failure_at: now.toISOString(),
            })
            .eq("id", subscription.id);
          if (failureUpdateError) {
            console.error(
              "send-web-reminders: failed to record push failure for subscription",
              subscription.id,
              failureUpdateError,
            );
          }

          if (expired) {
            disabled += 1;
            subscriptionDisabled = true;
          }
        }
      }
    }

    return new Response(JSON.stringify({ disabled, sent }), { headers: jsonHeaders });
  } catch (error) {
    // Log the detail server-side; return a generic message so internal errors and
    // env-var names are never disclosed to callers.
    console.error("send-web-reminders failed:", error);
    return new Response(JSON.stringify({ error: "Internal error" }), {
      headers: jsonHeaders,
      status: 500,
    });
  }
});
