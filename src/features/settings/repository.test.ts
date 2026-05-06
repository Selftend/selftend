import { defaultUserPreferences } from "@/src/features/modules/types";
import { getUserPreferences, updateUserPreferences } from "@/src/features/settings/repository";
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
      cbt_reminders_enabled: true,
      cookie_consent: null,
      enabled_modules: ["cbt"],
      language: "bg",
      policy_version_accepted: "2026-05-01",
      privacy_policy_accepted_at: "2026-05-01T10:00:00.000Z",
      reminder_consent: true,
      terms_accepted_at: "2026-05-01T10:00:00.000Z",
      user_id: "user-1",
    });

    await expect(getUserPreferences("user-1")).resolves.toMatchObject({
      appOnboardingCompleted: true,
      cbtOnboardingCompleted: false,
      language: "bg",
    });
  });

  it("includes onboarding flags when updating preferences", async () => {
    const updatedRow = {
      app_onboarding_completed: true,
      cbt_onboarding_completed: true,
      cbt_reminder_hour: 19,
      cbt_reminder_minute: 0,
      cbt_reminders_enabled: false,
      cookie_consent: null,
      enabled_modules: ["cbt"],
      language: "en",
      policy_version_accepted: null,
      privacy_policy_accepted_at: null,
      reminder_consent: false,
      terms_accepted_at: null,
      user_id: "user-1",
    };
    const { upsert } = mockPreferenceUpdate(updatedRow);

    await updateUserPreferences("user-1", {
      ...defaultUserPreferences,
      appOnboardingCompleted: true,
      cbtOnboardingCompleted: true,
    });

    expect(upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        app_onboarding_completed: true,
        cbt_onboarding_completed: true,
        user_id: "user-1",
      }),
      { onConflict: "user_id" },
    );
  });
});
