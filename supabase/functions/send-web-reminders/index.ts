import { createClient } from "npm:@supabase/supabase-js@2.103.2";
import webpush from "npm:web-push@3.6.7";
import bgNotifications from "../../../src/i18n/locales/bg/notifications.json" with { type: "json" };
import enNotifications from "../../../src/i18n/locales/en/notifications.json" with { type: "json" };
import {
  activityWindowForTarget,
  classifyPushError,
  isAllowedPushEndpoint,
  buildExpoPushMessage,
  classifyExpoTicket,
  reminderKeyIfDue,
  resolveReminderLanguage,
  TARGET_CONFIGS,
  TARGETS,
  type ExpoPushMessage,
  type ExpoTicket,
  type ReminderTarget,
  type UserPreferenceRow,
  type WebPushSubscriptionRow,
} from "../_shared/web-reminders.ts";

// Notification copy is centralized in the `notifications` namespace under `copy.<target>`.
const notificationCopyByLanguage: Record<
  "bg" | "en",
  Record<ReminderTarget, { title: string; body: string }>
> = {
  bg: bgNotifications.copy as Record<ReminderTarget, { title: string; body: string }>,
  en: enNotifications.copy as Record<ReminderTarget, { title: string; body: string }>,
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

type TokenRow = WebPushSubscriptionRow & { expo_push_token: string };

// PostgREST caps a single response at ~1000 rows, so an unbounded .select() silently drops
// everyone past the first page (#25). Page through with .range() until a short page returns.
const PAGE_SIZE = 1000;
async function fetchAllPaged(
  buildQuery: (from: number, to: number) => PromiseLike<{ data: unknown[] | null; error: unknown }>,
): Promise<unknown[]> {
  const rows: unknown[] = [];
  for (let from = 0; ; from += PAGE_SIZE) {
    const { data, error } = await buildQuery(from, from + PAGE_SIZE - 1);
    if (error) throw error;
    const page = data ?? [];
    rows.push(...page);
    if (page.length < PAGE_SIZE) break;
  }
  return rows;
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

    const subscriptions = (await fetchAllPaged((from, to) =>
      supabase
        .from("web_push_subscriptions")
        .select(
          "id,user_id,endpoint,p256dh,auth,time_zone,last_cbt_reminder_key,last_meditation_reminder_key,last_act_reminder_key,last_mood_reminder_key,last_journal_reminder_key,last_gratitude_reminder_key,last_grounding_reminder_key,last_breathing_reminder_key,last_sleep_reminder_key,last_habits_reminder_key,failure_count",
        )
        .eq("enabled", true)
        .range(from, to),
    )) as WebPushSubscriptionRow[];

    // Native (Expo) device tokens, fetched HERE — before the user-set is built and unfiltered
    // by user_id — so a native-only user (no web push subscription) still receives reminders
    // (#1). A failed fetch now throws via fetchAllPaged instead of being silently ignored (#19).
    const tokenRows = (await fetchAllPaged((from, to) =>
      supabase
        .from("device_push_tokens")
        .select(
          "id,user_id,expo_push_token,time_zone,failure_count,last_cbt_reminder_key,last_meditation_reminder_key,last_act_reminder_key,last_mood_reminder_key,last_journal_reminder_key,last_gratitude_reminder_key,last_grounding_reminder_key,last_breathing_reminder_key,last_sleep_reminder_key,last_habits_reminder_key",
        )
        .eq("enabled", true)
        .range(from, to),
    )) as TokenRow[];

    const userIds = [
      ...new Set([
        ...subscriptions.map((subscription) => subscription.user_id),
        ...tokenRows.map((token) => token.user_id),
      ]),
    ];
    if (userIds.length === 0) {
      return new Response(JSON.stringify({ sent: 0 }), { headers: jsonHeaders });
    }

    const PREFERENCE_COLUMNS = [
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
      "mood_reminders_enabled",
      "mood_reminder_hour",
      "mood_reminder_minute",
      "mood_reminder_timezone",
      "journal_reminders_enabled",
      "journal_reminder_hour",
      "journal_reminder_minute",
      "journal_reminder_timezone",
      "gratitude_reminders_enabled",
      "gratitude_reminder_hour",
      "gratitude_reminder_minute",
      "gratitude_reminder_timezone",
      "grounding_reminders_enabled",
      "grounding_reminder_hour",
      "grounding_reminder_minute",
      "grounding_reminder_timezone",
      "breathing_reminders_enabled",
      "breathing_reminder_hour",
      "breathing_reminder_minute",
      "breathing_reminder_timezone",
      "sleep_reminders_enabled",
      "sleep_reminder_hour",
      "sleep_reminder_minute",
      "sleep_reminder_timezone",
      "habits_reminders_enabled",
      "habits_reminder_hour",
      "habits_reminder_minute",
      "habits_reminder_timezone",
    ].join(",");

    // Preferences for the full union, chunked so neither the IN-list nor the response exceeds
    // PostgREST limits (#25).
    const preferencesRows: UserPreferenceRow[] = [];
    for (let i = 0; i < userIds.length; i += PAGE_SIZE) {
      const chunk = userIds.slice(i, i + PAGE_SIZE);
      const chunkRows = (await fetchAllPaged((from, to) =>
        supabase
          .from("user_preferences")
          .select(PREFERENCE_COLUMNS)
          .in("user_id", chunk)
          .range(from, to),
      )) as UserPreferenceRow[];
      preferencesRows.push(...chunkRows);
    }

    const preferencesByUser = new Map(
      preferencesRows.map((preferences) => [preferences.user_id, preferences]),
    );
    let sent = 0;
    let disabled = 0;

    for (const subscription of subscriptions) {
      const preferences = preferencesByUser.get(subscription.user_id);
      if (!preferences) continue;
      if (preferences.notifications_enabled_global === false) continue;
      if (!preferences.reminder_consent) continue;
      // SSRF guard: never POST to an endpoint that isn't a real push service (the table's
      // RLS does not constrain endpoint, so it can be attacker-controlled).
      if (!isAllowedPushEndpoint(subscription.endpoint)) {
        console.warn(
          "send-web-reminders: skipping subscription with non-allowlisted endpoint",
          subscription.id,
        );
        continue;
      }

      let subscriptionDisabled = false;
      for (const target of TARGETS) {
        if (subscriptionDisabled) break;

        const reminderKey = reminderKeyIfDue(target, subscription, preferences, now);
        if (!reminderKey) continue;

        const config = TARGET_CONFIGS[target];

        // Smart suppression (web-only): if the user already used this tool today in their
        // timezone, skip the push but stamp the key so we don't re-check it every cron tick.
        const activityTimeZone =
          subscription.time_zone ?? (preferences[config.timezoneField] as string | null) ?? "UTC";
        const activityWindow = activityWindowForTarget(target, activityTimeZone, now);
        if (activityWindow) {
          let activityQuery = supabase
            .from(activityWindow.table)
            .select("id")
            .eq("user_id", subscription.user_id)
            .limit(1);
          activityQuery =
            activityWindow.op === "eq"
              ? activityQuery.eq(activityWindow.column, activityWindow.value)
              : activityQuery.gte(activityWindow.column, activityWindow.value);
          // Secondary IN-filter for tables shared across tools (grounding in mindfulness_sessions).
          if (activityWindow.inColumn && activityWindow.inValues) {
            activityQuery = activityQuery.in(activityWindow.inColumn, [...activityWindow.inValues]);
          }
          const { data: activityRows, error: activityError } = await activityQuery;
          // #24: surface the activity-lookup error instead of silently discarding it (a swallowed
          // error here means suppression silently never runs and the user is over-notified).
          if (activityError) {
            console.error(
              "send-web-reminders: activity lookup failed",
              { target, table: activityWindow.table },
              activityError,
            );
          } else if ((activityRows?.length ?? 0) > 0) {
            await supabase
              .from("web_push_subscriptions")
              .update({ [config.lastKeyField]: reminderKey })
              .eq("id", subscription.id);
            (subscription as unknown as Record<string, unknown>)[config.lastKeyField] = reminderKey;
            continue;
          }
        }

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

    // ----- Native (Expo) push tokens -----
    // Same due/suppression logic as web, delivered to every registered device via Expo Push.
    // tokenRows was fetched up front (unfiltered by user) so native-only users are covered (#1).
    const pushMessages: {
      msg: ExpoPushMessage;
      row: TokenRow;
      target: ReminderTarget;
      key: string;
    }[] = [];

    for (const row of tokenRows) {
      const preferences = preferencesByUser.get(row.user_id);
      if (!preferences) continue;
      if (preferences.notifications_enabled_global === false) continue;
      if (!preferences.reminder_consent) continue;

      for (const target of TARGETS) {
        const reminderKey = reminderKeyIfDue(target, row, preferences, now);
        if (!reminderKey) continue;

        const config = TARGET_CONFIGS[target];
        const timeZone =
          row.time_zone ?? (preferences[config.timezoneField] as string | null) ?? "UTC";
        const activityWindow = activityWindowForTarget(target, timeZone, now);
        if (activityWindow) {
          let activityQuery = supabase
            .from(activityWindow.table)
            .select("id")
            .eq("user_id", row.user_id)
            .limit(1);
          activityQuery =
            activityWindow.op === "eq"
              ? activityQuery.eq(activityWindow.column, activityWindow.value)
              : activityQuery.gte(activityWindow.column, activityWindow.value);
          if (activityWindow.inColumn && activityWindow.inValues) {
            activityQuery = activityQuery.in(activityWindow.inColumn, [...activityWindow.inValues]);
          }
          const { data: usedRows, error: usedError } = await activityQuery;
          // #24: surface the lookup error rather than silently treating it as "no activity".
          if (usedError) {
            console.error(
              "send-web-reminders: activity lookup failed (native)",
              { target, table: activityWindow.table },
              usedError,
            );
          } else if ((usedRows?.length ?? 0) > 0) {
            await supabase
              .from("device_push_tokens")
              .update({ [config.lastKeyField]: reminderKey })
              .eq("id", row.id);
            (row as unknown as Record<string, unknown>)[config.lastKeyField] = reminderKey;
            continue;
          }
        }

        const copy = getNotificationCopy(preferences.language, target);
        pushMessages.push({
          msg: buildExpoPushMessage(row.expo_push_token, target, copy),
          row,
          target,
          key: reminderKey,
        });
      }
    }

    // Batch (Expo allows up to 100/request) and act on each per-message ticket.
    for (let i = 0; i < pushMessages.length; i += 100) {
      const batch = pushMessages.slice(i, i + 100);
      let tickets: ExpoTicket[] = [];
      try {
        const response = await fetch("https://exp.host/--/api/v2/push/send", {
          method: "POST",
          headers: { "Content-Type": "application/json", Accept: "application/json" },
          body: JSON.stringify(batch.map((entry) => entry.msg)),
        });
        const body = await response.json();
        tickets = (body.data ?? []) as ExpoTicket[];
      } catch (error) {
        console.error("send-web-reminders: expo push batch failed", error);
        continue; // transient; retried next cron tick (keys not stamped)
      }

      for (let j = 0; j < batch.length; j++) {
        const { row, target, key } = batch[j];
        const verdict = classifyExpoTicket(tickets[j] ?? { status: "error" });
        const config = TARGET_CONFIGS[target];
        if (verdict.ok) {
          await supabase
            .from("device_push_tokens")
            .update({
              [config.lastKeyField]: key,
              failure_count: 0,
              last_success_at: now.toISOString(),
            })
            .eq("id", row.id);
          (row as unknown as Record<string, unknown>)[config.lastKeyField] = key;
          sent += 1;
        } else if (verdict.removeToken) {
          await supabase.from("device_push_tokens").delete().eq("id", row.id);
          disabled += 1;
        } else {
          await supabase
            .from("device_push_tokens")
            .update({ failure_count: row.failure_count + 1, last_failure_at: now.toISOString() })
            .eq("id", row.id);
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
