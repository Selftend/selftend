import { defaultUserPreferences } from "@/src/features/modules/types";
import {
  deleteDevicePushToken,
  deleteUserAccount,
  deleteWebPushSubscription,
  getUserPreferences,
  updateOnboardingPreferences,
  updateShownButtonTours,
  updateUserPreferences,
  upsertDevicePushToken,
  upsertWebPushSubscription,
} from "@/src/features/settings/repository";
import { removeCurrentUserUploadedAvatar } from "@/src/features/profile/repository";
import { requireSupabase } from "@/src/lib/supabase";

jest.mock("@/src/features/profile/repository", () => ({
  removeCurrentUserUploadedAvatar: jest.fn(),
}));

jest.mock("@/src/lib/supabase", () => ({
  requireSupabase: jest.fn(),
}));

const mockRequireSupabase = jest.mocked(requireSupabase);
const mockRemoveAvatar = jest.mocked(removeCurrentUserUploadedAvatar);

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

describe("deleteUserAccount", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("still deletes the account when client-side avatar cleanup fails (GDPR erasure must not abort)", async () => {
    mockRemoveAvatar.mockRejectedValueOnce(new Error("storage permissions not applied"));
    const rpc = jest.fn().mockResolvedValue({ error: null });
    mockRequireSupabase.mockReturnValue({ rpc } as unknown as ReturnType<typeof requireSupabase>);

    await expect(deleteUserAccount()).resolves.toBeUndefined();
    expect(rpc).toHaveBeenCalledWith("delete_user_account");
  });

  it("throws when the delete_user_account RPC returns an error", async () => {
    mockRemoveAvatar.mockResolvedValueOnce(undefined);
    const rpc = jest.fn().mockResolvedValue({ error: new Error("rpc failed") });
    mockRequireSupabase.mockReturnValue({ rpc } as unknown as ReturnType<typeof requireSupabase>);

    await expect(deleteUserAccount()).rejects.toThrow("rpc failed");
  });
});

