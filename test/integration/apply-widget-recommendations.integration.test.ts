import type { SupabaseClient } from "@supabase/supabase-js";

import { createAnonClient, createServiceClient } from "./helpers";

/**
 * `apply_widget_recommendations` survives for native builds that predate the
 * one-panel introduction (#1958): they have no OTA channel and still call it
 * with all three arguments when their wizard finishes. The current app calls it
 * from nowhere. What this suite now pins is the SHIPPED-BUILD obligation: the
 * signature is unchanged, `p_selected_concerns` is still accepted, completion
 * and the write-once `initial_concerns` are still written - and none of that
 * errors now that `selected_concerns` and `widgets_seeded` are gone from
 * `user_preferences` (20260909000000_onboarding_one_panel.sql).
 */
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

  it("still takes p_selected_concerns and completes onboarding against the dropped columns", async () => {
    // Exactly the call a pre-#1958 build makes. If the redeclaration had been
    // skipped, this would be a raw `column "widgets_seeded" does not exist`.
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
          "initial_concerns, app_onboarding_completed, app_onboarding_completed_via, app_onboarding_completed_at",
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
      // `p_selected_concerns` now feeds ONLY the intake record.
      initial_concerns: ["sleep"],
      app_onboarding_completed: true,
      app_onboarding_completed_via: "finish",
    });
    expect(preferences.data?.app_onboarding_completed_at).toEqual(expect.any(String));
  });

  it("has nowhere left to write selected_concerns or widgets_seeded - the columns are gone", async () => {
    // Asserted through PostgREST rather than information_schema so the test
    // reads the same schema cache a client would hit. `42703` is Postgres's
    // undefined_column; PostgREST surfaces it as an error on the select.
    const concerns = await client
      .from("user_preferences")
      .select("selected_concerns")
      .eq("user_id", userId)
      .single();
    expect(concerns.error).not.toBeNull();

    const seeded = await client
      .from("user_preferences")
      .select("widgets_seeded")
      .eq("user_id", userId)
      .single();
    expect(seeded.error).not.toBeNull();
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
