import { readFileSync } from "node:fs";
import { join } from "node:path";

import type { SupabaseClient } from "@supabase/supabase-js";

import { createAnonClient, createServiceClient, runSql } from "./helpers";

// The `favorites` table (#1953, spec #1885 §4): a tool or a module the person starred,
// and the one-shot copy that turns every existing `widget_preferences` row into one.
//
// Two things are exercised here that no other suite can:
//
//   1. The table's own contract - add is a plain `insert … on conflict do nothing`,
//      remove is a `delete`, `kind` is constrained, `key` is not - through PostgREST
//      so RLS and the grants are the real ones. Cross-user isolation is in
//      rls.integration.test.ts with every other owner-scoped table.
//
//   2. The migration's 25→11 mapping. Migrations have already applied by the time
//      any test runs, so this suite re-runs the migration's OWN copy statement (cut
//      out of the file between two markers, never retyped) over freshly inserted old
//      rows for a throwaway user. Retyping the mapping here would test the retyped
//      copy and let the SQL drift; the extraction guard below fails if the markers
//      or the statement ever go missing, so a parse that found nothing cannot pass.

const MIGRATION = join(
  __dirname,
  "..",
  "..",
  "supabase",
  "migrations",
  "20260908000000_favorites.sql",
);
const COPY_BEGIN =
  "-- >>> one-shot copy (test/integration/favorites.integration.test.ts runs this block)";
const COPY_END = "-- <<< one-shot copy";

function migrationCopyStatement(): string {
  const source = readFileSync(MIGRATION, "utf8");
  const begin = source.indexOf(COPY_BEGIN);
  const end = source.indexOf(COPY_END);
  expect(begin).toBeGreaterThan(-1);
  expect(end).toBeGreaterThan(begin);
  const block = source.slice(begin + COPY_BEGIN.length, end);
  // Vacuity guard: the block must be the insert itself, not a comment about one.
  expect(block).toMatch(/insert into public\.favorites/i);
  expect(block).toMatch(/from public\.widget_preferences/i);
  expect(block).toMatch(/on conflict/i);
  return block;
}

// Every id in WIDGET_META at the time of the migration, in registry order. Restated
// as literals rather than imported: the migration froze THIS vocabulary, and the
// registry is free to change afterwards without moving the test.
const ALL_WIDGET_IDS = [
  "mood-checkin",
  "breathing-suggested",
  "gratitude-latest",
  "meditation-pick",
  "habits-today",
  "self-care",
  "cbt-open-record",
  "act-drop-anchor",
  "act-observing-self",
  "act-choice-point",
  "sleep-latest",
  "cbt-distortion-guide",
  "cbt-programme",
  "act-programme",
  "cbt-worry",
  "cbt-beliefs",
  "cbt-activities",
  "cbt-exposure",
  "cbt-goals",
  "act-committed-actions",
  "act-defusion",
  "act-acceptance-prompt",
  "journal-week",
  "grounding-log",
  "routines-today",
];

const EXPECTED_FULL_LOAD = [
  "module:act",
  "module:cbt",
  "tool:breathing",
  "tool:gratitude",
  "tool:grounding",
  "tool:habits",
  "tool:journal",
  "tool:meditation",
  "tool:mood",
  "tool:sleep",
];

interface FavoriteRow {
  id: string;
  kind: string;
  key: string;
  created_at: string;
}

