export type ModuleKey = "cbt";

export interface CookieConsent {
  essential: true;
  analytics: boolean;
  acceptedAt: string;
}

export interface UserPreferences {
  enabledModules: ModuleKey[];
  reminderConsent: boolean;
  reminderConsentUpdatedAt: string | null;
  cbtRemindersEnabled: boolean;
  cbtReminderHour: number;
  cbtReminderMinute: number;
  cbtReminderTimezone: string | null;
  appOnboardingCompleted: boolean;
  cbtOnboardingCompleted: boolean;
  privacyPolicyAcceptedAt: string | null;
  termsAcceptedAt: string | null;
  policyVersionAccepted: string | null;
  cookieConsent: CookieConsent | null;
  language: string;
}

export const defaultUserPreferences: UserPreferences = {
  enabledModules: ["cbt"],
  reminderConsent: false,
  reminderConsentUpdatedAt: null,
  cbtRemindersEnabled: false,
  cbtReminderHour: 19,
  cbtReminderMinute: 0,
  cbtReminderTimezone: null,
  appOnboardingCompleted: false,
  cbtOnboardingCompleted: false,
  privacyPolicyAcceptedAt: null,
  termsAcceptedAt: null,
  policyVersionAccepted: null,
  cookieConsent: null,
  language: "en",
};

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
