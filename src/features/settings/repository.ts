import {
  defaultUserPreferences,
  sanitizeEnabledModules,
  type ButtonTourKey,
  type CookieConsent,
  type ModuleKey,
  type UserPreferences,
} from "@/src/features/modules/types";
import { removeCurrentUserUploadedAvatar } from "@/src/features/profile/repository";
import { requireSupabase } from "@/src/lib/supabase";

interface UserPreferenceRow {
  user_id: string;
  enabled_modules: string[] | null;
  notifications_enabled_global: boolean | null;
  reminder_consent: boolean | null;
  reminder_consent_updated_at: string | null;
  cbt_reminders_enabled: boolean | null;
  cbt_reminder_hour: number | null;
  cbt_reminder_minute: number | null;
  cbt_reminder_timezone: string | null;
  meditation_reminders_enabled: boolean | null;
  meditation_reminder_hour: number | null;
  meditation_reminder_minute: number | null;
  meditation_reminder_timezone: string | null;
  app_onboarding_completed: boolean | null;
  cbt_onboarding_completed: boolean | null;
  cbt_wizard_completed: boolean | null;
  cbt_program_started_at: string | null;
  cbt_program_completed_at: string | null;
  cbt_program_prompt_dismissed_at: string | null;
  cbt_program_phase_index: number | null;
  cbt_program_phase_started_at: string | null;
  meditation_onboarding_completed: boolean | null;
  meditation_info_completed: boolean | null;
  gratitude_onboarding_completed: boolean | null;
  habits_onboarding_completed: boolean | null;
  mood_onboarding_completed: boolean | null;
  journal_onboarding_completed: boolean | null;
  sleep_onboarding_completed: boolean | null;
  mindfulness_onboarding_completed: boolean | null;
  grounding_onboarding_completed: boolean | null;
  act_onboarding_completed: boolean | null;
  act_reminders_enabled: boolean | null;
  act_reminder_hour: number | null;
  act_reminder_minute: number | null;
  act_reminder_timezone: string | null;
  act_program_started_at: string | null;
  act_program_completed_at: string | null;
  act_program_prompt_dismissed_at: string | null;
  act_program_phase_index: number | null;
  act_program_phase_started_at: string | null;
  privacy_policy_accepted_at: string | null;
  terms_accepted_at: string | null;
  policy_version_accepted: string | null;
  cookie_consent: CookieConsent | null;
  language: string | null;
  theme: string | null;
  selected_concerns: string[] | null;
  active_strategies: string[] | null;
  shown_button_tours: string[] | null;
}

