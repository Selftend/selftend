import { defaultUserPreferences } from "@/src/features/modules/types";
import {
  deleteWebPushSubscription,
  getUserPreferences,
  updateUserPreferences,
  upsertWebPushSubscription,
} from "@/src/features/settings/repository";
import { requireSupabase } from "@/src/lib/supabase";

jest.mock("@/src/features/profile/repository", () => ({
  removeCurrentUserUploadedAvatar: jest.fn(),
}));

jest.mock("@/src/lib/supabase", () => ({
  requireSupabase: jest.fn(),
}));

const mockRequireSupabase = jest.mocked(requireSupabase);

function mockPreferenceSelect(data: unknown) {
  const maybeSingle = jest.fn().mockResolvedValue({ data, error: null });
  const eq = jest.fn(() => ({ maybeSingle }));
  const select = jest.fn(() => ({ eq }));
  const from = jest.fn(() => ({ select }));

  mockRequireSupabase.mockReturnValue({ from } as unknown as ReturnType<typeof requireSupabase>);

  return { eq, from, maybeSingle, select };
}

function mockPreferenceUpdate(data: unknown) {
  const single = jest.fn().mockResolvedValue({ data, error: null });
  const select = jest.fn(() => ({ single }));
  const upsert = jest.fn(() => ({ select }));
  const from = jest.fn(() => ({ upsert }));

  mockRequireSupabase.mockReturnValue({ from } as unknown as ReturnType<typeof requireSupabase>);

  return { from, select, single, upsert };
}

function mockWebPushUpsert() {
  const upsert = jest.fn().mockResolvedValue({ error: null });
  const from = jest.fn(() => ({ upsert }));

  mockRequireSupabase.mockReturnValue({ from } as unknown as ReturnType<typeof requireSupabase>);

  return { from, upsert };
}

function mockWebPushDelete() {
  const eqEndpoint = jest.fn().mockResolvedValue({ error: null });
  const eqUser = jest.fn(() => ({ eq: eqEndpoint }));
  const deleteFn = jest.fn(() => ({ eq: eqUser }));
  const from = jest.fn(() => ({ delete: deleteFn }));

  mockRequireSupabase.mockReturnValue({ from } as unknown as ReturnType<typeof requireSupabase>);

  return { deleteFn, eqEndpoint, eqUser, from };
}

describe("settings repository", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("defaults onboarding flags to incomplete when no preferences row exists", async () => {
    mockPreferenceSelect(null);

    await expect(getUserPreferences("user-1")).resolves.toEqual(defaultUserPreferences);
  });

  it("maps onboarding flags from the user_preferences row", async () => {
    mockPreferenceSelect({
      app_onboarding_completed: true,
      cbt_onboarding_completed: false,
      cbt_reminder_hour: 8,
      cbt_reminder_minute: 30,
      cbt_reminder_timezone: "Europe/Sofia",
      cbt_reminders_enabled: true,
      cookie_consent: null,
      enabled_modules: ["cbt"],
      language: "bg",
      policy_version_accepted: "2026-05-01",
      privacy_policy_accepted_at: "2026-05-01T10:00:00.000Z",
      reminder_consent: true,
      reminder_consent_updated_at: "2026-05-01T10:05:00.000Z",
      terms_accepted_at: "2026-05-01T10:00:00.000Z",
      user_id: "user-1",
    });

    await expect(getUserPreferences("user-1")).resolves.toMatchObject({
      appOnboardingCompleted: true,
      cbtOnboardingCompleted: false,
      cbtReminderTimezone: "Europe/Sofia",
      language: "bg",
      reminderConsentUpdatedAt: "2026-05-01T10:05:00.000Z",
    });
  });

  it("includes onboarding flags when updating preferences", async () => {
    const updatedRow = {
      app_onboarding_completed: true,
      cbt_onboarding_completed: true,
      cbt_reminder_hour: 19,
      cbt_reminder_minute: 0,
      cbt_reminder_timezone: null,
      cbt_reminders_enabled: false,
      cookie_consent: null,
      enabled_modules: ["cbt"],
      language: "en",
      policy_version_accepted: null,
      privacy_policy_accepted_at: null,
      reminder_consent: false,
      reminder_consent_updated_at: null,
      terms_accepted_at: null,
      user_id: "user-1",
    };
    const { upsert } = mockPreferenceUpdate(updatedRow);

    await updateUserPreferences("user-1", {
      ...defaultUserPreferences,
      appOnboardingCompleted: true,
      cbtOnboardingCompleted: true,
      cbtReminderTimezone: "Europe/Sofia",
      reminderConsent: true,
      reminderConsentUpdatedAt: "2026-05-01T10:05:00.000Z",
    });

    expect(upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        app_onboarding_completed: true,
        cbt_onboarding_completed: true,
        cbt_reminder_timezone: "Europe/Sofia",
        reminder_consent: true,
        reminder_consent_updated_at: "2026-05-01T10:05:00.000Z",
        user_id: "user-1",
      }),
      { onConflict: "user_id" },
    );
  });

  it("upserts web push subscriptions for the current user", async () => {
    const { upsert } = mockWebPushUpsert();

    await upsertWebPushSubscription("user-1", {
      auth: "auth-secret",
      endpoint: "https://push.example/subscription",
      p256dh: "p256dh-key",
      timeZone: "Europe/Sofia",
      userAgent: "jest-browser",
    });

    expect(upsert).toHaveBeenCalledWith(
      {
        auth: "auth-secret",
        enabled: true,
        endpoint: "https://push.example/subscription",
        p256dh: "p256dh-key",
        time_zone: "Europe/Sofia",
        user_agent: "jest-browser",
        user_id: "user-1",
      },
      { onConflict: "endpoint" },
    );
  });

  it("deletes the current user's web push subscription by endpoint", async () => {
    const { eqEndpoint, eqUser } = mockWebPushDelete();

    await deleteWebPushSubscription("user-1", "https://push.example/subscription");

    expect(eqUser).toHaveBeenCalledWith("user_id", "user-1");
    expect(eqEndpoint).toHaveBeenCalledWith("endpoint", "https://push.example/subscription");
  });
});
