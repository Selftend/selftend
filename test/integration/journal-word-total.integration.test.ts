import type { SupabaseClient } from "@supabase/supabase-js";

import { SEED_USERS, createAnonClient, deleteAllJournalEntriesForUser, signInAs } from "./helpers";

// The hero word stat used to sum bodies over the client's 50-entry list query, so it
// silently truncated for heavy writers (#293). These cover the server-side replacement:
// exactness past the cap, agreement with countWords(), and per-user scoping.
describe("journal_word_total (integration)", () => {
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

  it("returns zero when the user has no entries", async () => {
    const total = await alice.rpc("journal_word_total");
    expect(total.error).toBeNull();
    expect(Number(total.data)).toBe(0);
  });

  it("counts every entry, not just the 50 the list query loads", async () => {
    // 60 entries of three words each: a capped-at-50 sum would report 150.
    const rows = Array.from({ length: 60 }, (_, i) => ({
      user_id: SEED_USERS.alice.id,
      title: `Entry ${i}`,
      body: "three little words",
    }));
    const insert = await alice.from("journal_entries").insert(rows);
    expect(insert.error).toBeNull();

    const total = await alice.rpc("journal_word_total");
    expect(total.error).toBeNull();
    expect(Number(total.data)).toBe(180);
  });

  it("splits on whitespace runs and newlines the way countWords() does", async () => {
    // countWords(): body.trim().split(/\s+/).length - collapsed runs, no empty tail.
    const insert = await alice.from("journal_entries").insert({
      user_id: SEED_USERS.alice.id,
      title: "Messy",
      body: "  Walked   outside\nFelt\tbetter after coffee.  ",
    });
    expect(insert.error).toBeNull();

    const total = await alice.rpc("journal_word_total");
    expect(total.error).toBeNull();
    expect(Number(total.data)).toBe(6);
  });

  it("counts only the caller's own entries", async () => {
    const mine = await alice.from("journal_entries").insert({
      user_id: SEED_USERS.alice.id,
      title: "Mine",
      body: "one two three four",
    });
    expect(mine.error).toBeNull();
    const theirs = await bob.from("journal_entries").insert({
      user_id: SEED_USERS.bob.id,
      title: "Theirs",
      body: "a much longer entry with plenty of words in it",
    });
    expect(theirs.error).toBeNull();

    const aliceTotal = await alice.rpc("journal_word_total");
    expect(aliceTotal.error).toBeNull();
    expect(Number(aliceTotal.data)).toBe(4);

    const bobTotal = await bob.rpc("journal_word_total");
    expect(bobTotal.error).toBeNull();
    expect(Number(bobTotal.data)).toBe(10);
  });

  it("rejects an unauthenticated caller", async () => {
    const anon = createAnonClient();
    const result = await anon.rpc("journal_word_total");
    expect(result.error).not.toBeNull();
  });
});
