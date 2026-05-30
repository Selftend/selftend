import type { SupabaseClient } from "@supabase/supabase-js";

import { SEED_USERS, createServiceClient, signInAs } from "./helpers";

// Mirrors the queries in src/features/act/repository.ts. Tests the DB contract
// the repo depends on (act_* schema columns, RLS allowing self-writes, foreign
// key cascades), not the mapping functions (those have unit tests in
// src/features/act/repository.test.ts).

async function deleteAllActDataForUser(userId: string) {
  const admin = createServiceClient();
  // act_action_steps FK-cascades from act_committed_actions, but delete in a
  // belt-and-braces order so an absent migration step doesn't strand rows.
  for (const table of [
    "act_action_steps",
    "act_committed_actions",
    "act_choice_points",
    "act_defusion_logs",
    "act_expansion_logs",
    "act_urge_surf_logs",
    "act_connection_logs",
    "act_observing_self_sessions",
    "act_value_entries",
    "act_bulls_eye_snapshots",
    "act_program_state",
  ]) {
    await admin.from(table).delete().eq("user_id", userId);
  }
}

describe("act repository (integration)", () => {
  let alice: SupabaseClient;
  let bob: SupabaseClient;

  beforeAll(async () => {
    alice = await signInAs("alice");
    bob = await signInAs("bob");
  });

  afterEach(async () => {
    await deleteAllActDataForUser(SEED_USERS.alice.id);
    await deleteAllActDataForUser(SEED_USERS.bob.id);
  });

  afterAll(async () => {
    await alice.auth.signOut();
    await bob.auth.signOut();
  });

  it("inserts and reads back a defusion log", async () => {
    const insert = await alice
      .from("act_defusion_logs")
      .insert({
        user_id: SEED_USERS.alice.id,
        fused_thought: "I always mess things up",
        thought_category: "selfJudgment",
        fusion_level_before: 80,
        technique_used: "havingTheThoughtThat",
        defused_version: "I'm having the thought that I always mess things up",
        fusion_level_after: 50,
        notes: "Felt lighter immediately",
      })
      .select("*")
      .single();

    expect(insert.error).toBeNull();
    expect(insert.data).toMatchObject({
      user_id: SEED_USERS.alice.id,
      fused_thought: "I always mess things up",
      thought_category: "selfJudgment",
      fusion_level_before: 80,
      technique_used: "havingTheThoughtThat",
      fusion_level_after: 50,
    });
  });

  it("blocks reading another user's defusion logs via RLS", async () => {
    await alice
      .from("act_defusion_logs")
      .insert({
        user_id: SEED_USERS.alice.id,
        fused_thought: "private",
        thought_category: "other",
        technique_used: "namingTheStory",
      })
      .throwOnError();

    const result = await bob
      .from("act_defusion_logs")
      .select("*")
      .eq("user_id", SEED_USERS.alice.id);
    expect(result.error).toBeNull();
    expect(result.data).toEqual([]);
  });

  it("upserts program state with (user_id) as the conflict key", async () => {
    const first = await alice
      .from("act_program_state")
      .upsert(
        {
          user_id: SEED_USERS.alice.id,
          active_principles: ["defusion"],
          primary_concerns: ["anxiety"],
        },
        { onConflict: "user_id" },
      )
      .select("*")
      .single();
    expect(first.error).toBeNull();

    const second = await alice
      .from("act_program_state")
      .upsert(
        {
          user_id: SEED_USERS.alice.id,
          active_principles: ["values", "committedAction"],
        },
        { onConflict: "user_id" },
      )
      .select("*")
      .single();
    expect(second.error).toBeNull();
    expect(second.data?.active_principles).toEqual(["values", "committedAction"]);
    // Supabase/PostgREST upsert only updates columns present in the payload;
    // omitted columns are preserved on conflict, so primary_concerns stays ["anxiety"].
    expect(second.data?.primary_concerns).toEqual(["anxiety"]);
  });

  it("upserts a value entry keyed on (user_id, life_domain)", async () => {
    const first = await alice
      .from("act_value_entries")
      .upsert(
        {
          user_id: SEED_USERS.alice.id,
          life_domain: "relationships",
          value_statement: "Be patient",
          importance_rating: 8,
          current_alignment_rating: 5,
        },
        { onConflict: "user_id,life_domain" },
      )
      .select("*")
      .single();
    expect(first.error).toBeNull();

    const second = await alice
      .from("act_value_entries")
      .upsert(
        {
          user_id: SEED_USERS.alice.id,
          life_domain: "relationships",
          value_statement: "Be present",
          importance_rating: 9,
          current_alignment_rating: 6,
        },
        { onConflict: "user_id,life_domain" },
      )
      .select("*")
      .single();
    expect(second.error).toBeNull();
    expect(second.data?.id).toBe(first.data?.id);
    expect(second.data?.value_statement).toBe("Be present");
  });

  it("deletes action steps when their committed action is deleted", async () => {
    const action = await alice
      .from("act_committed_actions")
      .insert({
        user_id: SEED_USERS.alice.id,
        life_domain: "work",
        title: "Plan tomorrow",
      })
      .select("*")
      .single();
    expect(action.error).toBeNull();
    const actionId = action.data!.id;

    await alice
      .from("act_action_steps")
      .insert([
        { user_id: SEED_USERS.alice.id, action_id: actionId, description: "Step 1" },
        { user_id: SEED_USERS.alice.id, action_id: actionId, description: "Step 2" },
      ])
      .throwOnError();

    const before = await alice.from("act_action_steps").select("id").eq("action_id", actionId);
    expect(before.data).toHaveLength(2);

    await alice.from("act_committed_actions").delete().eq("id", actionId).throwOnError();

    const after = await alice.from("act_action_steps").select("id").eq("action_id", actionId);
    expect(after.data).toEqual([]);
  });

  it("rejects committed actions with an unknown life_domain via the CHECK constraint", async () => {
    const result = await alice
      .from("act_committed_actions")
      .insert({
        user_id: SEED_USERS.alice.id,
        life_domain: "not-a-real-domain",
        title: "Should fail",
      })
      .select("*")
      .single();

    expect(result.error).not.toBeNull();
    expect(result.data).toBeNull();
  });

  // ─── Cross-user RLS isolation: sibling act_* tables ─────────────────────────
  // Table-driven: insert a minimal valid row as alice, confirm bob reads [].
  const rlsIsolationCases: {
    table: string;
    row: Record<string, unknown>;
    // act_program_state uses user_id as PK (no separate id col)
    pkCol?: string;
  }[] = [
    {
      table: "act_expansion_logs",
      row: { user_id: SEED_USERS.alice.id },
    },
    {
      table: "act_urge_surf_logs",
      row: { user_id: SEED_USERS.alice.id },
    },
    {
      table: "act_connection_logs",
      row: {
        user_id: SEED_USERS.alice.id,
        technique: "noticeFiveThings",
      },
    },
    {
      table: "act_observing_self_sessions",
      row: {
        user_id: SEED_USERS.alice.id,
        technique_used: "tenDeepBreaths",
      },
    },
    {
      table: "act_value_entries",
      row: {
        user_id: SEED_USERS.alice.id,
        life_domain: "work",
      },
    },
    {
      table: "act_bulls_eye_snapshots",
      row: {
        user_id: SEED_USERS.alice.id,
        domain: "work",
        alignment_rating: 5,
      },
    },
    {
      table: "act_program_state",
      row: { user_id: SEED_USERS.alice.id },
      pkCol: "user_id",
    },
    {
      table: "act_committed_actions",
      row: {
        user_id: SEED_USERS.alice.id,
        life_domain: "work",
      },
    },
    {
      table: "act_choice_points",
      row: { user_id: SEED_USERS.alice.id },
    },
  ];

  for (const { table, row, pkCol = "id" } of rlsIsolationCases) {
    it(`blocks bob from reading alice's rows in ${table}`, async () => {
      const insert = await alice.from(table).insert(row).select(pkCol).single();
      expect(insert.error).toBeNull();

      const bobRead = await bob.from(table).select(pkCol).eq("user_id", SEED_USERS.alice.id);
      expect(bobRead.error).toBeNull();
      expect(bobRead.data).toEqual([]);
    });
  }

  // act_action_steps needs a parent committed action first
  it("blocks bob from reading alice's rows in act_action_steps", async () => {
    const action = await alice
      .from("act_committed_actions")
      .insert({ user_id: SEED_USERS.alice.id, life_domain: "work" })
      .select("id")
      .single();
    expect(action.error).toBeNull();

    const step = await alice
      .from("act_action_steps")
      .insert({
        user_id: SEED_USERS.alice.id,
        action_id: action.data!.id,
        description: "RLS test step",
      })
      .select("id")
      .single();
    expect(step.error).toBeNull();

    const bobRead = await bob
      .from("act_action_steps")
      .select("id")
      .eq("user_id", SEED_USERS.alice.id);
    expect(bobRead.error).toBeNull();
    expect(bobRead.data).toEqual([]);
  });
});
