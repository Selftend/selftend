import type { SupabaseClient } from "@supabase/supabase-js";

import { createAnonClient, createServiceClient } from "./helpers";

describe("apply_widget_recommendations (integration)", () => {
  const password = "onboarding-rpc-test-pass-123";
  const email = `onboarding-rpc-${Date.now()}@test.local`;
  const admin = createServiceClient();
  let userId: string;
  let client: SupabaseClient;

  beforeAll(async () => {
    const created = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });
    expect(created.error).toBeNull();
    userId = created.data.user!.id;

    client = createAnonClient();
    const signedIn = await client.auth.signInWithPassword({ email, password });
    expect(signedIn.error).toBeNull();
  });

  afterAll(async () => {
    await client?.auth.signOut();
    if (userId) await admin.auth.admin.deleteUser(userId);
  });

  it("atomically stores ordered widgets and completes onboarding", async () => {
    const applied = await client.rpc("apply_widget_recommendations", {
      p_widget_ids: ["sleep-latest", "mood-checkin"],
      p_selected_concerns: ["sleep"],
      p_completion_mode: "finish",
    });
    expect(applied.error).toBeNull();

    const [widgets, preferences] = await Promise.all([
      client
        .from("widget_preferences")
        .select("widget_id, position")
        .eq("user_id", userId)
        .order("position", { ascending: true }),
      client
        .from("user_preferences")
        .select(
          "widgets_seeded, selected_concerns, app_onboarding_completed, app_onboarding_completed_via",
        )
        .eq("user_id", userId)
        .single(),
    ]);

    expect(widgets.error).toBeNull();
    expect(widgets.data).toEqual([
      { widget_id: "sleep-latest", position: 0 },
      { widget_id: "mood-checkin", position: 1 },
    ]);
    expect(preferences.error).toBeNull();
    expect(preferences.data).toMatchObject({
      widgets_seeded: true,
      selected_concerns: ["sleep"],
      app_onboarding_completed: true,
      app_onboarding_completed_via: "finish",
    });
  });

  // #986. End-state check: the wizard and `add_widget_preference` running together on one
  // account leave a well-formed list - positions distinct and contiguous from 0.
  //
  // Read what this does NOT cover. It does not verify the advisory lock this function now
  // takes. Measured against a lock-free build of the function, over eleven runs, it stayed
  // green every time: `add_widget_preference` normalizes positions before it appends, so
  // any collision the wizard caused is repaired by the very next add and never reaches the
  // assertion. The lock is what stops the bad state existing at all rather than being
  // healed afterwards, and nothing observable through PostgREST distinguishes the two -
  // holding an advisory lock across HTTP requests is not something this suite can do.
  it("leaves a well-formed list when a concurrent add runs alongside it", async () => {
    const cleared = await client.from("widget_preferences").delete().eq("user_id", userId);
    expect(cleared.error).toBeNull();

    // Disjoint id sets: an added row that survives the wizard's DELETE must not also
    // collide on UNIQUE (user_id, widget_id), or the test would fail for that reason
    // instead of the one it is about.
    const wizardIds = ["wizard-1", "wizard-2", "wizard-3", "wizard-4", "wizard-5"];
    const addedIds = Array.from({ length: 8 }, (_, index) => `added-${index}`);

    await Promise.all([
      client.rpc("apply_widget_recommendations", { p_widget_ids: wizardIds }),
      ...addedIds.map((widgetId) => client.rpc("add_widget_preference", { p_widget_id: widgetId })),
    ]);

    const { data, error } = await client
      .from("widget_preferences")
      .select("widget_id, position")
      .eq("user_id", userId);
    expect(error).toBeNull();

    const stored = (data ?? []) as { widget_id: string; position: number }[];
    expect(stored.length).toBeGreaterThan(0);
    const heldPositions = stored.map((row) => row.position).sort((a, b) => a - b);
    expect(heldPositions).toEqual([...stored.keys()]);
  });
});
