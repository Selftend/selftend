import type { SupabaseClient } from "@supabase/supabase-js";

import {
  SEED_USERS,
  createServiceClient,
  deleteAllMindfulnessSessionsForUser,
  signInAs,
} from "./helpers";

// Verifies the transparent encrypted view over mindfulness_sessions:
// - reflection + feeling_after round-trip plaintext through the same `mindfulness_sessions` name,
//   while `mindfulness_sessions_data` holds only ciphertext (*_enc).
// - feeling_after NULL semantics survive: a null feeling_after round-trips as null and its
//   ciphertext column is NULL at rest (app.encrypt_text(NULL)=NULL).
// - pass-through columns (exercise_name, duration_minutes, mood_after, cycles, duration_seconds,
//   completed_at) survive a round-trip.
// - RLS isolates a second user.
// NOTE: mindfulness_sessions has only INSERT/SELECT RLS policies (no UPDATE, no DELETE). The client
//   only ever inserts + reads. A user UPDATE/DELETE through the view is an RLS no-op (pre-existing
//   behavior). The DELETE-trigger path is exercised via the service-role admin client (cleanup).

function cipherToText(value: unknown): string {
  if (value == null) return "";
  if (typeof value === "string") return value;
  return JSON.stringify(value);
}

const REFLECTION = "Felt my shoulders soften (secret-marker-REF)";
const FEELING = "calm and steady (secret-marker-FEEL)";

describe("mindfulness_sessions encrypted view (integration)", () => {
  let alice: SupabaseClient;
  let bob: SupabaseClient;
  const admin = createServiceClient();

  beforeAll(async () => {
    [alice, bob] = await Promise.all([signInAs("alice"), signInAs("bob")]);
  });
  afterEach(async () => {
    await deleteAllMindfulnessSessionsForUser(SEED_USERS.alice.id);
    await deleteAllMindfulnessSessionsForUser(SEED_USERS.bob.id);
  });
  afterAll(async () => {
    await Promise.all([alice.auth.signOut(), bob.auth.signOut()]);
  });

  function baseRow() {
    return {
      user_id: SEED_USERS.alice.id,
      exercise_name: "body-scan",
      duration_minutes: 12,
      reflection: REFLECTION,
      feeling_after: FEELING,
      mood_after: 4,
      completed_at: "2026-06-08T09:00:00.000Z",
      cycles: 6,
      duration_seconds: 720,
    };
  }

  it("INSERT round-trips plaintext while storing ciphertext at rest", async () => {
    const insert = await alice.from("mindfulness_sessions").insert(baseRow()).select("*").single();
    expect(insert.error).toBeNull();
    expect(insert.data).toMatchObject({
      user_id: SEED_USERS.alice.id,
      exercise_name: "body-scan",
      duration_minutes: 12,
      reflection: REFLECTION,
      feeling_after: FEELING,
      mood_after: 4,
      cycles: 6,
      duration_seconds: 720,
    });

    const id = insert.data!.id as string;

    const atRest = await admin
      .from("mindfulness_sessions_data")
      .select("reflection_enc, feeling_after_enc")
      .eq("id", id)
      .single();
    expect(atRest.error).toBeNull();
    expect(cipherToText(atRest.data?.reflection_enc).length).toBeGreaterThan(0);
    expect(cipherToText(atRest.data?.reflection_enc)).not.toContain("secret-marker-REF");
    expect(cipherToText(atRest.data?.feeling_after_enc)).not.toContain("secret-marker-FEEL");
  });

  it("INSERT with null feeling_after round-trips as null with null ciphertext at rest", async () => {
    const insert = await alice
      .from("mindfulness_sessions")
      .insert({ ...baseRow(), feeling_after: null })
      .select("*")
      .single();
    expect(insert.error).toBeNull();
    expect(insert.data?.feeling_after).toBeNull();
    expect(insert.data?.reflection).toBe(REFLECTION);

    const id = insert.data!.id as string;

    const atRest = await admin
      .from("mindfulness_sessions_data")
      .select("reflection_enc, feeling_after_enc")
      .eq("id", id)
      .single();
    expect(atRest.error).toBeNull();
    // reflection still encrypted; feeling_after_enc is NULL (NULL round-trips through encrypt).
    expect(cipherToText(atRest.data?.reflection_enc).length).toBeGreaterThan(0);
    expect(atRest.data?.feeling_after_enc).toBeNull();
  });

  it("DELETE via the view's trigger (service-role) removes the base row", async () => {
    const created = await alice
      .from("mindfulness_sessions")
      .insert(baseRow())
      .select("id")
      .single();
    expect(created.error).toBeNull();
    const id = created.data!.id as string;

    const del = await admin.from("mindfulness_sessions").delete().eq("id", id);
    expect(del.error).toBeNull();

    const baseRead = await admin.from("mindfulness_sessions_data").select("id").eq("id", id);
    expect(baseRead.error).toBeNull();
    expect(baseRead.data).toEqual([]);
  });

  it("RLS: a second user cannot read another user's mindfulness session", async () => {
    const created = await alice
      .from("mindfulness_sessions")
      .insert(baseRow())
      .select("id")
      .single();
    expect(created.error).toBeNull();
    const id = created.data!.id as string;

    const bobRead = await bob.from("mindfulness_sessions").select("id, reflection").eq("id", id);
    expect(bobRead.error).toBeNull();
    expect(bobRead.data).toEqual([]);

    const aliceRead = await alice
      .from("mindfulness_sessions")
      .select("reflection, feeling_after, exercise_name")
      .eq("id", id)
      .single();
    expect(aliceRead.error).toBeNull();
    expect(aliceRead.data?.reflection).toBe(REFLECTION);
    expect(aliceRead.data?.feeling_after).toBe(FEELING);
    expect(aliceRead.data?.exercise_name).toBe("body-scan");
  });
});
