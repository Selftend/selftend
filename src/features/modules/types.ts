export type ModuleKey = "cbt";

export interface CookieConsent {
  essential: true;
  analytics: boolean;
  acceptedAt: string;
}

export interface UserPreferences {
  enabledModules: ModuleKey[];
  reminderConsent: boolean;
  cbtRemindersEnabled: boolean;
  cbtReminderHour: number;
  cbtReminderMinute: number;
  privacyPolicyAcceptedAt: string | null;
  termsAcceptedAt: string | null;
  policyVersionAccepted: string | null;
  cookieConsent: CookieConsent | null;
}

export const defaultUserPreferences: UserPreferences = {
  enabledModules: ["cbt"],
  reminderConsent: false,
  cbtRemindersEnabled: false,
  cbtReminderHour: 19,
  cbtReminderMinute: 0,
  privacyPolicyAcceptedAt: null,
  termsAcceptedAt: null,
  policyVersionAccepted: null,
  cookieConsent: null,
};