function mapPreferences(row?: UserPreferenceRow | null): UserPreferences {
  if (!row) {
    return defaultUserPreferences;
  }

  return {
    enabledModules: sanitizeEnabledModules(row.enabled_modules),
    notificationsEnabledGlobal:
      row.notifications_enabled_global ?? defaultUserPreferences.notificationsEnabledGlobal,
    reminderConsent: Boolean(row.reminder_consent),
    reminderConsentUpdatedAt: row.reminder_consent_updated_at ?? null,
    cbtRemindersEnabled: Boolean(row.cbt_reminders_enabled),
    cbtReminderHour: row.cbt_reminder_hour ?? defaultUserPreferences.cbtReminderHour,
    cbtReminderMinute: row.cbt_reminder_minute ?? defaultUserPreferences.cbtReminderMinute,
    cbtReminderTimezone: row.cbt_reminder_timezone ?? null,
    meditationRemindersEnabled: Boolean(row.meditation_reminders_enabled),
    meditationReminderHour:
      row.meditation_reminder_hour ?? defaultUserPreferences.meditationReminderHour,
    meditationReminderMinute:
      row.meditation_reminder_minute ?? defaultUserPreferences.meditationReminderMinute,
    meditationReminderTimezone: row.meditation_reminder_timezone ?? null,
    appOnboardingCompleted: Boolean(row.app_onboarding_completed),
    cbtOnboardingCompleted: Boolean(row.cbt_onboarding_completed),
    cbtWizardCompleted: Boolean(row.cbt_wizard_completed),
    cbtProgramStartedAt: row.cbt_program_started_at ?? null,
    cbtProgramCompletedAt: row.cbt_program_completed_at ?? null,
    cbtProgramPromptDismissedAt: row.cbt_program_prompt_dismissed_at ?? null,
    cbtProgramPhaseIndex: row.cbt_program_phase_index ?? 0,
    cbtProgramPhaseStartedAt: row.cbt_program_phase_started_at ?? null,
    meditationOnboardingCompleted: Boolean(row.meditation_onboarding_completed),
    meditationInfoCompleted: Boolean(row.meditation_info_completed),
    gratitudeOnboardingCompleted: Boolean(row.gratitude_onboarding_completed),
    habitsOnboardingCompleted: Boolean(row.habits_onboarding_completed),
    moodOnboardingCompleted: Boolean(row.mood_onboarding_completed),
    journalOnboardingCompleted: Boolean(row.journal_onboarding_completed),
    sleepOnboardingCompleted: Boolean(row.sleep_onboarding_completed),
    mindfulnessOnboardingCompleted: Boolean(row.mindfulness_onboarding_completed),
    groundingOnboardingCompleted: Boolean(row.grounding_onboarding_completed),
    actOnboardingCompleted: Boolean(row.act_onboarding_completed),
    actRemindersEnabled: Boolean(row.act_reminders_enabled),
    actReminderHour: row.act_reminder_hour ?? defaultUserPreferences.actReminderHour,
    actReminderMinute: row.act_reminder_minute ?? defaultUserPreferences.actReminderMinute,
    actReminderTimezone: row.act_reminder_timezone ?? null,
    actProgramStartedAt: row.act_program_started_at ?? null,
    actProgramCompletedAt: row.act_program_completed_at ?? null,
    actProgramPromptDismissedAt: row.act_program_prompt_dismissed_at ?? null,
    actProgramPhaseIndex: row.act_program_phase_index ?? 0,
    actProgramPhaseStartedAt: row.act_program_phase_started_at ?? null,
    privacyPolicyAcceptedAt: row.privacy_policy_accepted_at ?? null,
    termsAcceptedAt: row.terms_accepted_at ?? null,
    policyVersionAccepted: row.policy_version_accepted ?? null,
    cookieConsent: row.cookie_consent ?? null,
    language: row.language ?? defaultUserPreferences.language,
    theme: row.theme ?? null,
    selectedConcerns: row.selected_concerns ?? [],
    activeStrategies: row.active_strategies ?? [],
    shownButtonTours: (row.shown_button_tours ?? []) as ButtonTourKey[],
  };
}

function isMissingOptionalPreferenceColumn(error: unknown) {
  if (!error || typeof error !== "object") return false;
  const maybeError = error as { code?: unknown; message?: unknown };
  return (
    maybeError.code === "PGRST204" &&
    typeof maybeError.message === "string" &&
    (maybeError.message.includes("act_") ||
      maybeError.message.includes("cbt_program_") ||
      maybeError.message.includes("shown_button_tours"))
  );
}

