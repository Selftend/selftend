import type { SupabaseClient } from "@supabase/supabase-js";

import { SEED_USERS, deleteAllJournalEntriesForUser, signInAs } from "./helpers";

describe("journal journal_entries (integration)", () => {
  let alice: SupabaseClient;
  let bob: SupabaseClient;

  beforeAll(async () => {
    [alice, bob] = await Promise.all([signInAs("alice"), signInAs("bob")]);
  });
  afterEach(async () => {
    await deleteAllJournalEntriesForUser(SEED_USERS.alice.id);
    await deleteAllJournalEntriesForUser(SEED_USERS.bob.id);
  });
  afterAll(async () => {
    await Promise.all([alice.auth.signOut(), bob.auth.signOut()]);
  });

  it("inserts a journal entry and reads it back", async () => {
    const insert = await alice
      .from("journal_entries")
      .insert({ user_id: SEED_USERS.alice.id, title: "My Day", body: "Felt good today." })
      .select("*")
      .single();
    expect(insert.error).toBeNull();
    expect(insert.data).toMatchObject({
      user_id: SEED_USERS.alice.id,
      title: "My Day",
      body: "Felt good today.",
    });
    expect(insert.data?.created_at).toEqual(expect.any(String));
    expect(insert.data?.updated_at).toEqual(expect.any(String));
  });

  it("rejects an entry with a blank body via the check constraint", async () => {
    const result = await alice
      .from("journal_entries")
      .insert({ user_id: SEED_USERS.alice.id, title: "Empty", body: "   " })
      .select("id");
    expect(result.error).not.toBeNull();
  });

  it("lists entries ordered by created_at desc", async () => {
    const rows = [
      { title: "A", body: "First entry", created_at: "2026-05-13T08:00:00.000Z" },
      { title: "C", body: "Third entry", created_at: "2026-05-15T08:00:00.000Z" },
      { title: "B", body: "Second entry", created_at: "2026-05-14T08:00:00.000Z" },
    ];
    for (const row of rows) {
      const r = await alice
        .from("journal_entries")
        .insert({ user_id: SEED_USERS.alice.id, ...row })
        .select("id")
        .single();
      expect(r.error).toBeNull();
    }

    const list = await alice
      .from("journal_entries")
      .select("title")
      .eq("user_id", SEED_USERS.alice.id)
      .order("created_at", { ascending: false });
    expect(list.error).toBeNull();
    expect(list.data?.map((r) => r.title)).toEqual(["C", "B", "A"]);
  });

  it("scopes select by RLS so another user cannot read", async () => {
    const created = await alice
      .from("journal_entries")
      .insert({ user_id: SEED_USERS.alice.id, title: "Private", body: "Secret thoughts." })
      .select("id")
      .single();
    expect(created.error).toBeNull();

    const bobRead = await bob.from("journal_entries").select("id").eq("id", created.data!.id);
    expect(bobRead.error).toBeNull();
    expect(bobRead.data).toEqual([]);
  });

  it("another user's update is a no-op under RLS", async () => {
    const created = await alice
      .from("journal_entries")
      .insert({ user_id: SEED_USERS.alice.id, title: "Private", body: "Original body." })
      .select("id")
      .single();
    expect(created.error).toBeNull();

    await bob.from("journal_entries").update({ body: "hacked" }).eq("id", created.data!.id);

    const check = await alice
      .from("journal_entries")
      .select("body")
      .eq("id", created.data!.id)
      .single();
    expect(check.data?.body).toBe("Original body.");
  });
});
