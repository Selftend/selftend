import { defaultUserPreferences } from "@/src/features/modules/types";
import { REPLAY_INTRODUCTION_PREFERENCES } from "@/src/features/settings/onboarding-reset";
import {
  deleteDevicePushToken,
  deleteUserAccount,
  deleteWebPushSubscription,
  getUserPreferences,
  PREFERENCES_READ_TIMEOUT_MS,
  recordAgeAttestation,
  recordPolicyConsent,
  updateOnboardingPreferences,
  updateUserPreferences,
  upsertDevicePushToken,
  upsertWebPushSubscription,
} from "@/src/features/settings/repository";
import { removeCurrentUserUploadedAvatar } from "@/src/features/profile/repository";
// The real filter, not a stand-in: what this file pins is that the two abort
// causes land on OPPOSITE sides of it.
import { captureError, isReportableError } from "@/src/lib/sentry";
import { requireSupabase } from "@/src/lib/supabase";

jest.mock("@/src/features/profile/repository", () => ({
  removeCurrentUserUploadedAvatar: jest.fn(),
}));

jest.mock("@/src/lib/supabase", () => ({
  requireSupabase: jest.fn(),
}));

jest.mock("@/src/lib/sentry", () => ({
  captureError: jest.fn(),
  // The real predicate, so "offline is not reported" is tested against the rule
  // the rest of the app reports by rather than against a stub of it - which is
  // also why this file imports it directly above.
  isReportableError: jest.requireActual("@/src/lib/sentry").isReportableError,
}));

const mockRequireSupabase = jest.mocked(requireSupabase);
const mockRemoveAvatar = jest.mocked(removeCurrentUserUploadedAvatar);

