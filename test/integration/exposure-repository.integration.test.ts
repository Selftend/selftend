import type { SupabaseClient } from "@supabase/supabase-js";

import { SEED_USERS, createServiceClient, deleteAllExposureForUser, signInAs } from "./helpers";

// Tests the DB contract for exposure_hierarchies + exposure_items + exposure_sessions
// (20260515_cbt_phase3.sql).
// exposure_hierarchies: id, user_id, title, anxiety_type
// exposure_items: id, hierarchy_id (FK → exposure_hierarchies.id ON DELETE CASCADE),
//   user_id, description, suds_rating (0-100), completed_at
// exposure_sessions: id, exposure_item_id (FK → exposure_items.id ON DELETE CASCADE),
//   user_id, pre_suds (0-100), post_suds (0-100), duration_minutes (>=0),
//   safety_behaviors_used, safety_behavior_description, notes, completed_at

describe("exposure_hierarchies + exposure_items + exposure_sessions (integration)", () => {
  let alice: SupabaseClient;
  let bob: SupabaseClient;

  beforeAll(async () => {
    [alice, bob] = await Promise.all([signInAs("alice"), signInAs("bob")]);
  });

  afterEach(async () => {
    await Promise.all([
      deleteAllExposureForUser(SEED_USERS.alice.id),
      deleteAllExposureForUser(SEED_USERS.bob.id),
    ]);
  });

  afterAll(async () => {
    await Promise.all([alice.auth.signOut(), bob.auth.signOut()]);
  });

  it("inserts a hierarchy and reads it back", async () => {
    const insert = await alice
      .from("exposure_hierarchies")
      .insert({
        user_id: SEED_USERS.alice.id,
        title: "Social anxiety ladder",
        anxiety_type: "social",
      })
      .select("*")
      .single();

    expect(insert.error).toBeNull();
    expect(insert.data).toMatchObject({
      user_id: SEED_USERS.alice.id,
      title: "Social anxiety ladder",
      anxiety_type: "social",
    });
    expect(insert.data?.id).toEqual(expect.any(String));
    expect(insert.data?.created_at).toEqual(expect.any(String));
  });

  it("inserts an exposure item referencing a hierarchy and reads it back", async () => {
    const hierInsert = await alice
      .from("exposure_hierarchies")
      .insert({
        user_id: SEED_USERS.alice.id,
        title: "Social anxiety ladder",
        anxiety_type: "social",
      })
      .select("id")
      .single();
    expect(hierInsert.error).toBeNull();
    const hierarchyId = hierInsert.data!.id as string;

    const itemInsert = await alice
      .from("exposure_items")
      .insert({
        hierarchy_id: hierarchyId,
        user_id: SEED_USERS.alice.id,
        description: "Make eye contact with a stranger",
        suds_rating: 30,
      })
      .select("*")
      .single();

    expect(itemInsert.error).toBeNull();
    expect(itemInsert.data).toMatchObject({
      hierarchy_id: hierarchyId,
      user_id: SEED_USERS.alice.id,
      description: "Make eye contact with a stranger",
      suds_rating: 30,
      completed_at: null,
    });
  });

  it("inserts an exposure session referencing an item and reads it back", async () => {
    const hierInsert = await alice
      .from("exposure_hierarchies")
      .insert({
        user_id: SEED_USERS.alice.id,
        title: "Ladder",
        anxiety_type: "social",
      })
      .select("id")
      .single();
    expect(hierInsert.error).toBeNull();
    const hierarchyId = hierInsert.data!.id as string;

    const itemInsert = await alice
      .from("exposure_items")
      .insert({
        hierarchy_id: hierarchyId,
        user_id: SEED_USERS.alice.id,
        description: "Greet a coworker",
        suds_rating: 20,
      })
      .select("id")
      .single();
    expect(itemInsert.error).toBeNull();
    const itemId = itemInsert.data!.id as string;

    const sessionInsert = await alice
      .from("exposure_sessions")
      .insert({
        exposure_item_id: itemId,
        user_id: SEED_USERS.alice.id,
        pre_suds: 50,
        post_suds: 25,
        duration_minutes: 10,
        safety_behaviors_used: false,
        safety_behavior_description: "",
        notes: "Went well",
      })
      .select("*")
      .single();

    expect(sessionInsert.error).toBeNull();
    expect(sessionInsert.data).toMatchObject({
      exposure_item_id: itemId,
      user_id: SEED_USERS.alice.id,
      pre_suds: 50,
      post_suds: 25,
      duration_minutes: 10,
      safety_behaviors_used: false,
      notes: "Went well",
    });
    expect(sessionInsert.data?.completed_at).toEqual(expect.any(String));
  });

  it("lists items ordered by suds_rating ascending", async () => {
    const hierInsert = await alice
      .from("exposure_hierarchies")
      .insert({
        user_id: SEED_USERS.alice.id,
        title: "Ordered ladder",
        anxiety_type: "phobia",
      })
      .select("id")
      .single();
    expect(hierInsert.error).toBeNull();
    const hierarchyId = hierInsert.data!.id as string;

    const items = [
      { description: "High SUDS", suds_rating: 80 },
      { description: "Low SUDS", suds_rating: 20 },
      { description: "Mid SUDS", suds_rating: 50 },
    ];
    for (const item of items) {
      const r = await alice
        .from("exposure_items")
        .insert({ hierarchy_id: hierarchyId, user_id: SEED_USERS.alice.id, ...item })
        .select("id")
        .single();
      expect(r.error).toBeNull();
    }

    const list = await alice
      .from("exposure_items")
      .select("suds_rating")
      .eq("user_id", SEED_USERS.alice.id)
      .eq("hierarchy_id", hierarchyId)
      .order("suds_rating", { ascending: true });

    expect(list.error).toBeNull();
    expect(list.data?.map((r) => r.suds_rating)).toEqual([20, 50, 80]);
  });

  it("rejects suds_rating outside 0-100 via the check constraint", async () => {
    const hierInsert = await alice
      .from("exposure_hierarchies")
      .insert({
        user_id: SEED_USERS.alice.id,
        title: "Constraint test",
        anxiety_type: "test",
      })
      .select("id")
      .single();
    expect(hierInsert.error).toBeNull();
    const hierarchyId = hierInsert.data!.id as string;

    const tooHigh = await alice
      .from("exposure_items")
      .insert({
        hierarchy_id: hierarchyId,
        user_id: SEED_USERS.alice.id,
        description: "Too high",
        suds_rating: 101,
      })
      .select("id");
    expect(tooHigh.error).not.toBeNull();

    const tooLow = await alice
      .from("exposure_items")
      .insert({
        hierarchy_id: hierarchyId,
        user_id: SEED_USERS.alice.id,
        description: "Too low",
        suds_rating: -1,
      })
      .select("id");
    expect(tooLow.error).not.toBeNull();
  });

  it("rejects pre_suds/post_suds outside 0-100 in sessions", async () => {
    const hierInsert = await alice
      .from("exposure_hierarchies")
      .insert({ user_id: SEED_USERS.alice.id, title: "Constraint test", anxiety_type: "test" })
      .select("id")
      .single();
    const hierarchyId = hierInsert.data!.id as string;

    const itemInsert = await alice
      .from("exposure_items")
      .insert({
        hierarchy_id: hierarchyId,
        user_id: SEED_USERS.alice.id,
        description: "Item",
        suds_rating: 50,
      })
      .select("id")
      .single();
    const itemId = itemInsert.data!.id as string;

    const badSession = await alice
      .from("exposure_sessions")
      .insert({
        exposure_item_id: itemId,
        user_id: SEED_USERS.alice.id,
        pre_suds: 110,
        post_suds: 50,
        duration_minutes: 10,
        safety_behaviors_used: false,
        safety_behavior_description: "",
        notes: "",
      })
      .select("id");
    expect(badSession.error).not.toBeNull();
  });

  it("RLS: bob cannot read alice's exposure hierarchies", async () => {
    const hierInsert = await alice
      .from("exposure_hierarchies")
      .insert({
        user_id: SEED_USERS.alice.id,
        title: "Alice private ladder",
        anxiety_type: "social",
      })
      .select("id")
      .single();
    expect(hierInsert.error).toBeNull();
    const hierarchyId = hierInsert.data!.id as string;

    const bobRead = await bob.from("exposure_hierarchies").select("id").eq("id", hierarchyId);
    expect(bobRead.error).toBeNull();
    expect(bobRead.data).toEqual([]);
  });

  it("RLS: bob cannot read alice's exposure items", async () => {
    const hierInsert = await alice
      .from("exposure_hierarchies")
      .insert({ user_id: SEED_USERS.alice.id, title: "Ladder", anxiety_type: "social" })
      .select("id")
      .single();
    const hierarchyId = hierInsert.data!.id as string;

    const itemInsert = await alice
      .from("exposure_items")
      .insert({
        hierarchy_id: hierarchyId,
        user_id: SEED_USERS.alice.id,
        description: "Private item",
        suds_rating: 40,
      })
      .select("id")
      .single();
    expect(itemInsert.error).toBeNull();
    const itemId = itemInsert.data!.id as string;

    const bobRead = await bob.from("exposure_items").select("id").eq("id", itemId);
    expect(bobRead.error).toBeNull();
    expect(bobRead.data).toEqual([]);
  });

  it("RLS: bob cannot read alice's exposure sessions", async () => {
    const hierInsert = await alice
      .from("exposure_hierarchies")
      .insert({ user_id: SEED_USERS.alice.id, title: "Ladder", anxiety_type: "social" })
      .select("id")
      .single();
    const hierarchyId = hierInsert.data!.id as string;

    const itemInsert = await alice
      .from("exposure_items")
      .insert({
        hierarchy_id: hierarchyId,
        user_id: SEED_USERS.alice.id,
        description: "Item",
        suds_rating: 30,
      })
      .select("id")
      .single();
    const itemId = itemInsert.data!.id as string;

    const sessionInsert = await alice
      .from("exposure_sessions")
      .insert({
        exposure_item_id: itemId,
        user_id: SEED_USERS.alice.id,
        pre_suds: 60,
        post_suds: 30,
        duration_minutes: 15,
        safety_behaviors_used: false,
        safety_behavior_description: "",
        notes: "Private session",
      })
      .select("id")
      .single();
    expect(sessionInsert.error).toBeNull();
    const sessionId = sessionInsert.data!.id as string;

    const bobRead = await bob.from("exposure_sessions").select("id").eq("id", sessionId);
    expect(bobRead.error).toBeNull();
    expect(bobRead.data).toEqual([]);
  });

  it("deleting a hierarchy cascades to items and sessions", async () => {
    const hierInsert = await alice
      .from("exposure_hierarchies")
      .insert({ user_id: SEED_USERS.alice.id, title: "Cascade test", anxiety_type: "social" })
      .select("id")
      .single();
    const hierarchyId = hierInsert.data!.id as string;

    const itemInsert = await alice
      .from("exposure_items")
      .insert({
        hierarchy_id: hierarchyId,
        user_id: SEED_USERS.alice.id,
        description: "Will cascade",
        suds_rating: 40,
      })
      .select("id")
      .single();
    const itemId = itemInsert.data!.id as string;

    const sessionInsert = await alice
      .from("exposure_sessions")
      .insert({
        exposure_item_id: itemId,
        user_id: SEED_USERS.alice.id,
        pre_suds: 40,
        post_suds: 20,
        duration_minutes: 5,
        safety_behaviors_used: false,
        safety_behavior_description: "",
        notes: "",
      })
      .select("id")
      .single();
    const sessionId = sessionInsert.data!.id as string;

    const admin = createServiceClient();
    await admin.from("exposure_hierarchies").delete().eq("id", hierarchyId);

    const itemCheck = await admin.from("exposure_items").select("id").eq("id", itemId);
    expect(itemCheck.data).toEqual([]);

    const sessionCheck = await admin.from("exposure_sessions").select("id").eq("id", sessionId);
    expect(sessionCheck.data).toEqual([]);
  });
});
