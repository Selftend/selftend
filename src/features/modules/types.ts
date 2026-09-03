export type ModuleKey = "cbt" | "meditation" | "gratitude" | "act";

export type ButtonTourAction = "tune" | "notifications" | "program" | "info";
// A shown-tour storage key: legacy bare action ("info"), screen-scoped
// ("cbt:info"), or a home tour stop ("home:edit").
export type ButtonTourKey = string;

// A notification target key ("mood", "cbt", ...) the one-time contextual
// reminder prompt has already been shown for.
export type ReminderPromptedTool = string;

export type GratitudeLevel = 1 | 2 | 3;

export interface CookieConsent {
  essential: true;
  analytics: boolean;
  acceptedAt: string;
}

export interface UserPreferences {
  enabledModules: ModuleKey[];
  notificationsEnabledGlobal: boolean;
  reminderConsent: boolean;
  reminderConsentUpdatedAt: string | null;
  cbtRemindersEnabled: boolean;
  cbtReminderHour: number;
  cbtReminderMinute: number;
  cbtReminderTimezone: string | null;
  meditationRemindersEnabled: boolean;
  meditationReminderHour: number;
  meditationReminderMinute: number;
  meditationReminderTimezone: string | null;
  actRemindersEnabled: boolean;
  actReminderHour: number;
  actReminderMinute: number;
  actReminderTimezone: string | null;
  moodRemindersEnabled: boolean;
  moodReminderHour: number;
  moodReminderMinute: number;
  moodReminderTimezone: string | null;
  journalRemindersEnabled: boolean;
  journalReminderHour: number;
  journalReminderMinute: number;
  journalReminderTimezone: string | null;
  gratitudeRemindersEnabled: boolean;
  gratitudeReminderHour: number;
  gratitudeReminderMinute: number;
  gratitudeReminderTimezone: string | null;
  groundingRemindersEnabled: boolean;
  groundingReminderHour: number;
  groundingReminderMinute: number;
  groundingReminderTimezone: string | null;
  breathingRemindersEnabled: boolean;
  breathingReminderHour: number;
  breathingReminderMinute: number;
  breathingReminderTimezone: string | null;
  sleepRemindersEnabled: boolean;
  sleepReminderHour: number;
  sleepReminderMinute: number;
  sleepReminderTimezone: string | null;
  habitsRemindersEnabled: boolean;
  habitsReminderHour: number;
  habitsReminderMinute: number;
  habitsReminderTimezone: string | null;
  appOnboardingCompleted: boolean;
  appOnboardingCompletedVia: "finish" | "skip" | null;
  appOnboardingCompletedAt: string | null;
  cbtWizardCompleted: boolean;
  cbtProgramStartedAt: string | null;
  cbtProgramCompletedAt: string | null;
  cbtProgramPromptDismissedAt: string | null;
  cbtProgramPhaseIndex: number;
  cbtProgramPhaseStartedAt: string | null;
  cbtGraduationDismissedAt: string | null;
  actProgramStartedAt: string | null;
  actProgramCompletedAt: string | null;
  actProgramPromptDismissedAt: string | null;
  actProgramPhaseIndex: number;
  actProgramPhaseStartedAt: string | null;
  actGraduationDismissedAt: string | null;
  privacyPolicyAcceptedAt: string | null;
  termsAcceptedAt: string | null;
  policyVersionAccepted: string | null;
  /**
   * The age gate's verdict (#1762, spec #227 §3): did this person clear the
   * minimum age for the country they declared. `null` is a third state and not
   * a synonym for `false` - it means never asked, which is where every account
   * predating the gate stays, since §7 gives them the consent prompt without
   * re-asking age or country. Only `true` is a pass; read it as `=== true`.
   *
   * The date of birth behind the verdict is compared and discarded - it is not
   * on this type and not in the database.
   */
  ageFloorMet: boolean | null;
  /**
   * The country the person declared at the age gate, upper-case ISO 3166-1
   * alpha-2. It picks the floor (`floorForCountry`, #1761), so it is kept
   * rather than recomputed. `null` means never asked.
   */
  ageAttestedCountry: string | null;
  /** When the attestation was made (#1762). `null` means never asked. */
  ageAttestedAt: string | null;
  cookieConsent: CookieConsent | null;
  language: string;
  languageExplicit: boolean;
  theme: string | null;
  selectedConcerns: string[];
  activeStrategies: string[];
  startHereDismissedAt: string | null;
  shownButtonTours: ButtonTourKey[];
  reminderPromptedTools: ReminderPromptedTool[];
  /**
   * The once-ever starter-routine offer at the second action (#1677) has been
   * shown. Marked on show, mirroring `reminderPromptedTools`: navigating away
   * counts as asked, and declining writes nothing further.
   */
  starterRoutineOffered: boolean;
  breathSoundId: string;
  ambientSoundId: string;
  breathVolume: number;
  ambientVolume: number;
  lastBreathingPatternId: string | null;
  breathingCycles: number | null;
  /**
   * Interval-bell spacing for a meditation sit, in minutes; 0 is off (#1190).
   * A playback preference rather than programme progress, which is why it sits
   * beside the breathing audio columns and not on meditation_program_state.
   * Never chosen and explicitly off are the same thing to every reader, so the
   * null column collapses to 0 here rather than widening the type.
   */
  meditationIntervalBellMinutes: number;
  /**
   * TMI's half-time check-in bell: one chime at the sit's midpoint (#1189).
   * A separate flag rather than a value in the column above, because that one
   * is an absolute spacing in minutes and this is relative to a sit length the
   * user changes independently. Read the pair through
   * `bellChoiceFromStored`; write it through `bellChoicePatch`.
   */
  meditationBellAtHalf: boolean;
  /**
   * A tap for each meditation bell and each breath phase boundary (#1741), the
   * sound's counterpart for a person who cannot hear it or sits with the bells
   * at 0. Opt-in, off by default, native only; one preference toggled from the
   * sit setup and the breathing session alike.
   */
  hapticCues: boolean;
  /**
   * Volume for all three meditation bells, 0..1; 0 is off (#1188). Until this
   * shipped they fired at a hardcoded 1, which measured as the loudest sound in
   * the app - louder than either breathing lane, both of which had a slider.
   * Defaults to 1 because #1130 owns absolute loudness: a quieter default here
   * would stack with its re-render.
   */
  bellVolume: number;
  /**
   * The meditation sit's looping ambient bed and its volume (#1742), the same
   * shape as the breathing pair above. Deliberately NOT the breathing columns:
   * a rain bed chosen for breathing must not start playing under a sit the
   * person never asked it for. `none` is the default and the first row, so a
   * fresh account and every existing one sits in silence exactly as before.
   */
  meditationAmbientSoundId: string;
  meditationAmbientVolume: number;
  // The app's own mailbox-ownership flag (#489). Under mailer_autoconfirm,
  // auth's email_confirmed_at is stamped at signup and proves nothing; this
  // is set after an OTP code entry or an emailed-link round trip. Advisory -
  // it gates only the verify banner, never access.
  emailVerified: boolean;
}

