export type ModuleKey = "cbt" | "meditation" | "gratitude" | "act";

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
  selectedConcerns: string[];
  activeStrategies: string[];
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
  selectedConcerns: [],
  activeStrategies: [],
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
