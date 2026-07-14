import { defaultUserPreferences } from "@/src/features/modules/types";
import {
  isReminderPromptEligible,
  roundToNearestHalfHour,
} from "@/src/features/notifications/reminder-prompt";

describe("isReminderPromptEligible", () => {
  it("is eligible when the tool reminder is off, never prompted, and consent is untouched", () => {
    expect(isReminderPromptEligible(defaultUserPreferences, "mood")).toBe(true);
  });

  it("is not eligible when a reminder is already enabled for the tool", () => {
    const preferences = { ...defaultUserPreferences, moodRemindersEnabled: true };
    expect(isReminderPromptEligible(preferences, "mood")).toBe(false);
  });

  it("is not eligible when the tool was already prompted", () => {
    const preferences = { ...defaultUserPreferences, reminderPromptedTools: ["mood"] };
    expect(isReminderPromptEligible(preferences, "mood")).toBe(false);
  });

  it("stays eligible for other tools when a different tool was prompted", () => {
    const preferences = { ...defaultUserPreferences, reminderPromptedTools: ["mood"] };
    expect(isReminderPromptEligible(preferences, "journal")).toBe(true);
  });

  it("is not eligible when reminder consent was explicitly declined", () => {
    const preferences = {
      ...defaultUserPreferences,
      reminderConsent: false,
      reminderConsentUpdatedAt: "2026-07-01T10:00:00.000Z",
    };
    expect(isReminderPromptEligible(preferences, "mood")).toBe(false);
  });

  it("stays eligible when consent was granted earlier", () => {
    const preferences = {
      ...defaultUserPreferences,
      reminderConsent: true,
      reminderConsentUpdatedAt: "2026-07-01T10:00:00.000Z",
    };
    expect(isReminderPromptEligible(preferences, "mood")).toBe(true);
  });

  it("is not eligible when global notifications are switched off", () => {
    const preferences = { ...defaultUserPreferences, notificationsEnabledGlobal: false };
    expect(isReminderPromptEligible(preferences, "mood")).toBe(false);
  });
});

describe("roundToNearestHalfHour", () => {
  it("rounds down when closer to the previous half hour", () => {
    expect(roundToNearestHalfHour(new Date(2026, 6, 14, 14, 40))).toEqual({
      hour: 14,
      minute: 30,
    });
  });

  it("rounds up when closer to the next half hour", () => {
    expect(roundToNearestHalfHour(new Date(2026, 6, 14, 14, 50))).toEqual({ hour: 15, minute: 0 });
  });

  it("rounds up on the exact midpoint", () => {
    expect(roundToNearestHalfHour(new Date(2026, 6, 14, 14, 15))).toEqual({
      hour: 14,
      minute: 30,
    });
  });

  it("keeps an exact half hour unchanged", () => {
    expect(roundToNearestHalfHour(new Date(2026, 6, 14, 9, 30))).toEqual({ hour: 9, minute: 30 });
  });

  it("wraps to midnight near the end of the day", () => {
    expect(roundToNearestHalfHour(new Date(2026, 6, 14, 23, 50))).toEqual({ hour: 0, minute: 0 });
  });
});
