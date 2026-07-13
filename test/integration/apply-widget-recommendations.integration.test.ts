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
});