function omitOptionalPreferenceColumns<T extends Record<string, unknown>>(payload: T) {
  const fallbackPayload: Partial<T> = { ...payload };

  delete fallbackPayload.act_onboarding_completed;
  delete fallbackPayload.act_reminders_enabled;
  delete fallbackPayload.act_reminder_hour;
  delete fallbackPayload.act_reminder_minute;
  delete fallbackPayload.act_reminder_timezone;
  delete fallbackPayload.cbt_program_started_at;
  delete fallbackPayload.cbt_program_completed_at;
  delete fallbackPayload.cbt_program_prompt_dismissed_at;
  delete fallbackPayload.cbt_program_phase_index;
  delete fallbackPayload.cbt_program_phase_started_at;
  delete fallbackPayload.act_program_started_at;
  delete fallbackPayload.act_program_completed_at;
  delete fallbackPayload.act_program_prompt_dismissed_at;
  delete fallbackPayload.act_program_phase_index;
  delete fallbackPayload.act_program_phase_started_at;
  delete fallbackPayload.shown_button_tours;

  return fallbackPayload;
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
  const payload = {
    user_id: userId,
    enabled_modules: preferences.enabledModules,
    notifications_enabled_global: preferences.notificationsEnabledGlobal,
    reminder_consent: preferences.reminderConsent,
    reminder_consent_updated_at: preferences.reminderConsentUpdatedAt,
    cbt_reminders_enabled: preferences.cbtRemindersEnabled,
    cbt_reminder_hour: preferences.cbtReminderHour,
    cbt_reminder_minute: preferences.cbtReminderMinute,
    cbt_reminder_timezone: preferences.cbtReminderTimezone,
    meditation_reminders_enabled: preferences.meditationRemindersEnabled,
    meditation_reminder_hour: preferences.meditationReminderHour,
    meditation_reminder_minute: preferences.meditationReminderMinute,
    meditation_reminder_timezone: preferences.meditationReminderTimezone,
    app_onboarding_completed: preferences.appOnboardingCompleted,
    cbt_onboarding_completed: preferences.cbtOnboardingCompleted,
    cbt_wizard_completed: preferences.cbtWizardCompleted,
    cbt_program_started_at: preferences.cbtProgramStartedAt,
    cbt_program_completed_at: preferences.cbtProgramCompletedAt,
    cbt_program_prompt_dismissed_at: preferences.cbtProgramPromptDismissedAt,
    cbt_program_phase_index: preferences.cbtProgramPhaseIndex,
    cbt_program_phase_started_at: preferences.cbtProgramPhaseStartedAt,
    meditation_onboarding_completed: preferences.meditationOnboardingCompleted,
    meditation_info_completed: preferences.meditationInfoCompleted,
    gratitude_onboarding_completed: preferences.gratitudeOnboardingCompleted,
    habits_onboarding_completed: preferences.habitsOnboardingCompleted,
    mood_onboarding_completed: preferences.moodOnboardingCompleted,
    journal_onboarding_completed: preferences.journalOnboardingCompleted,
    sleep_onboarding_completed: preferences.sleepOnboardingCompleted,
    mindfulness_onboarding_completed: preferences.mindfulnessOnboardingCompleted,
    grounding_onboarding_completed: preferences.groundingOnboardingCompleted,
    act_onboarding_completed: preferences.actOnboardingCompleted,
    act_reminders_enabled: preferences.actRemindersEnabled,
    act_reminder_hour: preferences.actReminderHour,
    act_reminder_minute: preferences.actReminderMinute,
    act_reminder_timezone: preferences.actReminderTimezone,
    act_program_started_at: preferences.actProgramStartedAt,
    act_program_completed_at: preferences.actProgramCompletedAt,
    act_program_prompt_dismissed_at: preferences.actProgramPromptDismissedAt,
    act_program_phase_index: preferences.actProgramPhaseIndex,
    act_program_phase_started_at: preferences.actProgramPhaseStartedAt,
    privacy_policy_accepted_at: preferences.privacyPolicyAcceptedAt,
    terms_accepted_at: preferences.termsAcceptedAt,
    policy_version_accepted: preferences.policyVersionAccepted,
    cookie_consent: preferences.cookieConsent,
    language: preferences.language,
    theme: preferences.theme,
    selected_concerns: preferences.selectedConcerns,
    active_strategies: preferences.activeStrategies,
    shown_button_tours: preferences.shownButtonTours,
  };

  const { data, error } = await client
    .from("user_preferences")
    .upsert(payload, { onConflict: "user_id" })
    .select("*")
    .single();

  if (error) {
    if (isMissingOptionalPreferenceColumn(error)) {
      const { error: fallbackError } = await client
        .from("user_preferences")
        .upsert(omitOptionalPreferenceColumns(payload), { onConflict: "user_id" });

      if (!fallbackError) return preferences;
    }

    throw error;
  }

  return mapPreferences(data as UserPreferenceRow);
}

