import type { SupabaseClient } from "@supabase/supabase-js";

import { createAnonClient, createServiceClient } from "./helpers";

/**
 * `initial_concerns` — concern-at-intake, written once (#1612, decided in #1605).
 *
 * `selected_concerns` is last-write-wins: `apply_widget_recommendations`
 * overwrites it and Home re-runs the wizard through the same RPC, so the
 * concern someone declared on arrival was recorded nowhere.
 *
 * ☠️ The reason that matters — and the reason the third test below exists — is
 * that **only a returning user re-runs the wizard**. Any rule that lets a re-run
 * populate this column populates it precisely for the retained users, which is
 * the survivorship bias the column exists to remove, arriving one row at a time
 * instead of in a backfill.
 */
describe("initial_concerns is written once (integration)", () => {
  const password = "initial-concerns-test-pass-123";
  const admin = createServiceClient();
  const created: string[] = [];

  async function newSignedInUser() {
    const email = `initial-concerns-${Date.now()}-${created.length}@test.local`;
    const result = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });
    expect(result.error).toBeNull();
    const userId = result.data.user!.id;
    created.push(userId);

    const client = createAnonClient();
    const signedIn = await client.auth.signInWithPassword({ email, password });
    expect(signedIn.error).toBeNull();
    return { userId, client };
  }

  async function readConcerns(client: SupabaseClient, userId: string) {
    const row = await client
      .from("user_preferences")
      .select("selected_concerns, initial_concerns")
      .eq("user_id", userId)
      .single();
    expect(row.error).toBeNull();
    return row.data as { selected_concerns: string[]; initial_concerns: string[] | null };
  }

  afterAll(async () => {
    for (const id of created) await admin.auth.admin.deleteUser(id);
  });

  it("records the concerns declared at a first onboarding completion", async () => {
    const { userId, client } = await newSignedInUser();

    const applied = await client.rpc("apply_widget_recommendations", {
      p_widget_ids: ["sleep-latest"],
      p_selected_concerns: ["sleep"],
      p_completion_mode: "finish",
    });
    expect(applied.error).toBeNull();

    expect(await readConcerns(client, userId)).toEqual({
      selected_concerns: ["sleep"],
      initial_concerns: ["sleep"],
    });

    await client.auth.signOut();
  });

  it("does not overwrite it when the wizard is re-run with different concerns", async () => {
    const { userId, client } = await newSignedInUser();

    await client.rpc("apply_widget_recommendations", {
      p_widget_ids: ["sleep-latest"],
      p_selected_concerns: ["sleep"],
      p_completion_mode: "finish",
    });

    const rerun = await client.rpc("apply_widget_recommendations", {
      p_widget_ids: ["mood-checkin"],
      p_selected_concerns: ["low-mood"],
      p_completion_mode: "finish",
    });
    expect(rerun.error).toBeNull();

    // `selected_concerns` MUST still move - it drives widget suggestions and
    // stays live. Only the intake record is frozen.
    expect(await readConcerns(client, userId)).toEqual({
      selected_concerns: ["low-mood"],
      initial_concerns: ["sleep"],
    });

    await client.auth.signOut();
  });

  /**
   * ☠️ The guard the ticket's own wording would have missed.
   *
   * #1612 specifies "set `initial_concerns` only when it is null". On its own
   * that fills the column for every pre-#1612 user who re-runs the wizard — and
   * since only returning users re-run it, the rows that get filled are exactly
   * the retained ones, recorded with their CURRENT concerns. That is the
   * flattering bias the column was created to remove.
   *
   * So the write is also conditioned on `app_onboarding_completed_at is null`:
   * someone who has completed onboarding before stays NULL and is reported in
   * the explicit `unknown` arm, which is the honest answer.
   */
  it("leaves a pre-existing user NULL rather than backfilling them on a re-run", async () => {
    const { userId, client } = await newSignedInUser();

    await client.rpc("apply_widget_recommendations", {
      p_widget_ids: ["sleep-latest"],
      p_selected_concerns: ["sleep"],
      p_completion_mode: "finish",
    });

    // Make them look like a user who completed onboarding before this column
    // existed: intake unrecorded, but onboarding demonstrably already done.
    const aged = await admin
      .from("user_preferences")
      .update({ initial_concerns: null })
      .eq("user_id", userId);
    expect(aged.error).toBeNull();

    const rerun = await client.rpc("apply_widget_recommendations", {
      p_widget_ids: ["mood-checkin"],
      p_selected_concerns: ["low-mood"],
      p_completion_mode: "finish",
    });
    expect(rerun.error).toBeNull();

    expect(await readConcerns(client, userId)).toEqual({
      selected_concerns: ["low-mood"],
      initial_concerns: null,
    });

    await client.auth.signOut();
  });

  it("exports the column, so a person can see what was recorded about them", async () => {
    const { client } = await newSignedInUser();

    await client.rpc("apply_widget_recommendations", {
      p_widget_ids: ["sleep-latest"],
      p_selected_concerns: ["sleep"],
      p_completion_mode: "finish",
    });

    const exported = await client.rpc("export_user_data");
    expect(exported.error).toBeNull();

    const preferences = (exported.data as { preferences?: Record<string, unknown> }).preferences;
    expect(preferences).toMatchObject({
      selected_concerns: ["sleep"],
      initial_concerns: ["sleep"],
    });

    await client.auth.signOut();
  });
});
