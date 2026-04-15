export type ModuleKey = "cbt";

export interface UserPreferences {
  enabledModules: ModuleKey[];
  reminderConsent: boolean;
  cbtRemindersEnabled: boolean;
  cbtReminderHour: number;
  cbtReminderMinute: number;
}

export const defaultUserPreferences: UserPreferences = {
  enabledModules: ["cbt"],
  reminderConsent: false,
  cbtRemindersEnabled: false,
  cbtReminderHour: 19,
  cbtReminderMinute: 0,
};
