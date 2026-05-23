import { defaultUserPreferences } from "@/src/features/modules/types";
import {
  deleteWebPushSubscription,
  getUserPreferences,
  updateOnboardingPreferences,
  updateShownButtonTours,
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

describe("cbt program preference fields", () => {
  it("defaults program timestamps to null", () => {
    expect(defaultUserPreferences.cbtProgramStartedAt).toBeNull();
    expect(defaultUserPreferences.cbtProgramCompletedAt).toBeNull();
    expect(defaultUserPreferences.cbtProgramPromptDismissedAt).toBeNull();
  });
});

describe("act program preference flags", () => {
  it("defaults the three act program flags to null", () => {
    expect(defaultUserPreferences.actProgramStartedAt).toBeNull();
    expect(defaultUserPreferences.actProgramCompletedAt).toBeNull();
    expect(defaultUserPreferences.actProgramPromptDismissedAt).toBeNull();
  });
});

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
      cbt_program_completed_at: null,
      cbt_program_prompt_dismissed_at: "2026-05-22T11:00:00.000Z",
      cbt_program_started_at: "2026-05-22T10:00:00.000Z",
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
      shown_button_tours: ["tune", "notifications"],
      terms_accepted_at: "2026-05-01T10:00:00.000Z",
      user_id: "user-1",
    });

    await expect(getUserPreferences("user-1")).resolves.toMatchObject({
      appOnboardingCompleted: true,
      cbtOnboardingCompleted: false,
      cbtProgramCompletedAt: null,
      cbtProgramPromptDismissedAt: "2026-05-22T11:00:00.000Z",
      cbtProgramStartedAt: "2026-05-22T10:00:00.000Z",
      cbtReminderTimezone: "Europe/Sofia",
      language: "bg",
      reminderConsentUpdatedAt: "2026-05-01T10:05:00.000Z",
      shownButtonTours: ["tune", "notifications"],
    });
  });

  it("includes onboarding flags when updating preferences", async () => {
    const updatedRow = {
      app_onboarding_completed: true,
      cbt_onboarding_completed: true,
      cbt_program_completed_at: null,
      cbt_program_prompt_dismissed_at: null,
      cbt_program_started_at: null,
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
      cbtProgramPromptDismissedAt: "2026-05-22T11:00:00.000Z",
      cbtReminderTimezone: "Europe/Sofia",
      reminderConsent: true,
      reminderConsentUpdatedAt: "2026-05-01T10:05:00.000Z",
      shownButtonTours: ["tune"],
    });

    expect(upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        app_onboarding_completed: true,
        cbt_onboarding_completed: true,
        cbt_program_prompt_dismissed_at: "2026-05-22T11:00:00.000Z",
        cbt_reminder_timezone: "Europe/Sofia",
        reminder_consent: true,
        reminder_consent_updated_at: "2026-05-01T10:05:00.000Z",
        shown_button_tours: ["tune"],
        user_id: "user-1",
      }),
      { onConflict: "user_id" },
    );
  });

  it("falls back without newer optional columns when PostgREST has stale schema cache", async () => {
    const staleSchemaError = {
      code: "PGRST204",
      message: "Could not find the 'shown_button_tours' column of 'user_preferences'",
    };
    const single = jest.fn().mockResolvedValue({ data: null, error: staleSchemaError });
    const select = jest.fn(() => ({ single }));
    const upsert = jest.fn().mockImplementation((payload: unknown) => {
      if ((payload as Record<string, unknown>).shown_button_tours) {
        return { select };
      }
      return Promise.resolve({ error: null });
    });
    const from = jest.fn(() => ({ upsert }));
    mockRequireSupabase.mockReturnValue({ from } as unknown as ReturnType<typeof requireSupabase>);

    await expect(
      updateUserPreferences("user-1", {
        ...defaultUserPreferences,
        shownButtonTours: ["tune"],
      }),
    ).resolves.toMatchObject({ shownButtonTours: ["tune"] });

    const fallbackPayload = upsert.mock.calls.at(-1)?.[0] as Record<string, unknown>;
    expect(fallbackPayload).not.toHaveProperty("act_onboarding_completed");
    expect(fallbackPayload).not.toHaveProperty("cbt_program_completed_at");
    expect(fallbackPayload).not.toHaveProperty("cbt_program_prompt_dismissed_at");
    expect(fallbackPayload).not.toHaveProperty("cbt_program_started_at");
    expect(fallbackPayload).not.toHaveProperty("shown_button_tours");
    expect(upsert.mock.calls.at(-1)?.[1]).toEqual({ onConflict: "user_id" });
  });

  it("treats CBT program columns as optional while schema caches catch up", async () => {
    const staleSchemaError = {
      code: "PGRST204",
      message: "Could not find the 'cbt_program_completed_at' column of 'user_preferences'",
    };
    const single = jest.fn().mockResolvedValue({ data: null, error: staleSchemaError });
    const select = jest.fn(() => ({ single }));
    const upsert = jest.fn().mockImplementation((payload: unknown) => {
      if ("cbt_program_completed_at" in (payload as Record<string, unknown>)) {
        return { select };
      }
      return Promise.resolve({ error: null });
    });
    const from = jest.fn(() => ({ upsert }));
    mockRequireSupabase.mockReturnValue({ from } as unknown as ReturnType<typeof requireSupabase>);

    await expect(
      updateUserPreferences("user-1", {
        ...defaultUserPreferences,
        cbtProgramStartedAt: "2026-05-22T10:00:00.000Z",
      }),
    ).resolves.toMatchObject({ cbtProgramStartedAt: "2026-05-22T10:00:00.000Z" });

    const fallbackPayload = upsert.mock.calls.at(-1)?.[0] as Record<string, unknown>;
    expect(fallbackPayload).not.toHaveProperty("cbt_program_completed_at");
    expect(fallbackPayload).not.toHaveProperty("cbt_program_prompt_dismissed_at");
    expect(fallbackPayload).not.toHaveProperty("cbt_program_started_at");
    expect(upsert.mock.calls.at(-1)?.[1]).toEqual({ onConflict: "user_id" });
  });

  it("treats ACT program columns as optional while schema caches catch up", async () => {
    const staleSchemaError = {
      code: "PGRST204",
      message: "Could not find the 'act_program_completed_at' column of 'user_preferences'",
    };
    const single = jest.fn().mockResolvedValue({ data: null, error: staleSchemaError });
    const select = jest.fn(() => ({ single }));
    const upsert = jest.fn().mockImplementation((payload: unknown) => {
      if ("act_program_completed_at" in (payload as Record<string, unknown>)) {
        return { select };
      }
      return Promise.resolve({ error: null });
    });
    const from = jest.fn(() => ({ upsert }));
    mockRequireSupabase.mockReturnValue({ from } as unknown as ReturnType<typeof requireSupabase>);

    await expect(
      updateUserPreferences("user-1", {
        ...defaultUserPreferences,
        actProgramStartedAt: "2026-05-23T10:00:00.000Z",
      }),
    ).resolves.toMatchObject({ actProgramStartedAt: "2026-05-23T10:00:00.000Z" });

    const fallbackPayload = upsert.mock.calls.at(-1)?.[0] as Record<string, unknown>;
    expect(fallbackPayload).not.toHaveProperty("act_program_completed_at");
    expect(fallbackPayload).not.toHaveProperty("act_program_prompt_dismissed_at");
    expect(fallbackPayload).not.toHaveProperty("act_program_started_at");
    expect(upsert.mock.calls.at(-1)?.[1]).toEqual({ onConflict: "user_id" });
  });

  it("updates shown button tours without sending unrelated preference columns", async () => {
    const updatedRow = {
      enabled_modules: ["cbt"],
      shown_button_tours: ["program"],
      user_id: "user-1",
    };
    const { upsert } = mockPreferenceUpdate(updatedRow);

    await expect(updateShownButtonTours("user-1", ["program"])).resolves.toMatchObject({
      shownButtonTours: ["program"],
    });

    expect(upsert).toHaveBeenCalledWith(
      {
        shown_button_tours: ["program"],
        user_id: "user-1",
      },
      { onConflict: "user_id" },
    );
  });

  it("updates onboarding flags without sending unrelated preference columns", async () => {
    const updatedRow = {
      app_onboarding_completed: false,
      cbt_onboarding_completed: false,
      enabled_modules: ["cbt"],
      shown_button_tours: [],
      user_id: "user-1",
    };
    const { upsert } = mockPreferenceUpdate(updatedRow);

    await expect(
      updateOnboardingPreferences("user-1", {
        appOnboardingCompleted: false,
        cbtOnboardingCompleted: false,
        shownButtonTours: [],
      }),
    ).resolves.toMatchObject({
      appOnboardingCompleted: false,
      cbtOnboardingCompleted: false,
      shownButtonTours: [],
    });

    expect(upsert).toHaveBeenCalledWith(
      {
        app_onboarding_completed: false,
        cbt_onboarding_completed: false,
        shown_button_tours: [],
        user_id: "user-1",
      },
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
