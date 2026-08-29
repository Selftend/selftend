import type { SupabaseClient } from "@supabase/supabase-js";

import { SEED_USERS, deleteTestWidgetPreferencesForUser, signInAs } from "./helpers";

// Tests the DB contract for widget_preferences (20260539_widget_preferences.sql).
// widget_preferences: id, user_id, widget_id, position (default 0), created_at
// UNIQUE (user_id, widget_id)
// RLS: ALL via auth.uid() = user_id
//
// CAUTION: seed users already have widget_preferences rows from seed.sql - bob
// carries the four-id Home layout onboarding would have given him (#1352), and
// alice's ZERO rows are themselves a fixture. So we use a made-up widget_id prefix
// ("test-widget-") to avoid collisions with real seeded data, and afterEach deletes
// only rows carrying that prefix.
//
// ☠️ afterEach used to delete by user_id, clearing ALL of a seed user's rows, on the
// since-falsified grounds that "the app re-seeds on next launch". Nothing re-seeds
// them: `npm run db:seed:demo` writes the demo user only, so bob's layout stayed gone
// until the next full `npm run db:reset` - and the demo seeder's own read-back guard
// failed on it. Every assertion below scopes its read by widget_id or row id, so the
// narrower cleanup costs the tests nothing.

const TEST_WIDGET_A = "test-widget-alpha";
const TEST_WIDGET_B = "test-widget-beta";
const TEST_WIDGET_C = "test-widget-gamma";

describe("widget_preferences (integration)", () => {
  let alice: SupabaseClient;
  let bob: SupabaseClient;

  beforeAll(async () => {
    [alice, bob] = await Promise.all([signInAs("alice"), signInAs("bob")]);
  });

  afterEach(async () => {
    await Promise.all([
      deleteTestWidgetPreferencesForUser(SEED_USERS.alice.id),
      deleteTestWidgetPreferencesForUser(SEED_USERS.bob.id),
    ]);
  });

  afterAll(async () => {
    await Promise.all([alice.auth.signOut(), bob.auth.signOut()]);
  });

  it("inserts a widget preference and reads it back", async () => {
    const insert = await alice
      .from("widget_preferences")
      .insert({
        user_id: SEED_USERS.alice.id,
        widget_id: TEST_WIDGET_A,
        position: 0,
      })
      .select("*")
      .single();

    expect(insert.error).toBeNull();
    expect(insert.data).toMatchObject({
      user_id: SEED_USERS.alice.id,
      widget_id: TEST_WIDGET_A,
      position: 0,
    });
    expect(insert.data?.id).toEqual(expect.any(String));
    expect(insert.data?.created_at).toEqual(expect.any(String));
  });

  it("UNIQUE(user_id, widget_id) rejects duplicate widget_id for the same user", async () => {
    const first = await alice
      .from("widget_preferences")
      .insert({ user_id: SEED_USERS.alice.id, widget_id: TEST_WIDGET_A, position: 0 })
      .select("id")
      .single();
    expect(first.error).toBeNull();

    const duplicate = await alice
      .from("widget_preferences")
      .insert({ user_id: SEED_USERS.alice.id, widget_id: TEST_WIDGET_A, position: 1 })
      .select("id");
    expect(duplicate.error).not.toBeNull();
  });

  it("allows same widget_id for different users", async () => {
    const aliceInsert = await alice
      .from("widget_preferences")
      .insert({ user_id: SEED_USERS.alice.id, widget_id: TEST_WIDGET_A, position: 0 })
      .select("id")
      .single();
    expect(aliceInsert.error).toBeNull();

    const bobInsert = await bob
      .from("widget_preferences")
      .insert({ user_id: SEED_USERS.bob.id, widget_id: TEST_WIDGET_A, position: 0 })
      .select("id")
      .single();
    expect(bobInsert.error).toBeNull();
  });

  it("lists widgets ordered by position ascending", async () => {
    const widgets = [
      { widget_id: TEST_WIDGET_C, position: 2 },
      { widget_id: TEST_WIDGET_A, position: 0 },
      { widget_id: TEST_WIDGET_B, position: 1 },
    ];
    for (const w of widgets) {
      const r = await alice
        .from("widget_preferences")
        .insert({ user_id: SEED_USERS.alice.id, ...w })
        .select("id")
        .single();
      expect(r.error).toBeNull();
    }

    const list = await alice
      .from("widget_preferences")
      .select("widget_id, position")
      .eq("user_id", SEED_USERS.alice.id)
      .in("widget_id", [TEST_WIDGET_A, TEST_WIDGET_B, TEST_WIDGET_C])
      .order("position", { ascending: true });

    expect(list.error).toBeNull();
    expect(list.data?.map((r) => r.widget_id)).toEqual([
      TEST_WIDGET_A,
      TEST_WIDGET_B,
      TEST_WIDGET_C,
    ]);
  });

  it("can update position of a widget preference", async () => {
    const insert = await alice
      .from("widget_preferences")
      .insert({ user_id: SEED_USERS.alice.id, widget_id: TEST_WIDGET_A, position: 0 })
      .select("id")
      .single();
    expect(insert.error).toBeNull();
    const prefId = insert.data!.id as string;

    const update = await alice
      .from("widget_preferences")
      .update({ position: 5 })
      .eq("user_id", SEED_USERS.alice.id)
      .eq("id", prefId)
      .select("position")
      .single();

    expect(update.error).toBeNull();
    expect(update.data?.position).toBe(5);
  });

  it("can delete a specific widget preference", async () => {
    const insert = await alice
      .from("widget_preferences")
      .insert({ user_id: SEED_USERS.alice.id, widget_id: TEST_WIDGET_A, position: 0 })
      .select("id")
      .single();
    expect(insert.error).toBeNull();

    const del = await alice
      .from("widget_preferences")
      .delete()
      .eq("user_id", SEED_USERS.alice.id)
      .eq("widget_id", TEST_WIDGET_A);
    expect(del.error).toBeNull();

    const check = await alice
      .from("widget_preferences")
      .select("id")
      .eq("user_id", SEED_USERS.alice.id)
      .eq("widget_id", TEST_WIDGET_A);
    expect(check.data).toEqual([]);
  });

  it("RLS: bob cannot read alice's widget preferences", async () => {
    const insert = await alice
      .from("widget_preferences")
      .insert({ user_id: SEED_USERS.alice.id, widget_id: TEST_WIDGET_A, position: 0 })
      .select("id")
      .single();
    expect(insert.error).toBeNull();
    const prefId = insert.data!.id as string;

    const bobRead = await bob.from("widget_preferences").select("id").eq("id", prefId);
    expect(bobRead.error).toBeNull();
    expect(bobRead.data).toEqual([]);
  });

  it("RLS: bob cannot update alice's widget preferences", async () => {
    const insert = await alice
      .from("widget_preferences")
      .insert({ user_id: SEED_USERS.alice.id, widget_id: TEST_WIDGET_A, position: 0 })
      .select("id")
      .single();
    expect(insert.error).toBeNull();
    const prefId = insert.data!.id as string;

    // Bob's update is a no-op under RLS
    await bob.from("widget_preferences").update({ position: 99 }).eq("id", prefId);

    const aliceCheck = await alice
      .from("widget_preferences")
      .select("position")
      .eq("id", prefId)
      .single();
    expect(aliceCheck.data?.position).toBe(0);
  });
});
