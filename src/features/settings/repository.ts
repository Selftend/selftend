import {
  defaultUserPreferences,
  sanitizeEnabledModules,
  type ButtonTourKey,
  type CookieConsent,
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
  cbt_graduation_dismissed_at: string | null;
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
  mood_reminders_enabled: boolean | null;
  mood_reminder_hour: number | null;
  mood_reminder_minute: number | null;
  mood_reminder_timezone: string | null;
  journal_reminders_enabled: boolean | null;
  journal_reminder_hour: number | null;
  journal_reminder_minute: number | null;
  journal_reminder_timezone: string | null;
  gratitude_reminders_enabled: boolean | null;
  gratitude_reminder_hour: number | null;
  gratitude_reminder_minute: number | null;
  gratitude_reminder_timezone: string | null;
  grounding_reminders_enabled: boolean | null;
  grounding_reminder_hour: number | null;
  grounding_reminder_minute: number | null;
  grounding_reminder_timezone: string | null;
  breathing_reminders_enabled: boolean | null;
  breathing_reminder_hour: number | null;
  breathing_reminder_minute: number | null;
  breathing_reminder_timezone: string | null;
  sleep_reminders_enabled: boolean | null;
  sleep_reminder_hour: number | null;
  sleep_reminder_minute: number | null;
  sleep_reminder_timezone: string | null;
  habits_reminders_enabled: boolean | null;
  habits_reminder_hour: number | null;
  habits_reminder_minute: number | null;
  habits_reminder_timezone: string | null;
  act_program_started_at: string | null;
  act_program_completed_at: string | null;
  act_program_prompt_dismissed_at: string | null;
  act_program_phase_index: number | null;
  act_program_phase_started_at: string | null;
  act_graduation_dismissed_at: string | null;
  privacy_policy_accepted_at: string | null;
  terms_accepted_at: string | null;
  policy_version_accepted: string | null;
  cookie_consent: CookieConsent | null;
  language: string | null;
  theme: string | null;
  selected_concerns: string[] | null;
  active_strategies: string[] | null;
  shown_button_tours: string[] | null;
  breath_sound_id: string | null;
  ambient_sound_id: string | null;
  breath_volume: number | null;
  ambient_volume: number | null;
  last_breathing_pattern_id: string | null;
  breathing_cycles: number | null;
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
    cbtGraduationDismissedAt: row.cbt_graduation_dismissed_at ?? null,
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
    moodRemindersEnabled: Boolean(row.mood_reminders_enabled),
    moodReminderHour: row.mood_reminder_hour ?? defaultUserPreferences.moodReminderHour,
    moodReminderMinute: row.mood_reminder_minute ?? defaultUserPreferences.moodReminderMinute,
    moodReminderTimezone: row.mood_reminder_timezone ?? null,
    journalRemindersEnabled: Boolean(row.journal_reminders_enabled),
    journalReminderHour: row.journal_reminder_hour ?? defaultUserPreferences.journalReminderHour,
    journalReminderMinute:
      row.journal_reminder_minute ?? defaultUserPreferences.journalReminderMinute,
    journalReminderTimezone: row.journal_reminder_timezone ?? null,
    gratitudeRemindersEnabled: Boolean(row.gratitude_reminders_enabled),
    gratitudeReminderHour:
      row.gratitude_reminder_hour ?? defaultUserPreferences.gratitudeReminderHour,
    gratitudeReminderMinute:
      row.gratitude_reminder_minute ?? defaultUserPreferences.gratitudeReminderMinute,
    gratitudeReminderTimezone: row.gratitude_reminder_timezone ?? null,
    groundingRemindersEnabled: Boolean(row.grounding_reminders_enabled),
    groundingReminderHour:
      row.grounding_reminder_hour ?? defaultUserPreferences.groundingReminderHour,
    groundingReminderMinute:
      row.grounding_reminder_minute ?? defaultUserPreferences.groundingReminderMinute,
    groundingReminderTimezone: row.grounding_reminder_timezone ?? null,
    breathingRemindersEnabled: Boolean(row.breathing_reminders_enabled),
    breathingReminderHour:
      row.breathing_reminder_hour ?? defaultUserPreferences.breathingReminderHour,
    breathingReminderMinute:
      row.breathing_reminder_minute ?? defaultUserPreferences.breathingReminderMinute,
    breathingReminderTimezone: row.breathing_reminder_timezone ?? null,
    sleepRemindersEnabled: Boolean(row.sleep_reminders_enabled),
    sleepReminderHour: row.sleep_reminder_hour ?? defaultUserPreferences.sleepReminderHour,
    sleepReminderMinute: row.sleep_reminder_minute ?? defaultUserPreferences.sleepReminderMinute,
    sleepReminderTimezone: row.sleep_reminder_timezone ?? null,
    habitsRemindersEnabled: Boolean(row.habits_reminders_enabled),
    habitsReminderHour: row.habits_reminder_hour ?? defaultUserPreferences.habitsReminderHour,
    habitsReminderMinute: row.habits_reminder_minute ?? defaultUserPreferences.habitsReminderMinute,
    habitsReminderTimezone: row.habits_reminder_timezone ?? null,
    actProgramStartedAt: row.act_program_started_at ?? null,
    actProgramCompletedAt: row.act_program_completed_at ?? null,
    actProgramPromptDismissedAt: row.act_program_prompt_dismissed_at ?? null,
    actProgramPhaseIndex: row.act_program_phase_index ?? 0,
    actProgramPhaseStartedAt: row.act_program_phase_started_at ?? null,
    actGraduationDismissedAt: row.act_graduation_dismissed_at ?? null,
    privacyPolicyAcceptedAt: row.privacy_policy_accepted_at ?? null,
    termsAcceptedAt: row.terms_accepted_at ?? null,
    policyVersionAccepted: row.policy_version_accepted ?? null,
    cookieConsent: row.cookie_consent ?? null,
    language: row.language ?? defaultUserPreferences.language,
    theme: row.theme ?? null,
    selectedConcerns: row.selected_concerns ?? [],
    activeStrategies: row.active_strategies ?? [],
    shownButtonTours: (row.shown_button_tours ?? []) as ButtonTourKey[],
    breathSoundId: row.breath_sound_id ?? defaultUserPreferences.breathSoundId,
    ambientSoundId: row.ambient_sound_id ?? defaultUserPreferences.ambientSoundId,
    breathVolume: row.breath_volume ?? defaultUserPreferences.breathVolume,
    ambientVolume: row.ambient_volume ?? defaultUserPreferences.ambientVolume,
    lastBreathingPatternId: row.last_breathing_pattern_id ?? null,
    breathingCycles: row.breathing_cycles ?? null,
  };
}