export async function updateEnabledModules(userId: string, enabledModules: ModuleKey[]) {
  const client = requireSupabase();
  const { data, error } = await client
    .from("user_preferences")
    .upsert(
      {
        user_id: userId,
        enabled_modules: enabledModules,
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

export async function updateShownButtonTours(userId: string, shownButtonTours: ButtonTourKey[]) {
  const client = requireSupabase();
  const { data, error } = await client
    .from("user_preferences")
    .upsert(
      {
        user_id: userId,
        shown_button_tours: shownButtonTours,
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

interface OnboardingPreferencesPatch {
  appOnboardingCompleted?: boolean;
  cbtOnboardingCompleted?: boolean;
  gratitudeOnboardingCompleted?: boolean;
  meditationInfoCompleted?: boolean;
  habitsOnboardingCompleted?: boolean;
  moodOnboardingCompleted?: boolean;
  journalOnboardingCompleted?: boolean;
  sleepOnboardingCompleted?: boolean;
  mindfulnessOnboardingCompleted?: boolean;
  groundingOnboardingCompleted?: boolean;
  shownButtonTours?: ButtonTourKey[];
}

export async function updateOnboardingPreferences(
  userId: string,
  patch: OnboardingPreferencesPatch,
) {
  const client = requireSupabase();
  const payload: Record<string, unknown> = { user_id: userId };

  if (patch.appOnboardingCompleted !== undefined) {
    payload.app_onboarding_completed = patch.appOnboardingCompleted;
  }
  if (patch.cbtOnboardingCompleted !== undefined) {
    payload.cbt_onboarding_completed = patch.cbtOnboardingCompleted;
  }
  if (patch.gratitudeOnboardingCompleted !== undefined) {
    payload.gratitude_onboarding_completed = patch.gratitudeOnboardingCompleted;
  }
  if (patch.meditationInfoCompleted !== undefined) {
    payload.meditation_info_completed = patch.meditationInfoCompleted;
  }
  if (patch.habitsOnboardingCompleted !== undefined) {
    payload.habits_onboarding_completed = patch.habitsOnboardingCompleted;
  }
  if (patch.moodOnboardingCompleted !== undefined) {
    payload.mood_onboarding_completed = patch.moodOnboardingCompleted;
  }
  if (patch.journalOnboardingCompleted !== undefined) {
    payload.journal_onboarding_completed = patch.journalOnboardingCompleted;
  }
  if (patch.sleepOnboardingCompleted !== undefined) {
    payload.sleep_onboarding_completed = patch.sleepOnboardingCompleted;
  }
  if (patch.mindfulnessOnboardingCompleted !== undefined) {
    payload.mindfulness_onboarding_completed = patch.mindfulnessOnboardingCompleted;
  }
  if (patch.groundingOnboardingCompleted !== undefined) {
    payload.grounding_onboarding_completed = patch.groundingOnboardingCompleted;
  }
  if (patch.shownButtonTours !== undefined) {
    payload.shown_button_tours = patch.shownButtonTours;
  }

  const { data, error } = await client
    .from("user_preferences")
    .upsert(payload, { onConflict: "user_id" })
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
  const { error } = await client.from("user_preferences").upsert(
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

interface WebPushSubscriptionPayload {
  auth: string;
  endpoint: string;
  p256dh: string;
  timeZone: string | null;
  userAgent: string | null;
}

export async function upsertWebPushSubscription(
  userId: string,
  subscription: WebPushSubscriptionPayload,
) {
  const client = requireSupabase();
  const { error } = await client.from("web_push_subscriptions").upsert(
    {
      auth: subscription.auth,
      enabled: true,
      endpoint: subscription.endpoint,
      p256dh: subscription.p256dh,
      time_zone: subscription.timeZone,
      user_agent: subscription.userAgent,
      user_id: userId,
    },
    // Per-user conflict target: a shared endpoint (same browser, different account) gets
    // its own row per user rather than colliding with another user's row (which would
    // flip user_id and fail the update_own RLS policy).
    { onConflict: "user_id,endpoint" },
  );

  if (error) {
    throw error;
  }
}

export async function deleteWebPushSubscription(userId: string, endpoint: string) {
  const client = requireSupabase();
  const { error } = await client
    .from("web_push_subscriptions")
    .delete()
    .eq("user_id", userId)
    .eq("endpoint", endpoint);

  if (error) {
    throw error;
  }
}
