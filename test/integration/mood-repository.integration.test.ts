import type { SupabaseClient } from "@supabase/supabase-js";

import { SEED_USERS, deleteAllMoodLogsForUser, signInAs } from "./helpers";

describe("mood mood_logs (integration)", () => {
  let alice: SupabaseClient;
  let bob: SupabaseClient;

  beforeAll(async () => {
    [alice, bob] = await Promise.all([signInAs("alice"), signInAs("bob")]);
  });
  afterEach(async () => {
    await deleteAllMoodLogsForUser(SEED_USERS.alice.id);
    await deleteAllMoodLogsForUser(SEED_USERS.bob.id);
  });
  afterAll(async () => {
    await Promise.all([alice.auth.signOut(), bob.auth.signOut()]);
  });

  const base = {
    emotions: ["Anxious"],
    notes: "",
    linked_strategy: null,
    situation: "",
    thoughts: "",
    behaviours: "",
    bodily_sensations: "",
  };

  it("inserts a mood log and reads it back", async () => {
    const insert = await alice
      .from("mood_logs")
      .insert({ user_id: SEED_USERS.alice.id, mood_score: 3, ...base })
      .select("*")
      .single();
    expect(insert.error).toBeNull();
    expect(insert.data).toMatchObject({ user_id: SEED_USERS.alice.id, mood_score: 3 });
    expect(insert.data?.logged_at).toEqual(expect.any(String));
  });

  it("rejects mood_score outside 1-5 via the check constraint", async () => {
    const tooHigh = await alice
      .from("mood_logs")
      .insert({ user_id: SEED_USERS.alice.id, mood_score: 6, ...base })
      .select("id");
    expect(tooHigh.error).not.toBeNull();
  });

  it("lists logs ordered by logged_at desc", async () => {
    for (const d of ["2026-05-13", "2026-05-15", "2026-05-14"]) {
      const r = await alice
        .from("mood_logs")
        .insert({
          user_id: SEED_USERS.alice.id,
          mood_score: 3,
          logged_at: `${d}T08:00:00.000Z`,
          ...base,
        })
        .select("id")
        .single();
      expect(r.error).toBeNull();
    }
    const list = await alice
      .from("mood_logs")
      .select("logged_at")
      .eq("user_id", SEED_USERS.alice.id)
      .order("logged_at", { ascending: false });
    expect(list.data?.map((r) => r.logged_at.slice(0, 10))).toEqual([
      "2026-05-15",
      "2026-05-14",
      "2026-05-13",
    ]);
  });

  // The all-history screen pages with `.range(offset, offset + limit - 1)` over
  // `(logged_at desc, id desc)` (#734). Both halves of that are assumptions about
  // PostgREST and Postgres that a mocked query builder cannot check: that `range`
  // is inclusive at BOTH ends, and that adding `id` makes the sort total so a row
  // cannot land on two pages - or on neither - when timestamps tie.
  it("pages the history without overlapping or dropping a row, even when logged_at ties", async () => {
    const tied = "2026-05-20T08:00:00.000Z";
    for (let i = 0; i < 5; i += 1) {
      const r = await alice
        .from("mood_logs")
        .insert({
          user_id: SEED_USERS.alice.id,
          mood_score: 3,
          // Three rows share an instant; two are strictly older.
          logged_at: i < 3 ? tied : `2026-05-1${9 - i}T08:00:00.000Z`,
          ...base,
        })
        .select("id")
        .single();
      expect(r.error).toBeNull();
    }

    const page = (offset: number, limit: number) =>
      alice
        .from("mood_logs")
        .select("id")
        .eq("user_id", SEED_USERS.alice.id)
        .order("logged_at", { ascending: false })
        .order("id", { ascending: false })
        .range(offset, offset + limit - 1);

    const first = await page(0, 2);
    const second = await page(2, 2);
    const third = await page(4, 2);
    expect(first.error).toBeNull();

    // Inclusive at both ends: a 2-row page is exactly 2 rows.
    expect(first.data).toHaveLength(2);
    expect(second.data).toHaveLength(2);
    // A short page is how the query hook learns it has reached the end.
    expect(third.data).toHaveLength(1);

    const ids = [...first.data!, ...second.data!, ...third.data!].map((r) => r.id);
    expect(new Set(ids).size).toBe(5);
  });

  it("scopes select by RLS so another user cannot read", async () => {
    const created = await alice
      .from("mood_logs")
      .insert({ user_id: SEED_USERS.alice.id, mood_score: 4, ...base })
      .select("id")
      .single();
    expect(created.error).toBeNull();
    const bobRead = await bob.from("mood_logs").select("id").eq("id", created.data!.id);
    expect(bobRead.data).toEqual([]);
  });

  it("another user's update is a no-op under RLS", async () => {
    const created = await alice
      .from("mood_logs")
      .insert({ user_id: SEED_USERS.alice.id, mood_score: 4, ...base, notes: "private" })
      .select("id")
      .single();
    await bob.from("mood_logs").update({ notes: "hacked" }).eq("id", created.data!.id);
    const check = await alice.from("mood_logs").select("notes").eq("id", created.data!.id).single();
    expect(check.data?.notes).toBe("private");
  });
});
