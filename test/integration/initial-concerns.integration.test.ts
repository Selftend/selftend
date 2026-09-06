import type { SupabaseClient } from "@supabase/supabase-js";

import { createAnonClient, createServiceClient } from "./helpers";

/**
 * `initial_concerns` — concern-at-intake, written once (#1612, decided in #1605).
 *
 * It was created because `selected_concerns` was last-write-wins: the wizard's
 * RPC overwrote it and Home could re-run the wizard through the same RPC, so the
 * concern someone declared on arrival was recorded nowhere.
 *
 * ☠️ The reason that matters — and the reason the third test below exists — is
 * that **only a returning user re-runs the wizard**. Any rule that lets a re-run
 * populate this column populates it precisely for the retained users, which is
 * the survivorship bias the column exists to remove, arriving one row at a time
 * instead of in a backfill.
 *
 * Since #1958 the app asks no concern at all: `selected_concerns` is dropped and
 * the one-panel introduction completes with a plain preference write. The only
 * remaining writer is `apply_widget_recommendations`, called by native builds
 * that predate that change, so the column covers the pre-redesign cohort only
 * and the guard below is what keeps it honest for exactly those callers.
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

  async function readIntake(client: SupabaseClient, userId: string) {
    const row = await client
      .from("user_preferences")
      .select("initial_concerns")
      .eq("user_id", userId)
      .single();
    expect(row.error).toBeNull();
    return (row.data as { initial_concerns: string[] | null }).initial_concerns;
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

    expect(await readIntake(client, userId)).toEqual(["sleep"]);

    await client.auth.signOut();
  });

  it("does not overwrite it when the old wizard is re-run with different concerns", async () => {
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

    // Only the intake record exists now, and it is frozen. (Before #1958 this
    // also checked that `selected_concerns` moved to `low-mood`; that column is
    // gone.)
    expect(await readIntake(client, userId)).toEqual(["sleep"]);

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

    expect(await readIntake(client, userId)).toBeNull();

    await client.auth.signOut();
  });

  /**
   * ☠️ The hole the guard above still had (#1648).
   *
   * The `app_onboarding_completed_at` clause is a PROXY for "has been here
   * before", and `20260705_grandfather_widget_onboarding.sql` breaks the proxy:
   * every account that existed on 2026-07-05 was preserved with the flag TRUE
   * and the timestamp NULL. For those rows both clauses of the old guard were
   * false, so the oldest users — the ones most likely to still be around, and
   * therefore the ones whose bias matters most — could still be filled in from
   * a later re-run.
   *
   * The live path that reached this was the empty-Home "Get suggestions" flow
   * of pre-#1956 builds, which passes `completionMode: null` and still hits the
   * same upsert. Those builds still exist in the wild, so the shape stays pinned.
   */
  it("leaves a GRANDFATHERED user NULL, even though their completion timestamp is null", async () => {
    const { userId, client } = await newSignedInUser();

    await client.rpc("apply_widget_recommendations", {
      p_widget_ids: ["sleep-latest"],
      p_selected_concerns: ["sleep"],
      p_completion_mode: "finish",
    });

    // Exactly the shape 20260705_grandfather_widget_onboarding.sql leaves
    // behind: onboarding marked done, but no `via` and no `_at` to prove it.
    const grandfathered = await admin
      .from("user_preferences")
      .update({
        initial_concerns: null,
        app_onboarding_completed: true,
        app_onboarding_completed_via: null,
        app_onboarding_completed_at: null,
      })
      .eq("user_id", userId);
    expect(grandfathered.error).toBeNull();

    // The old empty-Home suggestion flow: no completion mode, but the same upsert.
    const suggestions = await client.rpc("apply_widget_recommendations", {
      p_widget_ids: ["mood-checkin"],
      p_selected_concerns: ["low-mood"],
      p_completion_mode: null,
    });
    expect(suggestions.error).toBeNull();

    expect(await readIntake(client, userId)).toBeNull();

    // And a full completion must not fill it either.
    const completed = await client.rpc("apply_widget_recommendations", {
      p_widget_ids: ["habits-today"],
      p_selected_concerns: ["habits"],
      p_completion_mode: "finish",
    });
    expect(completed.error).toBeNull();

    expect(await readIntake(client, userId)).toBeNull();

    await client.auth.signOut();
  });

  it("still records intake for a genuinely new user who meets the old Home suggestions first", async () => {
    // The counterpart the widened guard must not break: someone with no
    // user_preferences row at all takes the INSERT branch, where the flag is
    // false and there is nothing to guard against.
    const { userId, client } = await newSignedInUser();

    const suggestions = await client.rpc("apply_widget_recommendations", {
      p_widget_ids: ["mood-checkin"],
      p_selected_concerns: ["low-mood"],
      p_completion_mode: null,
    });
    expect(suggestions.error).toBeNull();

    expect(await readIntake(client, userId)).toEqual(["low-mood"]);

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
    expect(preferences).toMatchObject({ initial_concerns: ["sleep"] });
    // The dropped column is not silently projected as null either (#1958).
    expect(preferences).not.toHaveProperty("selected_concerns");
    expect(preferences).not.toHaveProperty("widgets_seeded");

    await client.auth.signOut();
  });
});
