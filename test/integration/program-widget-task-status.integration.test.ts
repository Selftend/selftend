import type { SupabaseClient } from "@supabase/supabase-js";

import {
  SEED_USERS,
  createServiceClient,
  deleteAllValuesProfileForUser,
  signInAs,
} from "./helpers";

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
    });

    expect(status.error).toBeNull();
    expect(status.data).toEqual(
      expect.arrayContaining([{ task_key: "clarifyValues", done: true }]),
    );
  });
});
