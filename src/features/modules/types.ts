export type ModuleKey = "cbt" | "meditation" | "gratitude" | "act";

export type ButtonTourKey = "tune" | "notifications" | "program" | "info";

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
  actOnboardingCompleted: boolean;
  actRemindersEnabled: boolean;
  actReminderHour: number;
  actReminderMinute: number;
  actReminderTimezone: string | null;
  appOnboardingCompleted: boolean;
  cbtOnboardingCompleted: boolean;
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
  meditationOnboardingCompleted: boolean;
  meditationInfoCompleted: boolean;
  gratitudeOnboardingCompleted: boolean;
  habitsOnboardingCompleted: boolean;
  moodOnboardingCompleted: boolean;
  journalOnboardingCompleted: boolean;
  sleepOnboardingCompleted: boolean;
  mindfulnessOnboardingCompleted: boolean;
  groundingOnboardingCompleted: boolean;
  privacyPolicyAcceptedAt: string | null;
  termsAcceptedAt: string | null;
  policyVersionAccepted: string | null;
  cookieConsent: CookieConsent | null;
  language: string;
  theme: string | null;
  selectedConcerns: string[];
  activeStrategies: string[];
  shownButtonTours: ButtonTourKey[];
  breathSoundId: string;
  ambientSoundId: string;
  breathVolume: number;
  ambientVolume: number;
  lastBreathingPatternId: string | null;
  breathingCycles: number | null;
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
  actOnboardingCompleted: false,
  actRemindersEnabled: false,
  actReminderHour: 19,
  actReminderMinute: 0,
  actReminderTimezone: null,
  appOnboardingCompleted: false,
  cbtOnboardingCompleted: false,
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
  meditationOnboardingCompleted: false,
  meditationInfoCompleted: false,
  gratitudeOnboardingCompleted: false,
  habitsOnboardingCompleted: false,
  moodOnboardingCompleted: false,
  journalOnboardingCompleted: false,
  sleepOnboardingCompleted: false,
  mindfulnessOnboardingCompleted: false,
  groundingOnboardingCompleted: false,
  privacyPolicyAcceptedAt: null,
  termsAcceptedAt: null,
  policyVersionAccepted: null,
  cookieConsent: null,
  language: "en",
  theme: null,
  selectedConcerns: [],
  activeStrategies: [],
  shownButtonTours: [],
  breathSoundId: "guided",
  ambientSoundId: "none",
  breathVolume: 0.7,
  ambientVolume: 0.5,
  lastBreathingPatternId: null,
  breathingCycles: null,
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
