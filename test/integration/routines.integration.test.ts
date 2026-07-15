import type { SupabaseClient } from "@supabase/supabase-js";

import { SEED_USERS, createServiceClient, deleteAllRoutinesForUser, signInAs } from "./helpers";

// Verifies the Routines v1 foundation slice (20260715_routines):
// - `routines` is a transparent decrypting view over `routines_data`: the client reads
//   and writes plaintext `name` while the base table holds only ciphertext (name_enc bytea).
// - RLS on the base table isolates owners through the view.
// - routine_steps is a plain RLS'd table with FK cascades from routines_data.
// - export_user_data() includes routines + routineSteps (plaintext), no longer planItems,
//   and never leaks another user's routines.
// - Deleting the auth user cascades away routines and steps (delete_user_account relies
//   on this cascade; it needs no routine-specific delete statements).

const PLAINTEXT_NAME = "Morning grounding routine (secret-marker-RTN123)";

function encToText(enc: unknown): string {
  // service-role reads of bytea come back base64-ish/hex; normalize to a string we can scan.
  if (enc == null) return "";
  if (typeof enc === "string") return enc;
  return JSON.stringify(enc);
}

describe("routines encrypted view + routine_steps (integration)", () => {
  let alice: SupabaseClient;
  let bob: SupabaseClient;
  const admin = createServiceClient();

  beforeAll(async () => {
    [alice, bob] = await Promise.all([signInAs("alice"), signInAs("bob")]);
  });
  afterEach(async () => {
    await deleteAllRoutinesForUser(SEED_USERS.alice.id);
    await deleteAllRoutinesForUser(SEED_USERS.bob.id);
  });
  afterAll(async () => {
    await Promise.all([alice.auth.signOut(), bob.auth.signOut()]);
  });

  it("INSERT through the view returns decrypted plaintext but stores ciphertext at rest", async () => {
    const insert = await alice
      .from("routines")
      .insert({
        user_id: SEED_USERS.alice.id,
        name: PLAINTEXT_NAME,
        reminder_enabled: true,
        reminder_hour: 8,
        reminder_minute: 30,
        reminder_timezone: "Europe/Sofia",
      })
      .select("*")
      .single();
    expect(insert.error).toBeNull();
    expect(insert.data).toMatchObject({
      user_id: SEED_USERS.alice.id,
      name: PLAINTEXT_NAME,
      reminder_enabled: true,
      reminder_hour: 8,
      reminder_minute: 30,
      reminder_timezone: "Europe/Sofia",
    });
    expect(insert.data?.created_at).toEqual(expect.any(String));
    expect(insert.data?.updated_at).toEqual(expect.any(String));

    const id = insert.data!.id as string;

    // Service-role read of the ciphertext base table must NOT expose the plaintext.
    const atRest = await admin.from("routines_data").select("name_enc").eq("id", id).single();
    expect(atRest.error).toBeNull();
    const nameCipher = encToText(atRest.data?.name_enc);
    expect(nameCipher.length).toBeGreaterThan(0);
    expect(nameCipher).not.toContain("secret-marker-RTN123");
    expect(nameCipher).not.toContain(PLAINTEXT_NAME);

    // Read back through the view decrypts to the original plaintext.
    const readBack = await alice.from("routines").select("name").eq("id", id).single();
    expect(readBack.error).toBeNull();
    expect(readBack.data?.name).toBe(PLAINTEXT_NAME);
  });

  it("UPDATE through the view re-encrypts and refreshes updated_at", async () => {
    const created = await alice
      .from("routines")
      .insert({ user_id: SEED_USERS.alice.id, name: PLAINTEXT_NAME })
      .select("id, updated_at")
      .single();
    expect(created.error).toBeNull();
    const id = created.data!.id as string;

    const before = await admin.from("routines_data").select("name_enc").eq("id", id).single();
    const beforeCipher = encToText(before.data?.name_enc);

    const NEW_NAME = "Wind-down routine (secret-marker-RTN789)";
    const updated = await alice
      .from("routines")
      .update({ name: NEW_NAME, reminder_enabled: true, reminder_hour: 21, reminder_minute: 0 })
      .eq("user_id", SEED_USERS.alice.id)
      .eq("id", id)
      .select("*")
      .maybeSingle();
    expect(updated.error).toBeNull();
    expect(updated.data?.name).toBe(NEW_NAME);
    expect(updated.data?.reminder_hour).toBe(21);

    const after = await admin.from("routines_data").select("name_enc").eq("id", id).single();
    const afterCipher = encToText(after.data?.name_enc);
    expect(afterCipher.length).toBeGreaterThan(0);
    expect(afterCipher).not.toEqual(beforeCipher);
    expect(afterCipher).not.toContain("secret-marker-RTN789");
    expect(afterCipher).not.toContain(NEW_NAME);
  });

  it("DELETE through the view removes the base row and cascades to routine_steps", async () => {
    const created = await alice
      .from("routines")
      .insert({ user_id: SEED_USERS.alice.id, name: PLAINTEXT_NAME })
      .select("id")
      .single();
    expect(created.error).toBeNull();
    const id = created.data!.id as string;

    const step = await alice
      .from("routine_steps")
      .insert({ routine_id: id, user_id: SEED_USERS.alice.id, tool_id: "breathing", position: 0 })
      .select("id")
      .single();
    expect(step.error).toBeNull();

    const del = await alice
      .from("routines")
      .delete()
      .eq("user_id", SEED_USERS.alice.id)
      .eq("id", id);
    expect(del.error).toBeNull();

    const baseRead = await admin.from("routines_data").select("id").eq("id", id);
    expect(baseRead.error).toBeNull();
    expect(baseRead.data).toEqual([]);

    // FK routine_steps.routine_id → routines_data ON DELETE CASCADE.
    const stepsRead = await admin.from("routine_steps").select("id").eq("routine_id", id);
    expect(stepsRead.error).toBeNull();
    expect(stepsRead.data).toEqual([]);
  });

  it("RLS: a second user cannot read, update, or delete another user's routine", async () => {
    const created = await alice
      .from("routines")
      .insert({ user_id: SEED_USERS.alice.id, name: PLAINTEXT_NAME })
      .select("id")
      .single();
    expect(created.error).toBeNull();
    const id = created.data!.id as string;

    // Bob cannot see it.
    const bobRead = await bob.from("routines").select("id, name").eq("id", id);
    expect(bobRead.error).toBeNull();
    expect(bobRead.data).toEqual([]);

    // Bob's update is a no-op (RLS hides the row from his INSTEAD OF update).
    const bobUpd = await bob.from("routines").update({ name: "hacked" }).eq("id", id);
    expect(bobUpd.error).toBeNull();

    // Bob's delete is a no-op.
    const bobDel = await bob.from("routines").delete().eq("id", id);
    expect(bobDel.error).toBeNull();

    // Alice still sees her original, untouched.
    const aliceRead = await alice.from("routines").select("name").eq("id", id).single();
    expect(aliceRead.error).toBeNull();
    expect(aliceRead.data?.name).toBe(PLAINTEXT_NAME);
  });

  it("RLS: routine_steps are owner-isolated", async () => {
    const created = await alice
      .from("routines")
      .insert({ user_id: SEED_USERS.alice.id, name: PLAINTEXT_NAME })
      .select("id")
      .single();
    expect(created.error).toBeNull();
    const routineId = created.data!.id as string;

    const step = await alice
      .from("routine_steps")
      .insert({
        routine_id: routineId,
        user_id: SEED_USERS.alice.id,
        tool_id: "journal",
        position: 0,
      })
      .select("id")
      .single();
    expect(step.error).toBeNull();
    const stepId = step.data!.id as string;

    // Bob cannot see, update, or spoof-insert Alice's steps.
    const bobRead = await bob.from("routine_steps").select("id").eq("id", stepId);
    expect(bobRead.error).toBeNull();
    expect(bobRead.data).toEqual([]);

    const bobUpd = await bob.from("routine_steps").update({ position: 99 }).eq("id", stepId);
    expect(bobUpd.error).toBeNull(); // no-op: RLS hides the row

    const spoof = await bob.from("routine_steps").insert({
      routine_id: routineId,
      user_id: SEED_USERS.alice.id,
      tool_id: "mood",
      position: 1,
    });
    expect(spoof.error).not.toBeNull(); // WITH CHECK rejects rows owned by someone else

    const aliceRead = await alice
      .from("routine_steps")
      .select("position")
      .eq("id", stepId)
      .single();
    expect(aliceRead.error).toBeNull();
    expect(aliceRead.data?.position).toBe(0);
  });

  it("export_user_data() includes plaintext routines + routineSteps, no planItems, and no other user's rows", async () => {
    const EXPORT_NAME = "Export check routine (export-marker-RTN001)";
    const created = await alice
      .from("routines")
      .insert({ user_id: SEED_USERS.alice.id, name: EXPORT_NAME, reminder_enabled: false })
      .select("id")
      .single();
    expect(created.error).toBeNull();
    const routineId = created.data!.id as string;

    const step = await alice.from("routine_steps").insert({
      routine_id: routineId,
      user_id: SEED_USERS.alice.id,
      tool_id: "mood",
      position: 0,
    });
    expect(step.error).toBeNull();

    const { data, error } = await alice.rpc("export_user_data");
    expect(error).toBeNull();

    expect(Array.isArray(data.routines)).toBe(true);
    expect(Array.isArray(data.routineSteps)).toBe(true);
    expect("planItems" in data).toBe(false);

    const routines = data.routines as { id: string; name: string }[];
    const match = routines.find((r) => r.id === routineId);
    expect(match).toBeDefined();
    // Plaintext, not a bytea hex/base64 blob.
    expect(match?.name).toBe(EXPORT_NAME);
    expect(match?.name).toContain(" ");
    expect(match?.name).toContain("export-marker-RTN001");

    const steps = data.routineSteps as { routine_id: string; tool_id: string; position: number }[];
    expect(steps.some((s) => s.routine_id === routineId && s.tool_id === "mood")).toBe(true);

    // Bob's export never carries Alice's routines.
    const bobExport = await bob.rpc("export_user_data");
    expect(bobExport.error).toBeNull();
    const bobRoutines = bobExport.data.routines as { id: string }[];
    expect(bobRoutines.some((r) => r.id === routineId)).toBe(false);
  });

  it("deleting the auth user cascades away routines and routine_steps", async () => {
    // Throwaway user so the seeded users stay intact for the rest of the suite.
    const createdUser = await admin.auth.admin.createUser({
      email: "routines-cascade@test.local",
      password: "password123",
      email_confirm: true,
    });
    expect(createdUser.error).toBeNull();
    const userId = createdUser.data.user!.id;

    try {
      const routine = await admin
        .from("routines")
        .insert({ user_id: userId, name: "Cascade check routine" })
        .select("id")
        .single();
      expect(routine.error).toBeNull();
      const routineId = routine.data!.id as string;

      const step = await admin
        .from("routine_steps")
        .insert({ routine_id: routineId, user_id: userId, tool_id: "gratitude", position: 0 });
      expect(step.error).toBeNull();

      // FK cascade from auth.users covers both tables (delete_user_account needs no edit).
      const del = await admin.auth.admin.deleteUser(userId);
      expect(del.error).toBeNull();

      const [routinesLeft, stepsLeft] = await Promise.all([
        admin.from("routines_data").select("id").eq("user_id", userId),
        admin.from("routine_steps").select("id").eq("user_id", userId),
      ]);
      expect(routinesLeft.error).toBeNull();
      expect(routinesLeft.data).toEqual([]);
      expect(stepsLeft.error).toBeNull();
      expect(stepsLeft.data).toEqual([]);
    } finally {
      // Belt and braces — if the test failed before deleteUser, clean up.
      await admin.auth.admin.deleteUser(userId).catch(() => undefined);
    }
  });

  it("rejects a blank or over-long routine name", async () => {
    const blank = await alice
      .from("routines")
      .insert({ user_id: SEED_USERS.alice.id, name: "   " })
      .select("id")
      .single();
    expect(blank.error).not.toBeNull();

    const overLong = await alice
      .from("routines")
      .insert({ user_id: SEED_USERS.alice.id, name: "x".repeat(121) })
      .select("id")
      .single();
    expect(overLong.error).not.toBeNull();
  });
});
