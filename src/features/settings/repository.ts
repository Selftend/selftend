import { resolveAmbientSoundId, resolveBreathSoundId } from "@/src/constants/breathing-sounds";
import {
  defaultUserPreferences,
  sanitizeEnabledModules,
  type ButtonTourKey,
  type CookieConsent,
  type ReminderPromptedTool,
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
  app_onboarding_completed_via: string | null;
  app_onboarding_completed_at: string | null;
  cbt_wizard_completed: boolean | null;
  cbt_program_started_at: string | null;
  cbt_program_completed_at: string | null;
  cbt_program_prompt_dismissed_at: string | null;
  cbt_program_phase_index: number | null;
  cbt_program_phase_started_at: string | null;
  cbt_graduation_dismissed_at: string | null;
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
  dbt_reminders_enabled: boolean | null;
  dbt_reminder_hour: number | null;
  dbt_reminder_minute: number | null;
  dbt_reminder_timezone: string | null;
  act_program_started_at: string | null;
  act_program_completed_at: string | null;
  act_program_prompt_dismissed_at: string | null;
  act_program_phase_index: number | null;
  act_program_phase_started_at: string | null;
  act_graduation_dismissed_at: string | null;
  dbt_program_started_at: string | null;
  dbt_program_completed_at: string | null;
  dbt_program_prompt_dismissed_at: string | null;
  dbt_program_phase_index: number | null;
  dbt_program_phase_started_at: string | null;
  dbt_graduation_dismissed_at: string | null;
  privacy_policy_accepted_at: string | null;
  terms_accepted_at: string | null;
  policy_version_accepted: string | null;
  health_data_consent_at: string | null;
  age_floor_met: boolean | null;
  age_attested_country: string | null;
  age_attested_at: string | null;
  cookie_consent: CookieConsent | null;
  language: string | null;
  theme: string | null;
  active_strategies: string[] | null;
  start_here_dismissed_at: string | null;
  shown_button_tours: string[] | null;
  reminder_prompted_tools: string[] | null;
  starter_routine_offered: boolean | null;
  breath_sound_id: string | null;
  ambient_sound_id: string | null;
  breath_volume: number | null;
  ambient_volume: number | null;
  last_breathing_pattern_id: string | null;
  breathing_cycles: number | null;
  meditation_interval_bell_minutes: number | null;
  meditation_bell_at_half: boolean | null;
  haptic_cues: boolean | null;
  bell_volume: number | null;
  meditation_ambient_sound_id: string | null;
  meditation_ambient_volume: number | null;
  email_verified: boolean | null;
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
    appOnboardingCompletedVia:
      row.app_onboarding_completed_via === "finish" || row.app_onboarding_completed_via === "skip"
        ? row.app_onboarding_completed_via
        : null,
    appOnboardingCompletedAt: row.app_onboarding_completed_at ?? null,
    cbtWizardCompleted: Boolean(row.cbt_wizard_completed),
    cbtProgramStartedAt: row.cbt_program_started_at ?? null,
    cbtProgramCompletedAt: row.cbt_program_completed_at ?? null,
    cbtProgramPromptDismissedAt: row.cbt_program_prompt_dismissed_at ?? null,
    cbtProgramPhaseIndex: row.cbt_program_phase_index ?? 0,
    cbtProgramPhaseStartedAt: row.cbt_program_phase_started_at ?? null,
    cbtGraduationDismissedAt: row.cbt_graduation_dismissed_at ?? null,
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
    dbtRemindersEnabled: Boolean(row.dbt_reminders_enabled),
    dbtReminderHour: row.dbt_reminder_hour ?? defaultUserPreferences.dbtReminderHour,
    dbtReminderMinute: row.dbt_reminder_minute ?? defaultUserPreferences.dbtReminderMinute,
    dbtReminderTimezone: row.dbt_reminder_timezone ?? null,
    actProgramStartedAt: row.act_program_started_at ?? null,
    actProgramCompletedAt: row.act_program_completed_at ?? null,
    actProgramPromptDismissedAt: row.act_program_prompt_dismissed_at ?? null,
    actProgramPhaseIndex: row.act_program_phase_index ?? 0,
    actProgramPhaseStartedAt: row.act_program_phase_started_at ?? null,
    actGraduationDismissedAt: row.act_graduation_dismissed_at ?? null,
    dbtProgramStartedAt: row.dbt_program_started_at ?? null,
    dbtProgramCompletedAt: row.dbt_program_completed_at ?? null,
    dbtProgramPromptDismissedAt: row.dbt_program_prompt_dismissed_at ?? null,
    dbtProgramPhaseIndex: row.dbt_program_phase_index ?? 0,
    dbtProgramPhaseStartedAt: row.dbt_program_phase_started_at ?? null,
    dbtGraduationDismissedAt: row.dbt_graduation_dismissed_at ?? null,
    privacyPolicyAcceptedAt: row.privacy_policy_accepted_at ?? null,
    termsAcceptedAt: row.terms_accepted_at ?? null,
    policyVersionAccepted: row.policy_version_accepted ?? null,
    // Never inferred from privacyPolicyAcceptedAt above: every row predating
    // #1766 accepted a policy under one bundled checkbox, and the reason this
    // field exists is that a bundled tick is not the explicit Art. 9(2)(a) act.
    healthDataConsentAt: row.health_data_consent_at ?? null,
    // `?? null` and deliberately NOT `Boolean(...)`, which is what the other
    // flags on this row use. Coercing here would turn "never asked" into
    // "failed the floor" for every account predating the gate (#1762).
    ageFloorMet: row.age_floor_met ?? null,
    ageAttestedCountry: row.age_attested_country ?? null,
    ageAttestedAt: row.age_attested_at ?? null,
    cookieConsent: row.cookie_consent ?? null,
    language: row.language ?? defaultUserPreferences.language,
    languageExplicit: row.language !== null,
    theme: row.theme ?? null,
    activeStrategies: row.active_strategies ?? [],
    startHereDismissedAt: row.start_here_dismissed_at ?? null,
    shownButtonTours: (row.shown_button_tours ?? []) as ButtonTourKey[],
    reminderPromptedTools: (row.reminder_prompted_tools ?? []) as ReminderPromptedTool[],
    starterRoutineOffered: Boolean(row.starter_routine_offered),
    // Resolved HERE, once, for every consumer (#1745): both columns are plain text with
    // no CHECK, shipped clients may still write a retired id, so the database can hold
    // `wind` forever. Read-side only - the resolved value is never written back, and
    // `updateUserPreferences` sends a patch through untouched.
    breathSoundId: resolveBreathSoundId(
      row.breath_sound_id ?? defaultUserPreferences.breathSoundId,
    ),
    ambientSoundId: resolveAmbientSoundId(
      row.ambient_sound_id ?? defaultUserPreferences.ambientSoundId,
    ),
    breathVolume: row.breath_volume ?? defaultUserPreferences.breathVolume,
    ambientVolume: row.ambient_volume ?? defaultUserPreferences.ambientVolume,
    lastBreathingPatternId: row.last_breathing_pattern_id ?? null,
    breathingCycles: row.breathing_cycles ?? null,
    meditationIntervalBellMinutes:
      row.meditation_interval_bell_minutes ?? defaultUserPreferences.meditationIntervalBellMinutes,
    bellVolume: row.bell_volume ?? defaultUserPreferences.bellVolume,
    meditationBellAtHalf: Boolean(row.meditation_bell_at_half),
    hapticCues: Boolean(row.haptic_cues),
    // The sit's bed resolves like the breathing one: same catalog, same `none`.
    meditationAmbientSoundId: resolveAmbientSoundId(
      row.meditation_ambient_sound_id ?? defaultUserPreferences.meditationAmbientSoundId,
    ),
    meditationAmbientVolume:
      row.meditation_ambient_volume ?? defaultUserPreferences.meditationAmbientVolume,
    emailVerified: row.email_verified ?? defaultUserPreferences.emailVerified,
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

// Camel-case preference fields -> user_preferences columns, for building partial
// writes. Derived fields with no column of their own (languageExplicit) are
// deliberately absent - a patch naming them writes nothing for that key.
const PREFERENCE_COLUMNS: Partial<Record<keyof UserPreferences, string>> = {
  enabledModules: "enabled_modules",
  notificationsEnabledGlobal: "notifications_enabled_global",
  reminderConsent: "reminder_consent",
  reminderConsentUpdatedAt: "reminder_consent_updated_at",
  cbtRemindersEnabled: "cbt_reminders_enabled",
  cbtReminderHour: "cbt_reminder_hour",
  cbtReminderMinute: "cbt_reminder_minute",
  cbtReminderTimezone: "cbt_reminder_timezone",
  meditationRemindersEnabled: "meditation_reminders_enabled",
  meditationReminderHour: "meditation_reminder_hour",
  meditationReminderMinute: "meditation_reminder_minute",
  meditationReminderTimezone: "meditation_reminder_timezone",
  appOnboardingCompleted: "app_onboarding_completed",
  appOnboardingCompletedVia: "app_onboarding_completed_via",
  appOnboardingCompletedAt: "app_onboarding_completed_at",
  cbtWizardCompleted: "cbt_wizard_completed",
  cbtProgramStartedAt: "cbt_program_started_at",
  cbtProgramCompletedAt: "cbt_program_completed_at",
  cbtProgramPromptDismissedAt: "cbt_program_prompt_dismissed_at",
  cbtProgramPhaseIndex: "cbt_program_phase_index",
  cbtProgramPhaseStartedAt: "cbt_program_phase_started_at",
  cbtGraduationDismissedAt: "cbt_graduation_dismissed_at",
  actRemindersEnabled: "act_reminders_enabled",
  actReminderHour: "act_reminder_hour",
  actReminderMinute: "act_reminder_minute",
  actReminderTimezone: "act_reminder_timezone",
  moodRemindersEnabled: "mood_reminders_enabled",
  moodReminderHour: "mood_reminder_hour",
  moodReminderMinute: "mood_reminder_minute",
  moodReminderTimezone: "mood_reminder_timezone",
  journalRemindersEnabled: "journal_reminders_enabled",
  journalReminderHour: "journal_reminder_hour",
  journalReminderMinute: "journal_reminder_minute",
  journalReminderTimezone: "journal_reminder_timezone",
  gratitudeRemindersEnabled: "gratitude_reminders_enabled",
  gratitudeReminderHour: "gratitude_reminder_hour",
  gratitudeReminderMinute: "gratitude_reminder_minute",
  gratitudeReminderTimezone: "gratitude_reminder_timezone",
  groundingRemindersEnabled: "grounding_reminders_enabled",
  groundingReminderHour: "grounding_reminder_hour",
  groundingReminderMinute: "grounding_reminder_minute",
  groundingReminderTimezone: "grounding_reminder_timezone",
  breathingRemindersEnabled: "breathing_reminders_enabled",
  breathingReminderHour: "breathing_reminder_hour",
  breathingReminderMinute: "breathing_reminder_minute",
  breathingReminderTimezone: "breathing_reminder_timezone",
  sleepRemindersEnabled: "sleep_reminders_enabled",
  sleepReminderHour: "sleep_reminder_hour",
  sleepReminderMinute: "sleep_reminder_minute",
  sleepReminderTimezone: "sleep_reminder_timezone",
  habitsRemindersEnabled: "habits_reminders_enabled",
  habitsReminderHour: "habits_reminder_hour",
  habitsReminderMinute: "habits_reminder_minute",
  habitsReminderTimezone: "habits_reminder_timezone",
  dbtRemindersEnabled: "dbt_reminders_enabled",
  dbtReminderHour: "dbt_reminder_hour",
  dbtReminderMinute: "dbt_reminder_minute",
  dbtReminderTimezone: "dbt_reminder_timezone",
  actProgramStartedAt: "act_program_started_at",
  actProgramCompletedAt: "act_program_completed_at",
  actProgramPromptDismissedAt: "act_program_prompt_dismissed_at",
  actProgramPhaseIndex: "act_program_phase_index",
  actProgramPhaseStartedAt: "act_program_phase_started_at",
  actGraduationDismissedAt: "act_graduation_dismissed_at",
  dbtProgramStartedAt: "dbt_program_started_at",
  dbtProgramCompletedAt: "dbt_program_completed_at",
  dbtProgramPromptDismissedAt: "dbt_program_prompt_dismissed_at",
  dbtProgramPhaseIndex: "dbt_program_phase_index",
  dbtProgramPhaseStartedAt: "dbt_program_phase_started_at",
  dbtGraduationDismissedAt: "dbt_graduation_dismissed_at",
  privacyPolicyAcceptedAt: "privacy_policy_accepted_at",
  termsAcceptedAt: "terms_accepted_at",
  policyVersionAccepted: "policy_version_accepted",
  healthDataConsentAt: "health_data_consent_at",
  ageFloorMet: "age_floor_met",
  ageAttestedCountry: "age_attested_country",
  ageAttestedAt: "age_attested_at",
  cookieConsent: "cookie_consent",
  language: "language",
  theme: "theme",
  activeStrategies: "active_strategies",
  startHereDismissedAt: "start_here_dismissed_at",
  shownButtonTours: "shown_button_tours",
  reminderPromptedTools: "reminder_prompted_tools",
  starterRoutineOffered: "starter_routine_offered",
  breathSoundId: "breath_sound_id",
  ambientSoundId: "ambient_sound_id",
  breathVolume: "breath_volume",
  ambientVolume: "ambient_volume",
  lastBreathingPatternId: "last_breathing_pattern_id",
  breathingCycles: "breathing_cycles",
  meditationIntervalBellMinutes: "meditation_interval_bell_minutes",
  meditationBellAtHalf: "meditation_bell_at_half",
  hapticCues: "haptic_cues",
  bellVolume: "bell_volume",
  meditationAmbientSoundId: "meditation_ambient_sound_id",
  meditationAmbientVolume: "meditation_ambient_volume",
  emailVerified: "email_verified",
};

export async function updateUserPreferences(userId: string, patch: Partial<UserPreferences>) {
  const client = requireSupabase();
  // Write ONLY the patched columns (#57). Writing the whole row from the client's
  // in-memory preferences clobbers concurrent writers - another device, or the
  // e2e fixtures' per-test normalization - with every value captured at mount:
  // a classic lost-update. On the insert path of the upsert, unnamed columns get
  // their database defaults, which is the correct fresh-row semantics.
  const payload: Record<string, unknown> = { user_id: userId };
  for (const key of Object.keys(patch) as (keyof UserPreferences)[]) {
    const column = PREFERENCE_COLUMNS[key];
    if (column !== undefined) payload[column] = patch[key];
  }

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

/**
 * The keys an onboarding write may name.
 *
 * Kept deliberately narrow: module introduction state is not persisted because
 * those modals are opened explicitly from their module headers (#807).
 */
type OnboardingPreferencesPatch = Partial<
  Pick<
    UserPreferences,
    | "appOnboardingCompleted"
    | "appOnboardingCompletedVia"
    | "appOnboardingCompletedAt"
    | "shownButtonTours"
    | "startHereDismissedAt"
  >
>;

export async function updateOnboardingPreferences(
  userId: string,
  patch: OnboardingPreferencesPatch,
) {
  const client = requireSupabase();
  // Translate through the SAME `PREFERENCE_COLUMNS` map `updateUserPreferences`
  // uses. The hand-written if-chain this replaces was a second copy of a subset
  // of that map, which is how two flags ended up unwritable here while the map
  // itself had carried their columns all along (#821).
  const payload: Record<string, unknown> = { user_id: userId };
  for (const key of Object.keys(patch) as (keyof OnboardingPreferencesPatch)[]) {
    const column = PREFERENCE_COLUMNS[key];
    if (column !== undefined && patch[key] !== undefined) payload[column] = patch[key];
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

/**
 * Record what the consent gate collected: the contractual acceptance, and the
 * explicit Art. 9(2)(a) consent beside it (#1766, spec #227 §3).
 *
 * Two records because the gate asks two separate questions. The gate submits
 * only when BOTH have been ticked, so both are written here - but they are
 * written as two facts, not one, because `health_data_consent_at` has to be
 * readable later as its own affirmative act rather than as something implied by
 * having accepted a policy version.
 *
 * The same `now` for both: one submit, one moment. A reader comparing the two
 * timestamps should not have to wonder what a difference would have meant.
 */
export async function recordPolicyConsent(userId: string, policyVersion: string) {
  const client = requireSupabase();
  const now = new Date().toISOString();
  const { error } = await client.from("user_preferences").upsert(
    {
      user_id: userId,
      privacy_policy_accepted_at: now,
      terms_accepted_at: now,
      policy_version_accepted: policyVersion,
      health_data_consent_at: now,
    },
    { onConflict: "user_id" },
  );

  if (error) {
    throw error;
  }
}

/**
 * Record that this person cleared their country's age floor (#1764, §3).
 *
 * Its own function rather than a `updateUserPreferences` patch, for one
 * reason: that path retries while PostgREST reports a missing column, dropping
 * the named column each pass, so on an environment whose schema predates
 * #1762's migration it would report success having written nothing. The gate
 * would then re-ask on every launch, and - worse - a caller could reasonably
 * read the resolved promise as "attested". This fails instead.
 *
 * Only ever called for a PASS. There is no failing counterpart: an under-floor
 * verdict writes nothing at all, because the account it would be written
 * against is about to be deleted (#1765).
 *
 * ⚠️ The date of birth is not a parameter and must not become one.
 */
export async function recordAgeAttestation(userId: string, country: string) {
  const client = requireSupabase();
  const { error } = await client.from("user_preferences").upsert(
    {
      user_id: userId,
      age_floor_met: true,
      // `^[A-Z]{2}$` is checked in the database too; normalising here means a
      // lower-case code is stored rather than rejected.
      age_attested_country: country.trim().toUpperCase(),
      age_attested_at: new Date().toISOString(),
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
