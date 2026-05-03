import { defaultUserPreferences, type CookieConsent, type UserPreferences } from "@/src/features/modules/types";
import { removeCurrentUserUploadedAvatar } from "@/src/features/profile/repository";
import { requireSupabase } from "@/src/lib/supabase";

interface UserPreferenceRow {
  user_id: string;
  enabled_modules: string[] | null;
  reminder_consent: boolean | null;
  cbt_reminders_enabled: boolean | null;
  cbt_reminder_hour: number | null;
  cbt_reminder_minute: number | null;
  privacy_policy_accepted_at: string | null;
  terms_accepted_at: string | null;
  policy_version_accepted: string | null;
  cookie_consent: CookieConsent | null;
}

function mapPreferences(row?: UserPreferenceRow | null): UserPreferences {
  if (!row) {
    return defaultUserPreferences;
  }

  return {
    enabledModules: row.enabled_modules?.includes("cbt") ? ["cbt"] : ["cbt"],
    reminderConsent: Boolean(row.reminder_consent),
    cbtRemindersEnabled: Boolean(row.cbt_reminders_enabled),
    cbtReminderHour: row.cbt_reminder_hour ?? defaultUserPreferences.cbtReminderHour,
    cbtReminderMinute: row.cbt_reminder_minute ?? defaultUserPreferences.cbtReminderMinute,
    privacyPolicyAcceptedAt: row.privacy_policy_accepted_at ?? null,
    termsAcceptedAt: row.terms_accepted_at ?? null,
    policyVersionAccepted: row.policy_version_accepted ?? null,
    cookieConsent: row.cookie_consent ?? null,
  };
}

export async function getUserPreferences(userId: string) {
  const client = requireSupabase();
  const { data, error } = await client
    .from("user_preferences")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return mapPreferences(data as UserPreferenceRow | null);
}

export async function updateUserPreferences(userId: string, preferences: UserPreferences) {
  const client = requireSupabase();
  const { data, error } = await client
    .from("user_preferences")
    .upsert(
      {
        user_id: userId,
        enabled_modules: preferences.enabledModules,
        reminder_consent: preferences.reminderConsent,
        cbt_reminders_enabled: preferences.cbtRemindersEnabled,
        cbt_reminder_hour: preferences.cbtReminderHour,
        cbt_reminder_minute: preferences.cbtReminderMinute,
        privacy_policy_accepted_at: preferences.privacyPolicyAcceptedAt,
        terms_accepted_at: preferences.termsAcceptedAt,
        policy_version_accepted: preferences.policyVersionAccepted,
        cookie_consent: preferences.cookieConsent,
      },
      { onConflict: "user_id" },
    )
    .select("*")
    .single();

  if (error) {
    throw error;
  }

  return mapPreferences(data as UserPreferenceRow);
}

export async function recordPolicyConsent(userId: string, policyVersion: string) {
  const client = requireSupabase();
  const now = new Date().toISOString();
  const { error } = await client
    .from("user_preferences")
    .upsert(
      {
        user_id: userId,
        privacy_policy_accepted_at: now,
        terms_accepted_at: now,
        policy_version_accepted: policyVersion,
      },
      { onConflict: "user_id" },
    );

  if (error) {
    throw error;
  }
}

export async function deleteUserAccount() {
  const client = requireSupabase();
  await removeCurrentUserUploadedAvatar();
  const { error } = await client.rpc("delete_user_account");

  if (error) {
    throw error;
  }
}

export async function exportUserData() {
  const client = requireSupabase();
  const { data, error } = await client.rpc("export_user_data");

  if (error) {
    throw error;
  }

  return data;
}
