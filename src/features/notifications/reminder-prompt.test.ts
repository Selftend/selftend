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

  it("is never eligible for a target the cron holds out (#2260), whatever the preferences say", () => {
    // Held out = the edge function skips the target until the native build that
    // routes its url is live on both stores. Offering the reminder anyway ended
    // in "Saved" and a row nothing reads. The list is read through the shared
    // module, so this holds out a NON-DBT target to prove the guard follows the
    // list rather than a name - and to keep proving it after DBT is lifted.
    jest.isolateModules(() => {
      jest.doMock("@/src/features/notifications/reminder-rollout", () => ({
        HELD_OUT_REMINDER_TARGETS: ["mood"],
        isReminderTargetHeldOut: (target: string) => target === "mood",
      }));
      const { isReminderPromptEligible: eligible } =
        require("@/src/features/notifications/reminder-prompt") as typeof import("@/src/features/notifications/reminder-prompt");
      expect(eligible(defaultUserPreferences, "mood")).toBe(false);
      // A sibling target is untouched: the hold-out is per target, not a global off switch.
      expect(eligible(defaultUserPreferences, "journal")).toBe(true);
    });
  });

  it("holds DBT out today, straight off the real list", () => {
    expect(isReminderPromptEligible(defaultUserPreferences, "dbt")).toBe(false);
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