describe("cbt program preference fields", () => {
  it("defaults program timestamps to null", () => {
    expect(defaultUserPreferences.cbtProgramStartedAt).toBeNull();
    expect(defaultUserPreferences.cbtProgramCompletedAt).toBeNull();
    expect(defaultUserPreferences.cbtProgramPromptDismissedAt).toBeNull();
  });

  it("defaults cbtProgramPhaseIndex to 0 and cbtProgramPhaseStartedAt to null", () => {
    expect(defaultUserPreferences.cbtProgramPhaseIndex).toBe(0);
    expect(defaultUserPreferences.cbtProgramPhaseStartedAt).toBeNull();
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
      cbt_program_phase_index: 2,
      cbt_program_phase_started_at: "2026-05-23T08:00:00.000Z",
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
      cbtProgramPhaseIndex: 2,
      cbtProgramPhaseStartedAt: "2026-05-23T08:00:00.000Z",
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
      cbt_program_phase_index: 0,
      cbt_program_phase_started_at: null,
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
        cbt_program_phase_index: 0,
        cbt_program_phase_started_at: null,
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

  it("maps the new per-tool reminder fields from the row", async () => {
    mockPreferenceSelect({
      user_id: "user-1",
      enabled_modules: ["cbt"],
      mood_reminders_enabled: true,
      mood_reminder_hour: 8,
      mood_reminder_minute: 30,
      mood_reminder_timezone: "Europe/Sofia",
      habits_reminders_enabled: true,
      habits_reminder_hour: 9,
      habits_reminder_minute: 15,
      habits_reminder_timezone: "UTC",
    });

    await expect(getUserPreferences("user-1")).resolves.toMatchObject({
      moodRemindersEnabled: true,
      moodReminderHour: 8,
      moodReminderMinute: 30,
      moodReminderTimezone: "Europe/Sofia",
      habitsRemindersEnabled: true,
      habitsReminderHour: 9,
      habitsReminderMinute: 15,
      habitsReminderTimezone: "UTC",
    });
  });

  it("includes the new per-tool reminder fields when updating preferences", async () => {
    const { upsert } = mockPreferenceUpdate({ user_id: "user-1", enabled_modules: ["cbt"] });

    await updateUserPreferences("user-1", {
      ...defaultUserPreferences,
      sleepRemindersEnabled: true,
      sleepReminderHour: 22,
      journalReminderMinute: 45,
    });

    expect(upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        sleep_reminders_enabled: true,
        sleep_reminder_hour: 22,
        journal_reminder_minute: 45,
        grounding_reminders_enabled: false,
        breathing_reminder_hour: 16,
      }),
      { onConflict: "user_id" },
    );
  });

  it("throws when the error is not a missing-column error (no silent retry)", async () => {
    const otherError = { code: "23505", message: "duplicate key value violates unique constraint" };
    const single = jest.fn().mockResolvedValue({ data: null, error: otherError });
    const upsert = jest.fn(() => ({ select: jest.fn(() => ({ single })) }));
    const from = jest.fn(() => ({ upsert }));
    mockRequireSupabase.mockReturnValue({ from } as unknown as ReturnType<typeof requireSupabase>);

    await expect(updateUserPreferences("user-1", { ...defaultUserPreferences })).rejects.toBe(
      otherError,
    );
    // A non-missing-column error must NOT trigger a column-strip retry.
    expect(upsert).toHaveBeenCalledTimes(1);
  });

  it("strips multiple missing columns across retries until the write succeeds", async () => {
    const missing = (col: string) => ({
      code: "PGRST204",
      message: `Could not find the '${col}' column of 'user_preferences' in the schema cache`,
    });
    const upsert = jest.fn().mockImplementation((payload: Record<string, unknown>) => {
      let error: unknown = null;
      if ("act_graduation_dismissed_at" in payload) error = missing("act_graduation_dismissed_at");
      else if ("breathing_cycles" in payload) error = missing("breathing_cycles");
      const single = jest
        .fn()
        .mockResolvedValue(
          error ? { data: null, error } : { data: { user_id: "user-1", ...payload }, error: null },
        );
      return { select: jest.fn(() => ({ single })) };
    });
    const from = jest.fn(() => ({ upsert }));
    mockRequireSupabase.mockReturnValue({ from } as unknown as ReturnType<typeof requireSupabase>);

    await expect(
      updateUserPreferences("user-1", { ...defaultUserPreferences, cbtProgramStartedAt: null }),
    ).resolves.toBeDefined();

    // full → strip act_graduation_dismissed_at → strip breathing_cycles → success
    expect(upsert).toHaveBeenCalledTimes(3);
    const retryPayload = upsert.mock.calls.at(-1)?.[0] as Record<string, unknown>;
    expect(retryPayload).not.toHaveProperty("act_graduation_dismissed_at");
    expect(retryPayload).not.toHaveProperty("breathing_cycles");
    // The program-state columns the caller is changing are PRESERVED.
    expect(retryPayload).toHaveProperty("cbt_program_started_at");
    expect(upsert.mock.calls.at(-1)?.[1]).toEqual({ onConflict: "user_id" });
  });

  it("strips ONLY the missing column and preserves the program-state write (abandon regression)", async () => {
    // Reproduces the abandon bug: a DB missing the newly-added act_graduation_dismissed_at
    // must not cause the abandon's act_program_* changes to be silently dropped.
    const missingError = {
      code: "PGRST204",
      message:
        "Could not find the 'act_graduation_dismissed_at' column of 'user_preferences' in the schema cache",
    };
    const upsert = jest.fn().mockImplementation((payload: Record<string, unknown>) => {
      const hasMissing = "act_graduation_dismissed_at" in payload;
      const single = jest
        .fn()
        .mockResolvedValue(
          hasMissing
            ? { data: null, error: missingError }
            : { data: { user_id: "user-1", ...payload }, error: null },
        );
      return { select: jest.fn(() => ({ single })) };
    });
    const from = jest.fn(() => ({ upsert }));
    mockRequireSupabase.mockReturnValue({ from } as unknown as ReturnType<typeof requireSupabase>);

    await expect(
      updateUserPreferences("user-1", {
        ...defaultUserPreferences,
        actProgramStartedAt: null,
        actProgramCompletedAt: null,
        actProgramPromptDismissedAt: "2026-06-04T00:00:00.000Z",
      }),
    ).resolves.toBeDefined();

    const retryPayload = upsert.mock.calls.at(-1)?.[0] as Record<string, unknown>;
    // Only the genuinely-missing column is dropped...
    expect(retryPayload).not.toHaveProperty("act_graduation_dismissed_at");
    // ...the abandon's program-state columns survive (the bug was that they didn't).
    expect(retryPayload).toHaveProperty("act_program_started_at");
    expect(retryPayload).toHaveProperty("act_program_completed_at");
    expect(retryPayload.act_program_prompt_dismissed_at).toBe("2026-06-04T00:00:00.000Z");
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
      { onConflict: "user_id,endpoint" },
    );
  });

  it("deletes the current user's web push subscription by endpoint", async () => {
    const { eqEndpoint, eqUser } = mockWebPushDelete();

    await deleteWebPushSubscription("user-1", "https://push.example/subscription");

    expect(eqUser).toHaveBeenCalledWith("user_id", "user-1");
    expect(eqEndpoint).toHaveBeenCalledWith("endpoint", "https://push.example/subscription");
  });

  it("upserts a device push token on conflict by expo_push_token", async () => {
    const { upsert } = mockWebPushUpsert();

    await upsertDevicePushToken("user-1", {
      token: "ExponentPushToken[abc]",
      platform: "android",
      timeZone: "Europe/Sofia",
    });

    expect(upsert).toHaveBeenCalledWith(
      {
        user_id: "user-1",
        expo_push_token: "ExponentPushToken[abc]",
        platform: "android",
        time_zone: "Europe/Sofia",
        enabled: true,
      },
      { onConflict: "expo_push_token" },
    );
  });

  it("deletes a device push token by token", async () => {
    const { eqEndpoint, eqUser } = mockWebPushDelete();

    await deleteDevicePushToken("user-1", "ExponentPushToken[abc]");

    expect(eqUser).toHaveBeenCalledWith("user_id", "user-1");
    expect(eqEndpoint).toHaveBeenCalledWith("expo_push_token", "ExponentPushToken[abc]");
  });
});
