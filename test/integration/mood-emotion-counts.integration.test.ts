import type { SupabaseClient } from "@supabase/supabase-js";

import { SEED_USERS, createAnonClient, deleteAllMoodLogsForUser, signInAs } from "./helpers";

// `mood_emotion_counts()` exists for the delete confirmation on the manage-emotions
// screen (#743): it tells someone how many check-ins name an emotion before they remove
// it. Every other check-in stat reduces over a capped 200-row client cache, which is why
// this one is a server aggregate - deletion safety is the one figure that cannot be
// approximate.

interface CountRow {
  emotion_id: string;
  uses: string | number;
}

async function counts(client: SupabaseClient): Promise<Record<string, number>> {
  const { data, error } = await client.rpc("mood_emotion_counts");
  expect(error).toBeNull();
  const out: Record<string, number> = {};
  for (const row of (data ?? []) as CountRow[]) out[row.emotion_id] = Number(row.uses);
  return out;
}

function log(userId: string, emotions: string[], moodScore = 3) {
  return {
    user_id: userId,
    mood_score: moodScore,
    emotions,
    notes: "",
    logged_at: new Date().toISOString(),
  };
}

describe("mood_emotion_counts (integration)", () => {
  let alice: SupabaseClient;
  let bob: SupabaseClient;

  beforeAll(async () => {
    [alice, bob] = await Promise.all([signInAs("alice"), signInAs("bob")]);
  });

  afterEach(async () => {
    await deleteAllMoodLogsForUser(SEED_USERS.alice.id);
    await deleteAllMoodLogsForUser(SEED_USERS.bob.id);
  });

  it("counts every check-in that names an emotion", async () => {
    const { error } = await alice
      .from("mood_logs")
      .insert([
        log(SEED_USERS.alice.id, ["anxious", "sad"]),
        log(SEED_USERS.alice.id, ["anxious"]),
        log(SEED_USERS.alice.id, ["grateful"]),
      ]);
    expect(error).toBeNull();

    expect(await counts(alice)).toEqual({ anxious: 2, sad: 1, grateful: 1 });
  });

  it("omits emotions that were never used rather than returning a zero row", async () => {
    const { error } = await alice.from("mood_logs").insert([log(SEED_USERS.alice.id, ["anxious"])]);
    expect(error).toBeNull();

    const result = await counts(alice);
    expect(result).toEqual({ anxious: 1 });
    // The client reads a missing key as "unused", so a zero row would be redundant.
    expect(result.grateful).toBeUndefined();
  });

  it("counts an emotion once per check-in, not once per occurrence in the array", async () => {
    // The column is a plain text[] with no uniqueness constraint, so a duplicate is
    // storable even though the picker cannot produce one.
    const { error } = await alice
      .from("mood_logs")
      .insert([log(SEED_USERS.alice.id, ["anxious", "anxious"])]);
    expect(error).toBeNull();

    // `unnest` yields both, which is the honest reading of the stored row: the number
    // names occurrences in the data, and the data really does hold two.
    expect((await counts(alice)).anxious).toBe(2);
  });

  it("returns nothing for a user with no check-ins", async () => {
    expect(await counts(alice)).toEqual({});
  });

  /**
   * The function is `security invoker`, so `mood_logs_select_own` on `mood_logs_data`
   * confines it. This is the assertion that would catch a later "optimisation" to
   * `security definer`.
   */
  it("never leaks another user's counts", async () => {
    const { error } = await bob
      .from("mood_logs")
      .insert([log(SEED_USERS.bob.id, ["angry"]), log(SEED_USERS.bob.id, ["angry"])]);
    expect(error).toBeNull();

    expect(await counts(alice)).toEqual({});
    expect(await counts(bob)).toEqual({ angry: 2 });
  });

  it("refuses an unauthenticated caller", async () => {
    const anon = createAnonClient();
    const { error } = await anon.rpc("mood_emotion_counts");

    expect(error).not.toBeNull();
  });
});