export const defaultUserPreferences: UserPreferences = {
  enabledModules: ["cbt"],
  notificationsEnabledGlobal: true,
  reminderConsent: false,
  reminderConsentUpdatedAt: null,
  cbtRemindersEnabled: false,
  cbtReminderHour: 19,
  cbtReminderMinute: 0,
  cbtReminderTimezone: null,
  meditationRemindersEnabled: false,
  meditationReminderHour: 7,
  meditationReminderMinute: 0,
  meditationReminderTimezone: null,
  actRemindersEnabled: false,
  actReminderHour: 19,
  actReminderMinute: 0,
  actReminderTimezone: null,
  moodRemindersEnabled: false,
  moodReminderHour: 12,
  moodReminderMinute: 0,
  moodReminderTimezone: null,
  journalRemindersEnabled: false,
  journalReminderHour: 21,
  journalReminderMinute: 0,
  journalReminderTimezone: null,
  gratitudeRemindersEnabled: false,
  gratitudeReminderHour: 20,
  gratitudeReminderMinute: 0,
  gratitudeReminderTimezone: null,
  groundingRemindersEnabled: false,
  groundingReminderHour: 15,
  groundingReminderMinute: 0,
  groundingReminderTimezone: null,
  breathingRemindersEnabled: false,
  breathingReminderHour: 16,
  breathingReminderMinute: 0,
  breathingReminderTimezone: null,
  sleepRemindersEnabled: false,
  sleepReminderHour: 22,
  sleepReminderMinute: 0,
  sleepReminderTimezone: null,
  habitsRemindersEnabled: false,
  habitsReminderHour: 9,
  habitsReminderMinute: 0,
  habitsReminderTimezone: null,
  appOnboardingCompleted: false,
  appOnboardingCompletedVia: null,
  appOnboardingCompletedAt: null,
  cbtWizardCompleted: false,
  cbtProgramStartedAt: null,
  cbtProgramCompletedAt: null,
  cbtProgramPromptDismissedAt: null,
  cbtProgramPhaseIndex: 0,
  cbtProgramPhaseStartedAt: null,
  cbtGraduationDismissedAt: null,
  actProgramStartedAt: null,
  actProgramCompletedAt: null,
  actProgramPromptDismissedAt: null,
  actProgramPhaseIndex: 0,
  actProgramPhaseStartedAt: null,
  actGraduationDismissedAt: null,
  privacyPolicyAcceptedAt: null,
  termsAcceptedAt: null,
  policyVersionAccepted: null,
  // Never asked, which is also the right default for a brand-new account: the
  // gate has not run yet at the moment these defaults apply.
  ageFloorMet: null,
  ageAttestedCountry: null,
  ageAttestedAt: null,
  cookieConsent: null,
  language: "en",
  languageExplicit: false,
  theme: null,
  selectedConcerns: [],
  activeStrategies: [],
  startHereDismissedAt: null,
  shownButtonTours: [],
  reminderPromptedTools: [],
  starterRoutineOffered: false,
  breathSoundId: "guided",
  ambientSoundId: "none",
  breathVolume: 0.7,
  ambientVolume: 0.5,
  lastBreathingPatternId: null,
  breathingCycles: null,
  meditationIntervalBellMinutes: 0,
  meditationBellAtHalf: false,
  hapticCues: false,
  bellVolume: 1,
  meditationAmbientSoundId: "none",
  meditationAmbientVolume: 0.5,
  emailVerified: false,
};

const VALID_MODULES: ModuleKey[] = ["cbt", "meditation", "gratitude", "act"];

export function sanitizeEnabledModules(value: unknown): ModuleKey[] {
  if (!Array.isArray(value)) return ["cbt"];
  const filtered = value.filter((m): m is ModuleKey => VALID_MODULES.includes(m as ModuleKey));
  if (!filtered.includes("cbt")) filtered.unshift("cbt");
  return Array.from(new Set(filtered));
}

export function mergeUserPreferences(
  preferences: UserPreferences | null | undefined,
  patch: Partial<UserPreferences>,
): UserPreferences {
  return {
    ...defaultUserPreferences,
    ...preferences,
    ...patch,
  };
}