function mockPreferenceSelect(data: unknown) {
  const maybeSingle = jest.fn().mockResolvedValue({ data, error: null });
  const abortSignal = jest.fn(() => ({ maybeSingle }));
  const eq = jest.fn(() => ({ abortSignal }));
  const select = jest.fn(() => ({ eq }));
  const from = jest.fn(() => ({ select }));

  mockRequireSupabase.mockReturnValue({ from } as unknown as ReturnType<typeof requireSupabase>);

  return { abortSignal, eq, from, maybeSingle, select };
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

/**
 * ☠️☠️ #2251. The read decides both legal gates, and the whole app sits behind
 * `PreferencesUnavailableScreen` while it is unknown - so a request that
 * black-holes has to END. Android's OkHttp ships with zero timeouts and a
 * browser `fetch` has none, and TanStack's `retry: 1` retries a rejection, not
 * a hang. Two things close it: the caller's signal reaches PostgREST (so a
 * cancelled query stops on the wire rather than only in the cache), and the
 * read gives up on its own after `PREFERENCES_READ_TIMEOUT_MS`.
 */
describe("getUserPreferences on the wire", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  /** A PostgREST read that only ever returns the way an aborted fetch does. */
  function mockHungPreferenceSelect() {
    let handed: AbortSignal | undefined;
    const maybeSingle = jest.fn(
      () =>
        new Promise((resolve) => {
          handed?.addEventListener("abort", () =>
            resolve({
              data: null,
              error: { message: "AbortError: The user aborted a request.", code: "" },
            }),
          );
        }),
    );
    const abortSignal = jest.fn((signal: AbortSignal) => {
      handed = signal;
      return { maybeSingle };
    });
    const eq = jest.fn(() => ({ abortSignal }));
    const select = jest.fn(() => ({ eq }));
    const from = jest.fn(() => ({ select }));
    mockRequireSupabase.mockReturnValue({ from } as unknown as ReturnType<typeof requireSupabase>);
    return { abortSignal, signal: () => handed };
  }

  it("hands PostgREST a signal, and aborts it when the caller's signal aborts", async () => {
    const wire = mockHungPreferenceSelect();
    const caller = new AbortController();

    const read = getUserPreferences("user-1", { signal: caller.signal });
    expect(wire.abortSignal).toHaveBeenCalledTimes(1);
    expect(wire.signal()?.aborted).toBe(false);

    caller.abort();

    expect(wire.signal()?.aborted).toBe(true);
    await expect(read).rejects.toMatchObject({ name: "AbortError" });
  });

  it("gives up on a read that has hung for PREFERENCES_READ_TIMEOUT_MS", async () => {
    const wire = mockHungPreferenceSelect();

    const read = getUserPreferences("user-1");
    jest.advanceTimersByTime(PREFERENCES_READ_TIMEOUT_MS - 1);
    expect(wire.signal()?.aborted).toBe(false);

    jest.advanceTimersByTime(1);

    expect(wire.signal()?.aborted).toBe(true);
    // ☠️☠️ This assertion used to read `{ name: "AbortError" }`, with a comment
    // saying the name was chosen so the Sentry filter would read the timeout as
    // an aborted fetch. It ENCODED the defect: `isReportableError` drops every
    // `AbortError`, so the deadline this release put in front of the whole app
    // could expire on a real population and produce no signal anywhere. The
    // timeout now has a name of its own; the assertion says so.
    await expect(read).rejects.toMatchObject({ name: "PreferencesReadTimeoutError" });
  });

  /**
   * ☠️☠️ The two abort causes report DIFFERENTLY, and this is the coupling that
   * says so. `PREFERENCES_READ_TIMEOUT_MS` is a threshold this project picked
   * for the read that gates both legal gates, and it cannot be validated or
   * corrected after release without an event when it fires - the app has no
   * other channel for it (no crash, and Play vitals reports nothing here).
   *
   * ⚠️ The other direction is the one #1548's narrowing bought and must keep:
   * a cancellation the app asked for, and an ordinary offline failure, stay
   * filtered. Reporting a timeout must not drag those back in.
   */
  it("makes the timeout reportable while a cancellation and an offline read stay filtered", async () => {
    const wire = mockHungPreferenceSelect();

    const timedOut = getUserPreferences("user-1");
    jest.advanceTimersByTime(PREFERENCES_READ_TIMEOUT_MS);
    await expect(timedOut.then(() => null).catch(isReportableError)).resolves.toBe(true);

    const cancelledWire = mockHungPreferenceSelect();
    const caller = new AbortController();
    const cancelled = getUserPreferences("user-1", { signal: caller.signal });
    caller.abort();
    expect(cancelledWire.signal()?.aborted).toBe(true);
    await expect(cancelled.then(() => null).catch(isReportableError)).resolves.toBe(false);

    // And the plain offline shape PostgREST rejects with, unchanged by any of this.
    expect(isReportableError(new TypeError("Network request failed"))).toBe(false);
    expect(wire.signal()?.aborted).toBe(true);
  });

  it("does not fire the timeout on a read that has already answered", async () => {
    mockPreferenceSelect({ user_id: "user-1" });

    await expect(getUserPreferences("user-1")).resolves.toMatchObject({ ageFloorMet: null });

    // Nothing left on the clock: a resolved read has cleared its own timer.
    expect(jest.getTimerCount()).toBe(0);
  });

  it("throws the PostgREST error unchanged when the read failed on its own", async () => {
    const { maybeSingle } = mockPreferenceSelect(null);
    maybeSingle.mockResolvedValue({ data: null, error: { message: "boom", code: "PGRST000" } });

    await expect(getUserPreferences("user-1")).rejects.toEqual({
      message: "boom",
      code: "PGRST000",
    });
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

// What a preferences write puts on the wire. These two lived under the reminder
// prompt's describe by accretion; the prompt's own column mapping went with the
// column in #2343 (ADR-0008), and they are what was always general.
describe("updateUserPreferences sends a patch, not a row", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("writes ONLY the patched columns - a partial patch must not carry the whole row", async () => {
    // The lost-update guarantee behind #57: a concurrent writer's columns (another
    // device, the e2e fixtures' normalization) must never be overwritten by fields
    // the caller did not change.
    const { upsert } = mockPreferenceUpdate({ user_id: "user-1" });

    await updateUserPreferences("user-1", { theme: "dark" });

    expect(upsert).toHaveBeenCalledWith({ user_id: "user-1", theme: "dark" }, expect.anything());
  });

  it("ignores derived preference fields that have no column", async () => {
    const { upsert } = mockPreferenceUpdate({ user_id: "user-1" });

    await updateUserPreferences("user-1", { language: "en", languageExplicit: true });

    expect(upsert).toHaveBeenCalledWith({ user_id: "user-1", language: "en" }, expect.anything());
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

  it("maps app onboarding state from the user_preferences row", async () => {
    mockPreferenceSelect({
      app_onboarding_completed: true,
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

  it("includes app onboarding state when updating preferences", async () => {
    const updatedRow = {
      app_onboarding_completed: true,
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
      cbtProgramPromptDismissedAt: "2026-05-22T11:00:00.000Z",
      cbtReminderTimezone: "Europe/Sofia",
      reminderConsent: true,
      reminderConsentUpdatedAt: "2026-05-01T10:05:00.000Z",
      shownButtonTours: ["tune"],
    });

    expect(upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        app_onboarding_completed: true,
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

  it("updates onboarding state without sending unrelated preference columns", async () => {
    const updatedRow = {
      app_onboarding_completed: false,
      app_onboarding_completed_via: "skip",
      enabled_modules: ["cbt"],
      user_id: "user-1",
    };
    const { upsert } = mockPreferenceUpdate(updatedRow);

    await expect(
      updateOnboardingPreferences("user-1", {
        appOnboardingCompleted: false,
        appOnboardingCompletedVia: "skip",
      }),
    ).resolves.toMatchObject({
      appOnboardingCompleted: false,
      appOnboardingCompletedVia: "skip",
    });

    expect(upsert).toHaveBeenCalledWith(
      {
        app_onboarding_completed: false,
        app_onboarding_completed_via: "skip",
        user_id: "user-1",
      },
      { onConflict: "user_id" },
    );
  });

  it("languageExplicit is false when row.language is null", async () => {
    mockPreferenceSelect({
      user_id: "user-1",
      enabled_modules: ["cbt"],
      language: null,
    });

    const result = await getUserPreferences("user-1");
    expect(result.languageExplicit).toBe(false);
  });

  it("languageExplicit is true when row.language is set", async () => {
    mockPreferenceSelect({
      user_id: "user-1",
      enabled_modules: ["cbt"],
      language: "bg",
    });

    const result = await getUserPreferences("user-1");
    expect(result.languageExplicit).toBe(true);
  });

  it("maps start_here_dismissed_at from the row", async () => {
    mockPreferenceSelect({
      user_id: "user-1",
      enabled_modules: ["cbt"],
      start_here_dismissed_at: "2026-07-02T10:00:00Z",
    });

    const result = await getUserPreferences("user-1");
    expect(result.startHereDismissedAt).toBe("2026-07-02T10:00:00Z");
  });

  it("defaults startHereDismissedAt to null when column absent from row", async () => {
    mockPreferenceSelect({
      user_id: "user-1",
      enabled_modules: ["cbt"],
    });

    const result = await getUserPreferences("user-1");
    expect(result.startHereDismissedAt).toBeNull();
  });

  it("maps app_onboarding_completed_via and _at", async () => {
    mockPreferenceSelect({
      user_id: "user-1",
      enabled_modules: ["cbt"],
      app_onboarding_completed_via: "finish",
      app_onboarding_completed_at: "2026-07-03T10:00:00Z",
    });

    const result = await getUserPreferences("user-1");
    expect(result.appOnboardingCompletedVia).toBe("finish");
    expect(result.appOnboardingCompletedAt).toBe("2026-07-03T10:00:00Z");
  });

  it("defaults the funnel fields to null when columns absent", async () => {
    mockPreferenceSelect({
      user_id: "user-1",
      enabled_modules: ["cbt"],
    });

    const result = await getUserPreferences("user-1");
    expect(result.appOnboardingCompletedVia).toBeNull();
    expect(result.appOnboardingCompletedAt).toBeNull();
  });

  it("updateOnboardingPreferences writes the funnel columns when defined", async () => {
    const { upsert } = mockPreferenceUpdate({
      user_id: "user-1",
      enabled_modules: ["cbt"],
      app_onboarding_completed_via: "skip",
      app_onboarding_completed_at: "2026-07-03T10:00:00Z",
    });

    await updateOnboardingPreferences("user-1", {
      appOnboardingCompletedVia: "skip",
      appOnboardingCompletedAt: "2026-07-03T10:00:00Z",
    });

    expect(upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        app_onboarding_completed_via: "skip",
        app_onboarding_completed_at: "2026-07-03T10:00:00Z",
        user_id: "user-1",
      }),
      { onConflict: "user_id" },
    );
  });

  it("updateOnboardingPreferences writes start_here_dismissed_at", async () => {
    const { upsert } = mockPreferenceUpdate({
      user_id: "user-1",
      enabled_modules: ["cbt"],
      start_here_dismissed_at: "2026-07-02T10:00:00Z",
    });

    await updateOnboardingPreferences("user-1", {
      startHereDismissedAt: "2026-07-02T10:00:00Z",
    } as Parameters<typeof updateOnboardingPreferences>[1]);

    expect(upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        start_here_dismissed_at: "2026-07-02T10:00:00Z",
        user_id: "user-1",
      }),
      { onConflict: "user_id" },
    );
  });

  it("carries the Settings onboarding action through to its column", async () => {
    const { upsert } = mockPreferenceUpdate({
      user_id: "user-1",
      enabled_modules: ["cbt"],
    });

    await updateOnboardingPreferences("user-1", REPLAY_INTRODUCTION_PREFERENCES);

    expect(upsert).toHaveBeenNthCalledWith(
      1,
      {
        app_onboarding_completed: false,
        user_id: "user-1",
      },
      { onConflict: "user_id" },
    );
    expect(upsert).toHaveBeenCalledTimes(1);
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

  it("claims a device push token via the takeover RPC (reassigns it to the caller)", async () => {
    const rpc = jest.fn().mockResolvedValue({ error: null });
    mockRequireSupabase.mockReturnValue({ rpc } as unknown as ReturnType<typeof requireSupabase>);

    await upsertDevicePushToken("user-1", {
      token: "ExponentPushToken[abc]",
      platform: "android",
      timeZone: "Europe/Sofia",
    });

    // A direct upsert collided across accounts on the globally-unique token; the
    // SECURITY DEFINER RPC takes it over for auth.uid() instead (no user_id passed).
    expect(rpc).toHaveBeenCalledWith("claim_device_push_token", {
      p_token: "ExponentPushToken[abc]",
      p_platform: "android",
      p_time_zone: "Europe/Sofia",
    });
  });

  it("deletes a device push token by token", async () => {
    const { eqEndpoint, eqUser } = mockWebPushDelete();

    await deleteDevicePushToken("user-1", "ExponentPushToken[abc]");

    expect(eqUser).toHaveBeenCalledWith("user_id", "user-1");
    expect(eqEndpoint).toHaveBeenCalledWith("expo_push_token", "ExponentPushToken[abc]");
  });
});

describe("age attestation preferences (#1762)", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("maps the three age-attestation columns from the user_preferences row", async () => {
    mockPreferenceSelect({
      age_attested_at: "2026-09-03T10:00:00.000Z",
      age_attested_country: "DE",
      age_floor_met: true,
      user_id: "user-1",
    });

    await expect(getUserPreferences("user-1")).resolves.toMatchObject({
      ageAttestedAt: "2026-09-03T10:00:00.000Z",
      ageAttestedCountry: "DE",
      ageFloorMet: true,
    });
  });

  it("leaves an account that predates the gate at null, NOT at false", async () => {
    // The whole point of the nullable column. Every account that exists today
    // has never been asked, and §7 never asks them: `false` would assert they
    // FAILED their floor, and a gate reading `=== true` would lock out the
    // install base. A Boolean() coercion in the mapper - the shape hapticCues
    // and the other flags use - is exactly the bug this catches.
    mockPreferenceSelect({ user_id: "user-1" });

    const prefs = await getUserPreferences("user-1");

    expect(prefs.ageFloorMet).toBeNull();
    expect(prefs.ageAttestedCountry).toBeNull();
    expect(prefs.ageAttestedAt).toBeNull();
  });

  it("keeps an explicit false distinct from never-asked", async () => {
    mockPreferenceSelect({ age_floor_met: false, user_id: "user-1" });

    await expect(getUserPreferences("user-1")).resolves.toMatchObject({ ageFloorMet: false });
  });

  it("defaults to never-asked", () => {
    expect(defaultUserPreferences.ageFloorMet).toBeNull();
    expect(defaultUserPreferences.ageAttestedCountry).toBeNull();
    expect(defaultUserPreferences.ageAttestedAt).toBeNull();
  });

  it("writes the attestation columns when the gate records a verdict", async () => {
    const { upsert } = mockPreferenceUpdate({ user_id: "user-1" });

    await updateUserPreferences("user-1", {
      ageAttestedAt: "2026-09-03T10:00:00.000Z",
      ageAttestedCountry: "BG",
      ageFloorMet: true,
    });

    expect(upsert).toHaveBeenCalledWith(
      {
        age_attested_at: "2026-09-03T10:00:00.000Z",
        age_attested_country: "BG",
        age_floor_met: true,
        user_id: "user-1",
      },
      expect.anything(),
    );
  });
});

describe("recordAgeAttestation", () => {
  // `captureError` is a module-level mock, so without this the "offline is not
  // reported" case reads the call the test before it made and passes or fails
  // on its neighbour's behaviour.
  beforeEach(() => {
    jest.clearAllMocks();
  });

  function mockAttestationUpsert(error: unknown = null) {
    const upsert = jest.fn().mockResolvedValue({ error });
    // The `account_origin` stamp beside it: update -> eq -> is, resolving the
    // PostgREST way (an `error` field, not a rejection).
    const is = jest.fn().mockResolvedValue({ error: null });
    const eq = jest.fn(() => ({ is }));
    const update = jest.fn(() => ({ eq }));
    const from = jest.fn(() => ({ upsert, update }));

    mockRequireSupabase.mockReturnValue({ from } as unknown as ReturnType<typeof requireSupabase>);

    return { eq, from, is, update, upsert };
  }

  it("writes the verdict, the country and the moment - and nothing else", async () => {
    const { from, upsert } = mockAttestationUpsert();

    await recordAgeAttestation("user-1", "DE", "native_cold_start");

    expect(from).toHaveBeenCalledWith("user_preferences");
    const [payload] = upsert.mock.calls[0];
    expect(payload).toEqual({
      user_id: "user-1",
      age_floor_met: true,
      age_attested_country: "DE",
      age_attested_at: expect.any(String),
    });
    // ☠️ The whole payload is asserted, not just its known keys: the date of
    // birth reaching the database is the one failure §3 rules out outright, and
    // a `toMatchObject` here would not notice it arriving.
    //
    // ⚠️ It is also what keeps `account_origin` OUT of the upsert. Folding it
    // in would look tidier and would overwrite the value on every later gate
    // pass - the one thing #2323 forbids.
    expect(Object.keys(payload)).toHaveLength(4);
  });

  it("normalises the country rather than letting the column check reject it", async () => {
    const { upsert } = mockAttestationUpsert();

    await recordAgeAttestation("user-1", " bg ", "native_cold_start");

    expect(upsert.mock.calls[0][0]).toMatchObject({ age_attested_country: "BG" });
  });

  it("throws rather than reporting a write that did not happen", async () => {
    // Deliberately not `updateUserPreferences`, whose missing-column retry
    // would drop `age_floor_met` and resolve - which a caller would read as
    // "attested" against a row that says nothing of the kind.
    mockAttestationUpsert({ message: "column does not exist" });

    await expect(recordAgeAttestation("user-1", "DE", "native_cold_start")).rejects.toEqual({
      message: "column does not exist",
    });
  });

  it("stamps the origin only where the column is still null (#2323)", async () => {
    const { eq, is, update } = mockAttestationUpsert();

    await recordAgeAttestation("user-1", "DE", "web_cta");

    expect(update).toHaveBeenCalledWith({ account_origin: "web_cta" });
    expect(eq).toHaveBeenCalledWith("user_id", "user-1");
    // ☠️ The write-once rule IS this filter. Without it the stamp is a plain
    // update that relabels a converted guest on any later gate pass, and no
    // amount of care at the call site would repair it - the value is supposed
    // to be fixed at creation.
    expect(is).toHaveBeenCalledWith("account_origin", null);
  });

  it("stamps only after the row exists, never in the same statement", async () => {
    const { from, update, upsert } = mockAttestationUpsert();

    await recordAgeAttestation("user-1", "DE", "web_cta");

    // The stamp is a conditional UPDATE, which matches nothing until the upsert
    // has created the row. Ordering is the whole of its correctness at a first
    // gate, so it is asserted rather than assumed.
    expect(upsert.mock.invocationCallOrder[0]).toBeLessThan(update.mock.invocationCallOrder[0]);
    expect(from).toHaveBeenCalledTimes(2);
  });

  it("does not stamp an origin onto a row the attestation failed to write", async () => {
    const { update } = mockAttestationUpsert({ message: "column does not exist" });

    await expect(recordAgeAttestation("user-1", "DE", "web_cta")).rejects.toBeDefined();

    expect(update).not.toHaveBeenCalled();
  });

  it("reports the attestation as written even when the origin stamp fails", async () => {
    const { from, upsert } = mockAttestationUpsert();
    const update = jest.fn(() => {
      throw new Error("network");
    });
    from.mockImplementation(() => ({ upsert, update }) as never);

    // ☠️ A measurement column must never keep someone out of the app. On an
    // environment whose schema predates the migration this is the live case,
    // not a theoretical one: PostgREST answers a missing column with an error,
    // and a throwing stamp would turn the gate into a wall.
    await expect(recordAgeAttestation("user-1", "DE", "web_cta")).resolves.toBeUndefined();
  });

  it("reports a rejected stamp rather than letting the null bucket absorb it", async () => {
    const { from, upsert } = mockAttestationUpsert();
    // PostgREST reports a rejected write in the RESOLVED value, not by throwing.
    const is = jest.fn().mockResolvedValue({ error: { message: "permission denied" } });
    const eq = jest.fn(() => ({ is }));
    const update = jest.fn(() => ({ eq }));
    from.mockImplementation(() => ({ upsert, update }) as never);

    await recordAgeAttestation("user-1", "DE", "web_cta");

    // ☠️ Non-fatal must not mean invisible. The column is never backfilled, so
    // a silent failure is indistinguishable from an account minted before the
    // column existed - an RLS regression could erase every new account from the
    // count while every screen still looked healthy.
    expect(captureError).toHaveBeenCalledWith(
      { message: "permission denied" },
      { operation: "stampAccountOrigin" },
    );
  });

  it("does not page anyone because the device was offline", async () => {
    const { from, upsert } = mockAttestationUpsert();
    const update = jest.fn(() => {
      throw new Error("Network request failed");
    });
    from.mockImplementation(() => ({ upsert, update }) as never);

    await recordAgeAttestation("user-1", "DE", "web_cta");

    // Judged by the real `isReportableError`, the same rule the rest of the app
    // reports by. Offline is expected operation, not a defect.
    expect(captureError).not.toHaveBeenCalled();
  });
});

describe("account_origin survives a conversion (#2323)", () => {
  /**
   * A one-row stand-in for `user_preferences` that applies the update the way
   * Postgres would - honouring `is('account_origin', null)` if it is there, and
   * writing unconditionally if it is not.
   *
   * ☠️ The unconditional path is the point. A fake that only ever applied the
   * filtered write would pass just as happily against an implementation with
   * the filter deleted, which is the single mutation these tests exist to
   * catch: awaiting the chain one link early lands on `eq`'s `then`, and the
   * stamp overwrites.
   */
  function mockPreferencesRow(accountOrigin: string | null) {
    const row = { account_origin: accountOrigin };
    let pending: string | null = null;
    const apply = () => {
      row.account_origin = pending;
      return { error: null };
    };

    const is = jest.fn((column: string, value: unknown) => {
      if (column === "account_origin" && value === null && row.account_origin === null) {
        apply();
      }
      return Promise.resolve({ error: null });
    });
    const eq = jest.fn(() => ({
      is,
      // Awaiting the chain HERE means no filter was applied.
      then: (resolve: (result: { error: null }) => void) => resolve(apply()),
    }));
    const update = jest.fn((patch: { account_origin: string }) => {
      pending = patch.account_origin;
      return { eq };
    });
    const upsert = jest.fn().mockResolvedValue({ error: null });
    const from = jest.fn(() => ({ update, upsert }));

    mockRequireSupabase.mockReturnValue({ from } as unknown as ReturnType<typeof requireSupabase>);

    return { row };
  }

  it("keeps the door a guest came through after they convert", async () => {
    // Stamped at the first gate, when this account had no email.
    const { row } = mockPreferencesRow("native_cold_start");

    // The person has since created an account, so a gate running now derives
    // native + registered - which is a true statement about the session and a
    // false one about the origin.
    await recordAgeAttestation("user-1", "DE", "native_signup");

    // The column is fixed at creation and never changed afterwards, including
    // by conversion (`CONTEXT.md` §Accounts). The database is what enforces it.
    expect(row.account_origin).toBe("native_cold_start");
  });

  it("stamps an account that has never been stamped", async () => {
    const { row } = mockPreferencesRow(null);

    await recordAgeAttestation("user-1", "DE", "web_cta");

    // The other half: write-once has to still write the first time. `null`
    // means "minted before the column existed", and only a real gate pass may
    // replace it.
    expect(row.account_origin).toBe("web_cta");
  });
});

describe("explicit Art. 9 consent (#1766)", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  function mockConsentUpsert(error: unknown = null) {
    const upsert = jest.fn().mockResolvedValue({ error });
    const from = jest.fn(() => ({ upsert }));

    mockRequireSupabase.mockReturnValue({ from } as unknown as ReturnType<typeof requireSupabase>);

    return { from, upsert };
  }

  it("records the health-data consent alongside the contractual acceptance", async () => {
    const { from, upsert } = mockConsentUpsert();

    await recordPolicyConsent("user-1", "2026-09-02-donations");

    expect(from).toHaveBeenCalledWith("user_preferences");
    const [payload] = upsert.mock.calls[0];
    expect(payload).toEqual({
      user_id: "user-1",
      privacy_policy_accepted_at: expect.any(String),
      terms_accepted_at: expect.any(String),
      policy_version_accepted: "2026-09-02-donations",
      health_data_consent_at: expect.any(String),
    });
  });

  it("stamps both acts with the same moment", () => {
    // One submit, one payload: the Art. 9 act and the contractual acceptance
    // are given together even though they are worded and ticked separately, so
    // a reader comparing the two timestamps should not have to wonder whether
    // a difference means something.
    const { upsert } = mockConsentUpsert();

    return recordPolicyConsent("user-1", "v9").then(() => {
      const [payload] = upsert.mock.calls[0] as [Record<string, string>];
      expect(payload.health_data_consent_at).toBe(payload.privacy_policy_accepted_at);
    });
  });

  it("maps the consent timestamp from the user_preferences row", async () => {
    mockPreferenceSelect({
      health_data_consent_at: "2026-09-04T10:00:00.000Z",
      user_id: "user-1",
    });

    await expect(getUserPreferences("user-1")).resolves.toMatchObject({
      healthDataConsentAt: "2026-09-04T10:00:00.000Z",
    });
  });

  it("leaves an account that has not performed the act at null", async () => {
    // Never inferred from privacy_policy_accepted_at. Every existing account
    // ticked the OLD bundled checkbox, and the reason this column exists is
    // that a bundled tick is not the explicit act Art. 9(2)(a) asks for - so
    // "accepted a policy" must never read as "gave explicit consent".
    mockPreferenceSelect({
      privacy_policy_accepted_at: "2026-08-01T10:00:00.000Z",
      terms_accepted_at: "2026-08-01T10:00:00.000Z",
      policy_version_accepted: "2026-09-02-donations",
      user_id: "user-1",
    });

    const prefs = await getUserPreferences("user-1");

    expect(prefs.healthDataConsentAt).toBeNull();
    expect(prefs.policyVersionAccepted).toBe("2026-09-02-donations");
  });

  it("defaults to no consent recorded", () => {
    expect(defaultUserPreferences.healthDataConsentAt).toBeNull();
  });

  it("propagates a write failure rather than reporting consent that was not stored", async () => {
    mockConsentUpsert({ message: "column does not exist" });

    await expect(recordPolicyConsent("user-1", "v9")).rejects.toEqual({
      message: "column does not exist",
    });
  });
});
