import type { SupabaseClient } from "@supabase/supabase-js";

import {
  SEED_USERS,
  createServiceClient,
  deleteAllMoodLogsForUser,
  deleteAllValuesProfileForUser,
  signInAs,
} from "./helpers";

// A noticing-grade mood log written at 01:00 on the 12th in Tokyo (UTC+9), which
// is 16:00Z on the 11th. Its captured civil day is the 12th; a viewer anywhere
// west of UTC+8 converts the same instant to the 11th. The two windows below are
// the local days of a viewer at UTC+5:30, so the entry falls INSIDE the 11th's
// window and OUTSIDE the 12th's - the exact inverse of where it belongs (#414).
const LOGGED_AT = "2026-05-11T16:00:00.000Z";
const TOKYO_OFFSET_MINUTES = 540;
const CAPTURED_DAY = "2026-05-12";
const VIEWER_DAY = "2026-05-11";
const VIEWER_DAY_WINDOW = { start: "2026-05-10T18:30:00.000Z", end: "2026-05-11T18:30:00.000Z" };
const CAPTURED_DAY_WINDOW = { start: "2026-05-11T18:30:00.000Z", end: "2026-05-12T18:30:00.000Z" };

describe("program_widget_task_status (integration)", () => {
  let alice: SupabaseClient;
  let admin: SupabaseClient;
  let originalPreferences: {
    cbt_program_started_at: string | null;
    cbt_program_phase_index: number | null;
    cbt_program_phase_started_at: string | null;
  };

  beforeAll(async () => {
    alice = await signInAs("alice");
    admin = createServiceClient();

    const preferences = await admin
      .from("user_preferences")
      .select("cbt_program_started_at, cbt_program_phase_index, cbt_program_phase_started_at")
      .eq("user_id", SEED_USERS.alice.id)
      .single();
    expect(preferences.error).toBeNull();
    originalPreferences = preferences.data!;
  });

  beforeEach(async () => {
    await deleteAllValuesProfileForUser(SEED_USERS.alice.id);
    await deleteAllMoodLogsForUser(SEED_USERS.alice.id);
    const enrollment = await admin
      .from("user_preferences")
      .update({
        cbt_program_started_at: "2026-07-01T00:00:00.000Z",
        cbt_program_phase_index: 0,
        cbt_program_phase_started_at: "2026-07-01T00:00:00.000Z",
      })
      .eq("user_id", SEED_USERS.alice.id);
    expect(enrollment.error).toBeNull();
  });

  afterAll(async () => {
    await deleteAllValuesProfileForUser(SEED_USERS.alice.id);
    await deleteAllMoodLogsForUser(SEED_USERS.alice.id);
    await admin
      .from("user_preferences")
      .update(originalPreferences)
      .eq("user_id", SEED_USERS.alice.id);
    await alice.auth.signOut();
  });

  it("evaluates a non-empty JSONB priority-values array for the CBT goals task", async () => {
    const values = await alice.from("values_profile").insert({
      user_id: SEED_USERS.alice.id,
      personal_values: [{ key: "family", tier: 1 }],
      priority_values: ["family"],
    });
    expect(values.error).toBeNull();

    const status = await alice.rpc("program_widget_task_status", {
      p_module: "cbt",
      p_day_start: "2026-07-13T00:00:00.000Z",
      p_day_end: "2026-07-14T00:00:00.000Z",
      p_day_key: "2026-07-13",
    });

    expect(status.error).toBeNull();
    expect(status.data).toEqual(
      expect.arrayContaining([{ task_key: "clarifyValues", done: true }]),
    );
  });

  describe("dailyNoticing buckets mood by its captured civil day", () => {
    const logMood = async (offsetMinutes: number | null) => {
      const insert = await alice.from("mood_logs").insert({
        user_id: SEED_USERS.alice.id,
        mood_score: 3,
        emotions: [],
        notes: "",
        logged_at: LOGGED_AT,
        logged_offset_minutes: offsetMinutes,
        situation: "Work stress",
        thoughts: "",
        behaviours: "",
        bodily_sensations: "",
      });
      expect(insert.error).toBeNull();
    };

    const noticingDone = async (window: { start: string; end: string }, dayKey?: string) => {
      const status = await alice.rpc("program_widget_task_status", {
        p_module: "cbt",
        p_day_start: window.start,
        p_day_end: window.end,
        ...(dayKey === undefined ? {} : { p_day_key: dayKey }),
      });
      expect(status.error).toBeNull();
      return (status.data as { task_key: string; done: boolean }[]).find(
        (row) => row.task_key === "dailyNoticing",
      )!.done;
    };

    it("counts the log on the captured day and not on the viewer's day", async () => {
      await logMood(TOKYO_OFFSET_MINUTES);

      // Both answers are the inverse of the timestamp range scan this RPC ran
      // before #414 - see the legacy-argument test below, which still shows it.
      await expect(noticingDone(CAPTURED_DAY_WINDOW, CAPTURED_DAY)).resolves.toBe(true);
      await expect(noticingDone(VIEWER_DAY_WINDOW, VIEWER_DAY)).resolves.toBe(false);
    });

    it("falls back to the viewer's day when no offset was captured", async () => {
      // Null means "not captured", never "UTC" (20260726_occurrence_offset_nullable),
      // so these rows keep rendering exactly where they always have.
      await logMood(null);

      await expect(noticingDone(VIEWER_DAY_WINDOW, VIEWER_DAY)).resolves.toBe(true);
      await expect(noticingDone(CAPTURED_DAY_WINDOW, CAPTURED_DAY)).resolves.toBe(false);
    });

    it("still buckets by the viewer's window for a client that sends no day key", async () => {
      // A client predating this migration omits p_day_key and must keep working -
      // with the old, wrong-day answer rather than an error.
      await logMood(TOKYO_OFFSET_MINUTES);

      await expect(noticingDone(VIEWER_DAY_WINDOW)).resolves.toBe(true);
      await expect(noticingDone(CAPTURED_DAY_WINDOW)).resolves.toBe(false);
    });

    it("rejects a malformed day key", async () => {
      const status = await alice.rpc("program_widget_task_status", {
        p_module: "cbt",
        p_day_start: VIEWER_DAY_WINDOW.start,
        p_day_end: VIEWER_DAY_WINDOW.end,
        p_day_key: "12 May 2026",
      });
      expect(status.error?.message).toContain("Invalid day key");
    });
  });
});