// PostgREST returns PGRST204 - "Could not find the 'X' column of 'user_preferences'
// in the schema cache" - when the request body references a column the target DB does
// not have yet (e.g. a migration that hasn't reached this environment). Parse the
// offending column name so the write can retry without ONLY that column, instead of
// blindly stripping a hardcoded list and silently dropping the columns the caller is
// actually trying to change (which made "abandon program" no-op).
function missingPreferenceColumn(error: unknown): string | null {
  if (!error || typeof error !== "object") return null;
  const maybeError = error as { code?: unknown; message?: unknown };
  if (maybeError.code !== "PGRST204" || typeof maybeError.message !== "string") return null;
  const match = maybeError.message.match(/'([a-z0-9_]+)' column/i);
  return match ? match[1] : null;
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
    cbt_graduation_dismissed_at: preferences.cbtGraduationDismissedAt,
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
    mood_reminders_enabled: preferences.moodRemindersEnabled,
    mood_reminder_hour: preferences.moodReminderHour,
    mood_reminder_minute: preferences.moodReminderMinute,
    mood_reminder_timezone: preferences.moodReminderTimezone,
    journal_reminders_enabled: preferences.journalRemindersEnabled,
    journal_reminder_hour: preferences.journalReminderHour,
    journal_reminder_minute: preferences.journalReminderMinute,
    journal_reminder_timezone: preferences.journalReminderTimezone,
    gratitude_reminders_enabled: preferences.gratitudeRemindersEnabled,
    gratitude_reminder_hour: preferences.gratitudeReminderHour,
    gratitude_reminder_minute: preferences.gratitudeReminderMinute,
    gratitude_reminder_timezone: preferences.gratitudeReminderTimezone,
    grounding_reminders_enabled: preferences.groundingRemindersEnabled,
    grounding_reminder_hour: preferences.groundingReminderHour,
    grounding_reminder_minute: preferences.groundingReminderMinute,
    grounding_reminder_timezone: preferences.groundingReminderTimezone,
    breathing_reminders_enabled: preferences.breathingRemindersEnabled,
    breathing_reminder_hour: preferences.breathingReminderHour,
    breathing_reminder_minute: preferences.breathingReminderMinute,
    breathing_reminder_timezone: preferences.breathingReminderTimezone,
    sleep_reminders_enabled: preferences.sleepRemindersEnabled,
    sleep_reminder_hour: preferences.sleepReminderHour,
    sleep_reminder_minute: preferences.sleepReminderMinute,
    sleep_reminder_timezone: preferences.sleepReminderTimezone,
    habits_reminders_enabled: preferences.habitsRemindersEnabled,
    habits_reminder_hour: preferences.habitsReminderHour,
    habits_reminder_minute: preferences.habitsReminderMinute,
    habits_reminder_timezone: preferences.habitsReminderTimezone,
    act_program_started_at: preferences.actProgramStartedAt,
    act_program_completed_at: preferences.actProgramCompletedAt,
    act_program_prompt_dismissed_at: preferences.actProgramPromptDismissedAt,
    act_program_phase_index: preferences.actProgramPhaseIndex,
    act_program_phase_started_at: preferences.actProgramPhaseStartedAt,
    act_graduation_dismissed_at: preferences.actGraduationDismissedAt,
    privacy_policy_accepted_at: preferences.privacyPolicyAcceptedAt,
    terms_accepted_at: preferences.termsAcceptedAt,
    policy_version_accepted: preferences.policyVersionAccepted,
    cookie_consent: preferences.cookieConsent,
    language: preferences.language,
    theme: preferences.theme,
    selected_concerns: preferences.selectedConcerns,
    active_strategies: preferences.activeStrategies,
    shown_button_tours: preferences.shownButtonTours,
    breath_sound_id: preferences.breathSoundId,
    ambient_sound_id: preferences.ambientSoundId,
    breath_volume: preferences.breathVolume,
    ambient_volume: preferences.ambientVolume,
    last_breathing_pattern_id: preferences.lastBreathingPatternId,
    breathing_cycles: preferences.breathingCycles,
  };

  // Retry while PostgREST reports a missing column, dropping ONLY the named column each
  // pass. Degrades gracefully on an environment whose schema is behind the code (a
  // not-yet-applied migration) without discarding the columns the caller is changing -
  // the previous broad-strip fallback silently dropped program-state writes, so
  // "abandon program" appeared to do nothing. Bounded: each pass removes at most one column.
  let attempt: Record<string, unknown> = payload;
  for (let i = 0; i <= Object.keys(payload).length; i++) {
    const { data, error } = await client
      .from("user_preferences")
      .upsert(attempt, { onConflict: "user_id" })
      .select("*")
      .single();

    if (!error) return mapPreferences(data as UserPreferenceRow);

    const missing = missingPreferenceColumn(error);
    if (!missing || missing === "user_id" || !(missing in attempt)) throw error;

    const { [missing]: _omitted, ...rest } = attempt;
    attempt = rest;
  }

  throw new Error("updateUserPreferences: exhausted missing-column retries");
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
  // Best-effort client-side avatar cleanup - it must never abort the actual erasure. A
  // transient storage/permission error here previously threw before the RPC ran, leaving
  // the account and all PHI undeleted. delete_user_account() now does authoritative,
  // server-side storage cleanup, so this is purely an optimistic early delete.
  try {
    await removeCurrentUserUploadedAvatar();
  } catch {
    // Swallow: deletion of the account + PHI takes priority over avatar cleanup.
  }
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

interface DevicePushTokenPayload {
  token: string;
  platform: "ios" | "android";
  timeZone: string | null;
}

export async function upsertDevicePushToken(_userId: string, token: DevicePushTokenPayload) {
  const client = requireSupabase();
  // expo_push_token is globally unique (per device, not per account). A direct
  // upsert onConflict:"expo_push_token" hits a prior owner's row, which RLS hides
  // from the new user (42501). Claim the token via a SECURITY DEFINER RPC that
  // reassigns it to the caller atomically. The caller is auth.uid() inside the
  // function, so userId is no longer passed. See migration 20260666.
  const { error } = await client.rpc("claim_device_push_token", {
    p_token: token.token,
    p_platform: token.platform,
    p_time_zone: token.timeZone,
  });

  if (error) {
    throw error;
  }
}

export async function deleteDevicePushToken(userId: string, token: string) {
  const client = requireSupabase();
  const { error } = await client
    .from("device_push_tokens")
    .delete()
    .eq("user_id", userId)
    .eq("expo_push_token", token);

  if (error) {
    throw error;
  }
}