describe("favorites (integration)", () => {
  const admin = createServiceClient();
  const password = "favorites-test-pass-123";
  const createdUserIds: string[] = [];
  const signedInClients: SupabaseClient[] = [];

  async function createSignedInUser(label: string) {
    const email = `favorites-${label}-${Date.now()}@test.local`;
    const created = await admin.auth.admin.createUser({ email, password, email_confirm: true });
    expect(created.error).toBeNull();
    const id = created.data.user!.id;
    createdUserIds.push(id);
    const client = createAnonClient();
    const signedIn = await client.auth.signInWithPassword({ email, password });
    expect(signedIn.error).toBeNull();
    signedInClients.push(client);
    return { id, client };
  }

  async function favoritesOf(userId: string): Promise<FavoriteRow[]> {
    const { data, error } = await admin
      .from("favorites")
      .select("id, kind, key, created_at")
      .eq("user_id", userId)
      .order("kind")
      .order("key");
    expect(error).toBeNull();
    return (data ?? []) as FavoriteRow[];
  }

  function labels(rows: FavoriteRow[]) {
    return rows.map((row) => `${row.kind}:${row.key}`);
  }

  async function seedOldRows(userId: string, widgetIds: string[]) {
    const { error } = await admin
      .from("widget_preferences")
      .insert(widgetIds.map((widget_id, position) => ({ user_id: userId, widget_id, position })));
    expect(error).toBeNull();
  }

  afterAll(async () => {
    await Promise.all(signedInClients.map((client) => client.auth.signOut()));
    // auth.users cascades into both tables.
    for (const id of createdUserIds) await admin.auth.admin.deleteUser(id);
  });

  describe("the table's contract", () => {
    let userId: string;
    let client: SupabaseClient;

    beforeAll(async () => {
      ({ id: userId, client } = await createSignedInUser("contract"));
    });

    beforeEach(async () => {
      const { error } = await admin.from("favorites").delete().eq("user_id", userId);
      expect(error).toBeNull();
    });

    it("add is a plain insert of the caller's own row", async () => {
      const { error } = await client
        .from("favorites")
        .insert({ user_id: userId, kind: "tool", key: "mood" });
      expect(error).toBeNull();
      expect(labels(await favoritesOf(userId))).toEqual(["tool:mood"]);
    });

    it("a duplicate add is a no-op under on-conflict-do-nothing, not an error", async () => {
      const first = await client
        .from("favorites")
        .upsert(
          { user_id: userId, kind: "module", key: "cbt" },
          { onConflict: "user_id,kind,key", ignoreDuplicates: true },
        );
      expect(first.error).toBeNull();
      const before = await favoritesOf(userId);

      const again = await client
        .from("favorites")
        .upsert(
          { user_id: userId, kind: "module", key: "cbt" },
          { onConflict: "user_id,kind,key", ignoreDuplicates: true },
        );
      expect(again.error).toBeNull();

      const after = await favoritesOf(userId);
      expect(after).toEqual(before);
      expect(after).toHaveLength(1);
    });

    it("a bare duplicate insert is refused by the unique constraint, so the client must ask for do-nothing", async () => {
      await client.from("favorites").insert({ user_id: userId, kind: "tool", key: "sleep" });
      const { error } = await client
        .from("favorites")
        .insert({ user_id: userId, kind: "tool", key: "sleep" });
      expect(error?.code).toBe("23505");
    });

    it("remove is a delete of the caller's own row", async () => {
      await client.from("favorites").insert([
        { user_id: userId, kind: "tool", key: "journal" },
        { user_id: userId, kind: "module", key: "act" },
      ]);
      const { error } = await client
        .from("favorites")
        .delete()
        .eq("user_id", userId)
        .eq("kind", "tool")
        .eq("key", "journal");
      expect(error).toBeNull();
      expect(labels(await favoritesOf(userId))).toEqual(["module:act"]);
    });

    it("kind is constrained to tool or module", async () => {
      const { error } = await client
        .from("favorites")
        .insert({ user_id: userId, kind: "widget", key: "mood-checkin" });
      expect(error?.code).toBe("23514");
    });

    it("key is not constrained - an unrecognised key is the reader's problem, not the table's", async () => {
      const { error } = await client
        .from("favorites")
        .insert({ user_id: userId, kind: "tool", key: "not-a-tool-anyone-knows" });
      expect(error).toBeNull();
    });

    it("the same key under both kinds is two rows, not a conflict", async () => {
      const { error } = await client.from("favorites").insert([
        { user_id: userId, kind: "tool", key: "cbt" },
        { user_id: userId, kind: "module", key: "cbt" },
      ]);
      expect(error).toBeNull();
      expect(labels(await favoritesOf(userId))).toEqual(["module:cbt", "tool:cbt"]);
    });
  });

  describe("the 25→11 copy migration, run from its own statement", () => {
    it("maps all 25 ids to 10 favourites: 8 tools, cbt 9→1, act 7→1, routines dropped", async () => {
      const { id } = await createSignedInUser("full");
      await seedOldRows(id, ALL_WIDGET_IDS);
      runSql(migrationCopyStatement());

      expect(labels(await favoritesOf(id))).toEqual(EXPECTED_FULL_LOAD);
      // Nothing under kind 'tool' with key 'routines', and no DBT: it has no widget id.
      expect(labels(await favoritesOf(id))).not.toContain("tool:routines");
      expect(labels(await favoritesOf(id))).not.toContain("module:dbt");
    });

    it("dedupes: nine cbt ids and seven act ids collapse to one module row each", async () => {
      const { id } = await createSignedInUser("dedupe");
      await seedOldRows(id, [
        "self-care",
        "cbt-open-record",
        "cbt-distortion-guide",
        "cbt-programme",
        "cbt-worry",
        "cbt-beliefs",
        "cbt-activities",
        "cbt-exposure",
        "cbt-goals",
        "act-drop-anchor",
        "act-observing-self",
        "act-choice-point",
        "act-programme",
        "act-committed-actions",
        "act-defusion",
        "act-acceptance-prompt",
      ]);
      runSql(migrationCopyStatement());
      expect(labels(await favoritesOf(id))).toEqual(["module:act", "module:cbt"]);
    });

    it("drops routines-today and ignores ids the catalogue never had", async () => {
      const { id } = await createSignedInUser("dropped");
      await seedOldRows(id, ["routines-today", "test-widget-unknown", "mood-trend"]);
      runSql(migrationCopyStatement());
      expect(await favoritesOf(id)).toEqual([]);
    });

    it("is idempotent: re-running adds nothing and keeps the rows it already wrote", async () => {
      const { id } = await createSignedInUser("idempotent");
      await seedOldRows(id, ALL_WIDGET_IDS);
      runSql(migrationCopyStatement());
      const first = await favoritesOf(id);
      expect(first).toHaveLength(EXPECTED_FULL_LOAD.length);

      runSql(migrationCopyStatement());
      const second = await favoritesOf(id);
      // Same ids and timestamps, not merely the same count - `on conflict do nothing`
      // must leave the existing rows alone rather than replace them.
      expect(second).toEqual(first);
    });

    it("keeps a favourite the person already starred, and merges around it", async () => {
      const { id, client } = await createSignedInUser("prestarred");
      const { error } = await client
        .from("favorites")
        .insert({ user_id: id, kind: "tool", key: "mood" });
      expect(error).toBeNull();
      const [starred] = await favoritesOf(id);

      await seedOldRows(id, ["mood-checkin", "journal-week"]);
      runSql(migrationCopyStatement());

      const rows = await favoritesOf(id);
      expect(labels(rows)).toEqual(["tool:journal", "tool:mood"]);
      expect(rows.find((row) => row.key === "mood")).toEqual(starred);
    });

    it("leaves widget_preferences byte-for-byte alone", async () => {
      const { id } = await createSignedInUser("untouched");
      await seedOldRows(id, ALL_WIDGET_IDS);
      const before = await admin
        .from("widget_preferences")
        .select("id, widget_id, position, created_at")
        .eq("user_id", id)
        .order("position");
      runSql(migrationCopyStatement());
      const after = await admin
        .from("widget_preferences")
        .select("id, widget_id, position, created_at")
        .eq("user_id", id)
        .order("position");
      expect(after.data).toEqual(before.data);
      expect(after.data).toHaveLength(ALL_WIDGET_IDS.length);
    });
  });
});
