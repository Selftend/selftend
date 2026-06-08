import type { SupabaseClient } from "@supabase/supabase-js";

import {
  SEED_USERS,
  createServiceClient,
  deleteAllJournalEntriesForUser,
  signInAs,
} from "./helpers";

// Verifies the transparent encrypted view over journal_entries:
// - the client (supabase-js) sees plaintext title/body through the same `journal_entries` name,
//   while the base table `journal_entries_data` holds only ciphertext (*_enc bytea).
// - INSERT / UPDATE / DELETE all flow through the INSTEAD OF triggers on the view.
// - ciphertext at rest never contains the plaintext, on both insert and re-encrypt-on-update.
// - RLS still isolates users through the view.

const PLAINTEXT_BODY = "Felt anxious but grounded myself 🌱 (secret-marker-ABC123)";
const PLAINTEXT_TITLE = "Encrypted Diary";

function bodyEncToText(bodyEnc: unknown): string {
  // service-role reads of bytea come back base64-ish/hex; normalize to a string we can scan.
  if (bodyEnc == null) return "";
  if (typeof bodyEnc === "string") return bodyEnc;
  return JSON.stringify(bodyEnc);
}

describe("journal_entries encrypted view (integration)", () => {
  let alice: SupabaseClient;
  let bob: SupabaseClient;
  const admin = createServiceClient();

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

  it("INSERT through the view returns decrypted plaintext but stores ciphertext at rest", async () => {
    const insert = await alice
      .from("journal_entries")
      .insert({ user_id: SEED_USERS.alice.id, title: PLAINTEXT_TITLE, body: PLAINTEXT_BODY })
      .select("*")
      .single();
    expect(insert.error).toBeNull();
    expect(insert.data).toMatchObject({
      user_id: SEED_USERS.alice.id,
      title: PLAINTEXT_TITLE,
      body: PLAINTEXT_BODY,
    });
    expect(insert.data?.created_at).toEqual(expect.any(String));
    expect(insert.data?.updated_at).toEqual(expect.any(String));

    const id = insert.data!.id as string;

    // Service-role read of the ciphertext base table must NOT expose the plaintext.
    const atRest = await admin
      .from("journal_entries_data")
      .select("title_enc, body_enc")
      .eq("id", id)
      .single();
    expect(atRest.error).toBeNull();
    const bodyCipher = bodyEncToText(atRest.data?.body_enc);
    const titleCipher = bodyEncToText(atRest.data?.title_enc);
    expect(bodyCipher.length).toBeGreaterThan(0);
    expect(bodyCipher).not.toContain("secret-marker-ABC123");
    expect(bodyCipher).not.toContain(PLAINTEXT_BODY);
    expect(titleCipher).not.toContain(PLAINTEXT_TITLE);
  });

  it("UPDATE through the view re-encrypts: new plaintext on read, changed ciphertext at rest", async () => {
    const created = await alice
      .from("journal_entries")
      .insert({ user_id: SEED_USERS.alice.id, title: PLAINTEXT_TITLE, body: PLAINTEXT_BODY })
      .select("id")
      .single();
    expect(created.error).toBeNull();
    const id = created.data!.id as string;

    const before = await admin
      .from("journal_entries_data")
      .select("body_enc")
      .eq("id", id)
      .single();
    const beforeCipher = bodyEncToText(before.data?.body_enc);

    const NEW_BODY = "Edited reflection — calmer now (secret-marker-XYZ789)";
    const updated = await alice
      .from("journal_entries")
      .update({ title: PLAINTEXT_TITLE, body: NEW_BODY })
      .eq("user_id", SEED_USERS.alice.id)
      .eq("id", id)
      .select("*")
      .maybeSingle();
    expect(updated.error).toBeNull();
    expect(updated.data?.body).toBe(NEW_BODY);

    // Read back through the view: decrypted to the new plaintext.
    const readBack = await alice.from("journal_entries").select("body").eq("id", id).single();
    expect(readBack.error).toBeNull();
    expect(readBack.data?.body).toBe(NEW_BODY);

    // At rest: ciphertext changed and still isn't the plaintext.
    const after = await admin.from("journal_entries_data").select("body_enc").eq("id", id).single();
    const afterCipher = bodyEncToText(after.data?.body_enc);
    expect(afterCipher.length).toBeGreaterThan(0);
    expect(afterCipher).not.toEqual(beforeCipher);
    expect(afterCipher).not.toContain("secret-marker-XYZ789");
    expect(afterCipher).not.toContain(NEW_BODY);
  });

  it("DELETE through the view removes the underlying base row", async () => {
    const created = await alice
      .from("journal_entries")
      .insert({ user_id: SEED_USERS.alice.id, title: PLAINTEXT_TITLE, body: PLAINTEXT_BODY })
      .select("id")
      .single();
    expect(created.error).toBeNull();
    const id = created.data!.id as string;

    const del = await alice
      .from("journal_entries")
      .delete()
      .eq("user_id", SEED_USERS.alice.id)
      .eq("id", id);
    expect(del.error).toBeNull();

    // View read returns nothing.
    const viewRead = await alice.from("journal_entries").select("id").eq("id", id).maybeSingle();
    expect(viewRead.error).toBeNull();
    expect(viewRead.data).toBeNull();

    // Base row is gone (service-role bypasses RLS).
    const baseRead = await admin.from("journal_entries_data").select("id").eq("id", id);
    expect(baseRead.error).toBeNull();
    expect(baseRead.data).toEqual([]);
  });

  it("INSERT with body longer than 20000 characters is rejected", async () => {
    const overLongBody = "x".repeat(20001);
    const result = await alice
      .from("journal_entries")
      .insert({ user_id: SEED_USERS.alice.id, title: PLAINTEXT_TITLE, body: overLongBody })
      .select("id")
      .single();
    expect(result.error).not.toBeNull();
  });

  it("export_user_data() returns journal entries as PLAINTEXT, not ciphertext", async () => {
    // Insert a journal entry with a distinctive plaintext body.
    const EXPORT_BODY = "Export test reflection — plaintext sentinel (export-marker-EXP001)";
    const EXPORT_TITLE = "Export Encryption Check";

    const inserted = await alice
      .from("journal_entries")
      .insert({ user_id: SEED_USERS.alice.id, title: EXPORT_TITLE, body: EXPORT_BODY })
      .select("id")
      .single();
    expect(inserted.error).toBeNull();

    // Call the GDPR export RPC as the same authenticated user.
    const { data, error } = await alice.rpc("export_user_data");
    expect(error).toBeNull();

    // The export must contain a journalEntries array.
    expect(Array.isArray(data.journalEntries)).toBe(true);

    // Find the entry we just inserted by body.
    const entries = data.journalEntries as { title: string; body: string }[];
    const match = entries.find((e) => e.body === EXPORT_BODY);

    // The entry must be present with full plaintext — not a bytea hex/base64 blob, not absent.
    expect(match).toBeDefined();
    expect(match?.title).toBe(EXPORT_TITLE);
    expect(match?.body).toBe(EXPORT_BODY);

    // Ciphertext is a bytea sequence and will never literally equal the plaintext string.
    // Confirm the body does not look like a hex or base64 blob (both lack spaces/emoji).
    expect(match?.body).toContain(" ");
    expect(match?.body).toContain("export-marker-EXP001");
  });

  it("RLS: a second user cannot read, update, or delete another user's entry through the view", async () => {
    const created = await alice
      .from("journal_entries")
      .insert({ user_id: SEED_USERS.alice.id, title: PLAINTEXT_TITLE, body: PLAINTEXT_BODY })
      .select("id")
      .single();
    expect(created.error).toBeNull();
    const id = created.data!.id as string;

    // Bob cannot see it.
    const bobRead = await bob.from("journal_entries").select("id, body").eq("id", id);
    expect(bobRead.error).toBeNull();
    expect(bobRead.data).toEqual([]);

    // Bob's update is a no-op (RLS hides the row from his INSTEAD OF update).
    const bobUpd = await bob
      .from("journal_entries")
      .update({ title: "hacked", body: "hacked body" })
      .eq("id", id);
    expect(bobUpd.error).toBeNull();

    // Bob's delete is a no-op.
    const bobDel = await bob.from("journal_entries").delete().eq("id", id);
    expect(bobDel.error).toBeNull();

    // Alice still sees her original, untouched.
    const aliceRead = await alice
      .from("journal_entries")
      .select("title, body")
      .eq("id", id)
      .single();
    expect(aliceRead.error).toBeNull();
    expect(aliceRead.data?.title).toBe(PLAINTEXT_TITLE);
    expect(aliceRead.data?.body).toBe(PLAINTEXT_BODY);
  });
});
