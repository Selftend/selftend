import { defaultUserPreferences, type UserPreferences } from "@/src/features/modules/types";
import { requireSupabase } from "@/src/lib/supabase";

interface UserPreferenceRow {
  user_id: string;
  enabled_modules: string[] | null;
  reminder_consent: boolean | null;
  cbt_reminders_enabled: boolean | null;
  cbt_reminder_hour: number | null;
  cbt_reminder_minute: number | null;
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
