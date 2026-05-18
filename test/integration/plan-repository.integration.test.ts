import type { SupabaseClient } from "@supabase/supabase-js";

import { SEED_USERS, createServiceClient, signInAs } from "./helpers";

// Mirrors queries in src/features/plan/repository.ts. Tests the DB contract for
// plan_items: frequency check, RLS scope, item_order ordering, active filter.

async function deleteAllPlanItemsForUser(userId: string) {
  const admin = createServiceClient();
  await admin.from("plan_items").delete().eq("user_id", userId);
}

describe("plan_items (integration)", () => {
  let alice: SupabaseClient;
  let bob: SupabaseClient;

  beforeAll(async () => {
    alice = await signInAs("alice");
    bob = await signInAs("bob");
  });

  afterEach(async () => {
    await deleteAllPlanItemsForUser(SEED_USERS.alice.id);
    await deleteAllPlanItemsForUser(SEED_USERS.bob.id);
  });

  afterAll(async () => {
    await alice.auth.signOut();
    await bob.auth.signOut();
  });

  it("inserts a plan item with default frequency=daily and active=true", async () => {
    const insert = await alice
      .from("plan_items")
      .insert({
        user_id: SEED_USERS.alice.id,
        title: "Mood check-in",
        tool_id: "mood",
        route: "/tools/mood-tracker/new",
      })
      .select("*")
      .single();
    expect(insert.error).toBeNull();
    expect(insert.data).toMatchObject({
      user_id: SEED_USERS.alice.id,
      title: "Mood check-in",
      tool_id: "mood",
      frequency: "daily",
      reminder_enabled: false,
      item_order: 0,
      active: true,
    });
  });

  it("rejects an unknown frequency value", async () => {
    const insert = await alice
      .from("plan_items")
      .insert({
        user_id: SEED_USERS.alice.id,
        title: "x",
        tool_id: "mood",
        route: "/",
        frequency: "hourly",
      })
      .select("id");
    expect(insert.error).not.toBeNull();
  });

  it("lists only active items ordered by item_order ascending", async () => {
    const inputs = [
      { title: "Third", tool_id: "habits", item_order: 2, active: true },
      { title: "Inactive", tool_id: "journal", item_order: 99, active: false },
      { title: "First", tool_id: "mood", item_order: 0, active: true },
      { title: "Second", tool_id: "cbt", item_order: 1, active: true },
    ];
    for (const i of inputs) {
      const r = await alice
        .from("plan_items")
        .insert({ user_id: SEED_USERS.alice.id, route: "/", ...i })
        .select("id")
        .single();
      expect(r.error).toBeNull();
    }

    const list = await alice
      .from("plan_items")
      .select("title")
      .eq("user_id", SEED_USERS.alice.id)
      .eq("active", true)
      .order("item_order", { ascending: true });

    expect(list.error).toBeNull();
    expect(list.data?.map((r) => r.title)).toEqual(["First", "Second", "Third"]);
  });

  it("another user cannot read or modify a plan item under RLS", async () => {
    const created = await alice
      .from("plan_items")
      .insert({
        user_id: SEED_USERS.alice.id,
        title: "Mine",
        tool_id: "mood",
        route: "/",
      })
      .select("id")
      .single();
    expect(created.error).toBeNull();

    const bobRead = await bob.from("plan_items").select("id").eq("id", created.data!.id);
    expect(bobRead.data).toEqual([]);

    await bob.from("plan_items").update({ title: "Hacked" }).eq("id", created.data!.id);
    const verify = await alice
      .from("plan_items")
      .select("title")
      .eq("id", created.data!.id)
      .single();
    expect(verify.data?.title).toBe("Mine");
  });
});
