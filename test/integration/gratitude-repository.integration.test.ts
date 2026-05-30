import type { SupabaseClient } from "@supabase/supabase-js";

import { SEED_USERS, deleteAllGratitudeEntriesForUser, signInAs } from "./helpers";

describe("gratitude gratitude_entries (integration)", () => {
  let alice: SupabaseClient;
  let bob: SupabaseClient;

  beforeAll(async () => {
    [alice, bob] = await Promise.all([signInAs("alice"), signInAs("bob")]);
  });
  afterEach(async () => {
    await deleteAllGratitudeEntriesForUser(SEED_USERS.alice.id);
    await deleteAllGratitudeEntriesForUser(SEED_USERS.bob.id);
  });
  afterAll(async () => {
    await Promise.all([alice.auth.signOut(), bob.auth.signOut()]);
  });

  const baseEntry = {
    item_1: "Morning coffee",
    item_2: "Good weather",
    item_3: "Family",
    item_4: "",
    item_5: "",
    note: "",
    level: 3,
    events: [],
    good_moment: "",
    miss_if_gone: "",
    hidden_good: "",
    life_item_1: "",
    life_item_2: "",
    life_item_3: "",
    starred: false,
  };

  it("inserts a gratitude entry and reads it back", async () => {
    const insert = await alice
      .from("gratitude_entries")
      .insert({ user_id: SEED_USERS.alice.id, ...baseEntry })
      .select("*")
      .single();
    expect(insert.error).toBeNull();
    expect(insert.data).toMatchObject({
      user_id: SEED_USERS.alice.id,
      item_1: "Morning coffee",
      item_2: "Good weather",
      item_3: "Family",
      level: 3,
      starred: false,
    });
    expect(insert.data?.logged_at).toEqual(expect.any(String));
  });

  it("rejects a blank item_1 via the check constraint", async () => {
    const result = await alice
      .from("gratitude_entries")
      .insert({ user_id: SEED_USERS.alice.id, ...baseEntry, item_1: "   " })
      .select("id");
    expect(result.error).not.toBeNull();
  });

  it("reads back starred and level columns correctly", async () => {
    const insert = await alice
      .from("gratitude_entries")
      .insert({ user_id: SEED_USERS.alice.id, ...baseEntry, starred: true, level: 1 })
      .select("starred, level")
      .single();
    expect(insert.error).toBeNull();
    expect(insert.data?.starred).toBe(true);
    expect(insert.data?.level).toBe(1);
  });

  it("rejects a level outside 1-3 via the check constraint", async () => {
    const result = await alice
      .from("gratitude_entries")
      .insert({ user_id: SEED_USERS.alice.id, ...baseEntry, level: 4 })
      .select("id");
    expect(result.error).not.toBeNull();
  });

  it("lists entries ordered by logged_at desc", async () => {
    const rows = [
      { logged_at: "2026-05-13T08:00:00.000Z" },
      { logged_at: "2026-05-15T08:00:00.000Z" },
      { logged_at: "2026-05-14T08:00:00.000Z" },
    ];
    for (const row of rows) {
      const r = await alice
        .from("gratitude_entries")
        .insert({ user_id: SEED_USERS.alice.id, ...baseEntry, ...row })
        .select("id")
        .single();
      expect(r.error).toBeNull();
    }

    const list = await alice
      .from("gratitude_entries")
      .select("logged_at")
      .eq("user_id", SEED_USERS.alice.id)
      .order("logged_at", { ascending: false });
    expect(list.error).toBeNull();
    expect(list.data?.map((r) => r.logged_at.slice(0, 10))).toEqual([
      "2026-05-15",
      "2026-05-14",
      "2026-05-13",
    ]);
  });

  it("scopes select by RLS so another user cannot read", async () => {
    const created = await alice
      .from("gratitude_entries")
      .insert({ user_id: SEED_USERS.alice.id, ...baseEntry })
      .select("id")
      .single();
    expect(created.error).toBeNull();

    const bobRead = await bob.from("gratitude_entries").select("id").eq("id", created.data!.id);
    expect(bobRead.error).toBeNull();
    expect(bobRead.data).toEqual([]);
  });

  it("another user's update is a no-op under RLS", async () => {
    const created = await alice
      .from("gratitude_entries")
      .insert({ user_id: SEED_USERS.alice.id, ...baseEntry, item_1: "Private gratitude" })
      .select("id")
      .single();
    expect(created.error).toBeNull();

    await bob.from("gratitude_entries").update({ item_1: "hacked" }).eq("id", created.data!.id);

    const check = await alice
      .from("gratitude_entries")
      .select("item_1")
      .eq("id", created.data!.id)
      .single();
    expect(check.data?.item_1).toBe("Private gratitude");
  });
});
