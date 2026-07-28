import type { SupabaseClient } from "@supabase/supabase-js";

import {
  SEED_USERS,
  createServiceClient,
  deleteAllActivityLogsForUser,
  deleteAllMoodLogsForUser,
  deleteAllThoughtRecordsForUser,
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

  // Every table the CBT legs below read. Meditation has no shared helper, so it
  // is cleared here directly.
  const clearModuleData = async () => {
    await deleteAllValuesProfileForUser(SEED_USERS.alice.id);
    await deleteAllMoodLogsForUser(SEED_USERS.alice.id);
    await deleteAllThoughtRecordsForUser(SEED_USERS.alice.id);
    await deleteAllActivityLogsForUser(SEED_USERS.alice.id);
    const sits = await admin
      .from("meditation_sessions")
      .delete()
      .eq("user_id", SEED_USERS.alice.id);
    expect(sits.error).toBeNull();
  };

  beforeEach(async () => {
    await clearModuleData();
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
    await clearModuleData();
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

  // ── The three legs #425 graduates ────────────────────────────────────────
  //
  // Each reads the same Tokyo instant as dailyNoticing above, so the captured
  // day and the viewer's day disagree, and each asserts all three answers: the
  // captured day, the null-offset fallback, and the legacy three-argument call
  // that must keep its old viewer-local behaviour. The client twins are held to
  // the same three answers in src/features/cbt/program-definition.test.ts - a
  // module whose two halves disagree is the defect this PR exists to prevent.

  /** Moves alice to the programme phase whose task list contains `taskKey`. */
  const enterPhase = async (phaseIndex: number) => {
    const moved = await admin
      .from("user_preferences")
      .update({ cbt_program_phase_index: phaseIndex })
      .eq("user_id", SEED_USERS.alice.id);
    expect(moved.error).toBeNull();
  };

  const taskDone = async (
    taskKey: string,
    window: { start: string; end: string },
    dayKey?: string,
  ) => {
    const status = await alice.rpc("program_widget_task_status", {
      p_module: "cbt",
      p_day_start: window.start,
      p_day_end: window.end,
      ...(dayKey === undefined ? {} : { p_day_key: dayKey }),
    });
    expect(status.error).toBeNull();
    const row = (status.data as { task_key: string; done: boolean }[]).find(
      (r) => r.task_key === taskKey,
    );
    expect(row).toBeDefined();
    return row!.done;
  };

  describe("thoughtRecordDaily buckets by the captured civil day", () => {
    beforeEach(async () => {
      await enterPhase(2);
    });

    const writeRecord = async (offsetMinutes: number | null) => {
      const insert = await alice.from("thought_records").insert({
        user_id: SEED_USERS.alice.id,
        situation: "Missed the deadline",
        nats: [{ text: "I always fail", beliefRating: 70, isHotThought: true }],
        emotions: ["Anxious"],
        distortions: [],
        balanced_thought: "One deadline is not a pattern",
        created_at: LOGGED_AT,
        created_offset_minutes: offsetMinutes,
      });
      expect(insert.error).toBeNull();
    };

    it("counts the record on the captured day and not on the viewer's day", async () => {
      await writeRecord(TOKYO_OFFSET_MINUTES);

      await expect(taskDone("thoughtRecordDaily", CAPTURED_DAY_WINDOW, CAPTURED_DAY)).resolves.toBe(
        true,
      );
      await expect(taskDone("thoughtRecordDaily", VIEWER_DAY_WINDOW, VIEWER_DAY)).resolves.toBe(
        false,
      );
    });

    it("falls back to the viewer's day when no offset was captured", async () => {
      await writeRecord(null);

      await expect(taskDone("thoughtRecordDaily", VIEWER_DAY_WINDOW, VIEWER_DAY)).resolves.toBe(
        true,
      );
      await expect(taskDone("thoughtRecordDaily", CAPTURED_DAY_WINDOW, CAPTURED_DAY)).resolves.toBe(
        false,
      );
    });

    it("still buckets by the viewer's window for a client that sends no day key", async () => {
      await writeRecord(TOKYO_OFFSET_MINUTES);

      await expect(taskDone("thoughtRecordDaily", VIEWER_DAY_WINDOW)).resolves.toBe(true);
      await expect(taskDone("thoughtRecordDaily", CAPTURED_DAY_WINDOW)).resolves.toBe(false);
    });
  });

  describe("activityDaily buckets by the captured completion day", () => {
    beforeEach(async () => {
      await enterPhase(3);
    });

    const completeActivity = async (offsetMinutes: number | null) => {
      const insert = await alice.from("activity_logs").insert({
        user_id: SEED_USERS.alice.id,
        activity_name: "Morning walk",
        category: "pleasure",
        completed_at: LOGGED_AT,
        completed_offset_minutes: offsetMinutes,
      });
      expect(insert.error).toBeNull();
    };

    it("counts the activity on the captured day and not on the viewer's day", async () => {
      await completeActivity(TOKYO_OFFSET_MINUTES);

      await expect(taskDone("activityDaily", CAPTURED_DAY_WINDOW, CAPTURED_DAY)).resolves.toBe(
        true,
      );
      await expect(taskDone("activityDaily", VIEWER_DAY_WINDOW, VIEWER_DAY)).resolves.toBe(false);
    });

    it("falls back to the viewer's day when no offset was captured", async () => {
      await completeActivity(null);

      await expect(taskDone("activityDaily", VIEWER_DAY_WINDOW, VIEWER_DAY)).resolves.toBe(true);
      await expect(taskDone("activityDaily", CAPTURED_DAY_WINDOW, CAPTURED_DAY)).resolves.toBe(
        false,
      );
    });

    it("ignores an activity that is still open", async () => {
      const open = await alice.from("activity_logs").insert({
        user_id: SEED_USERS.alice.id,
        activity_name: "Call a friend",
        category: "pleasure",
        scheduled_at: LOGGED_AT,
        scheduled_offset_minutes: TOKYO_OFFSET_MINUTES,
      });
      expect(open.error).toBeNull();

      await expect(taskDone("activityDaily", CAPTURED_DAY_WINDOW, CAPTURED_DAY)).resolves.toBe(
        false,
      );
      await expect(taskDone("activityDaily", VIEWER_DAY_WINDOW, VIEWER_DAY)).resolves.toBe(false);
    });

    it("still buckets by the viewer's window for a client that sends no day key", async () => {
      await completeActivity(TOKYO_OFFSET_MINUTES);

      await expect(taskDone("activityDaily", VIEWER_DAY_WINDOW)).resolves.toBe(true);
      await expect(taskDone("activityDaily", CAPTURED_DAY_WINDOW)).resolves.toBe(false);
    });
  });

  describe("calmingDaily buckets by the captured civil day", () => {
    beforeEach(async () => {
      await enterPhase(4);
    });

    const sit = async (offsetMinutes: number | null) => {
      const insert = await alice.from("meditation_sessions").insert({
        user_id: SEED_USERS.alice.id,
        duration_minutes: 10,
        completed_at: LOGGED_AT,
        completed_offset_minutes: offsetMinutes,
      });
      expect(insert.error).toBeNull();
    };

    it("counts the sit on the captured day and not on the viewer's day", async () => {
      await sit(TOKYO_OFFSET_MINUTES);

      await expect(taskDone("calmingDaily", CAPTURED_DAY_WINDOW, CAPTURED_DAY)).resolves.toBe(true);
      await expect(taskDone("calmingDaily", VIEWER_DAY_WINDOW, VIEWER_DAY)).resolves.toBe(false);
    });

    it("falls back to the viewer's day when no offset was captured", async () => {
      await sit(null);

      await expect(taskDone("calmingDaily", VIEWER_DAY_WINDOW, VIEWER_DAY)).resolves.toBe(true);
      await expect(taskDone("calmingDaily", CAPTURED_DAY_WINDOW, CAPTURED_DAY)).resolves.toBe(
        false,
      );
    });

    it("still buckets by the viewer's window for a client that sends no day key", async () => {
      await sit(TOKYO_OFFSET_MINUTES);

      await expect(taskDone("calmingDaily", VIEWER_DAY_WINDOW)).resolves.toBe(true);
      await expect(taskDone("calmingDaily", CAPTURED_DAY_WINDOW)).resolves.toBe(false);
    });
  });
});
