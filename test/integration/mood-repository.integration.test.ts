import type { SupabaseClient } from "@supabase/supabase-js";

import { descendingCursorFilter, type RecordCursor } from "@/src/lib/descending-cursor";
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

  const historyPage = async (limit: number, cursor: RecordCursor | null = null) => {
    let query = alice
      .from("mood_logs")
      .select("id,logged_at")
      .eq("user_id", SEED_USERS.alice.id)
      .order("logged_at", { ascending: false })
      .order("id", { ascending: false });
    if (cursor) query = query.or(descendingCursorFilter("logged_at", cursor));
    return query.limit(limit);
  };

  const cursorAfter = (rows: { id: string; logged_at: string }[]): RecordCursor => {
    const last = rows.at(-1)!;
    return { id: last.id, timestamp: last.logged_at };
  };

  it("keeps the original snapshot complete after an insert and breaks timestamp ties", async () => {
    const tied = "2026-05-20T08:00:00.000Z";
    const originalIds: string[] = [];
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
      originalIds.push(r.data!.id);
    }

    const first = await historyPage(2);
    expect(first.error).toBeNull();
    const inserted = await alice.from("mood_logs").insert({
      user_id: SEED_USERS.alice.id,
      mood_score: 4,
      logged_at: "2026-05-21T08:00:00.000Z",
      ...base,
    });
    expect(inserted.error).toBeNull();

    const second = await historyPage(2, cursorAfter(first.data!));
    expect(second.error).toBeNull();
    const third = await historyPage(2, cursorAfter(second.data!));

    expect(first.data).toHaveLength(2);
    expect(second.data).toHaveLength(2);
    expect(third.data).toHaveLength(1);

    const ids = [...first.data!, ...second.data!, ...third.data!].map((r) => r.id);
    expect(ids.sort()).toEqual(originalIds.sort());
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("does not skip the next pre-existing row when a loaded row is deleted", async () => {
    const originalIds: string[] = [];
    for (let i = 0; i < 5; i += 1) {
      const created = await alice
        .from("mood_logs")
        .insert({
          user_id: SEED_USERS.alice.id,
          mood_score: 3,
          logged_at: `2026-05-${20 - i}T08:00:00.000Z`,
          ...base,
        })
        .select("id")
        .single();
      expect(created.error).toBeNull();
      originalIds.push(created.data!.id);
    }

    const first = await historyPage(2);
    const removed = first.data![0].id;
    expect((await alice.from("mood_logs").delete().eq("id", removed)).error).toBeNull();
    const second = await historyPage(2, cursorAfter(first.data!));
    expect(second.error).toBeNull();
    const third = await historyPage(2, cursorAfter(second.data!));
    const ids = [...first.data!, ...second.data!, ...third.data!].map((row) => row.id);

    // The already-rendered deleted row remains in the snapshot, and every row
    // that existed below the cursor still appears exactly once.
    expect(ids.sort()).toEqual(originalIds.sort());
    expect(new Set(ids).size).toBe(ids.length);
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
