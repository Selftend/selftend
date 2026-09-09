import type { SupabaseClient } from "@supabase/supabase-js";

import { SEED_USERS, createServiceClient, deleteAllDbtForUser, signInAs } from "./helpers";

/**
 * The seven DBT tables (#1980 spec §5.1), all born encrypted on the routines
 * template: every free-text column round-trips plaintext through the same-named
 * view while the `_data` base holds only `*_enc` ciphertext; every plaintext
 * column (ids, enums, the list-ordering `difficulty`, timestamps, offsets)
 * survives a round-trip and its CHECK still applies; the guards enforce the
 * spec's caps; and RLS keeps a second user out of everything.
 *
 * One file for the seven rather than seven copies of ACT's shape: the tables
 * differ only in their columns, so the cases are data-driven where the shape is
 * shared and explicit where a table has a rule of its own (the coping plan's
 * document guard, the session slug CHECK, the emotion ids array, the two
 * done-day updates).
 */

function cipherToText(value: unknown): string {
  if (value == null) return "";
  if (typeof value === "string") return value;
  return JSON.stringify(value);
}

const MARK = (tag: string) => `secret-marker-${tag}`;

describe("DBT encrypted views (integration)", () => {
  let alice: SupabaseClient;
  let bob: SupabaseClient;
  const admin = createServiceClient();

  beforeAll(async () => {
    [alice, bob] = await Promise.all([signInAs("alice"), signInAs("bob")]);
  });
  afterEach(async () => {
    await deleteAllDbtForUser(SEED_USERS.alice.id);
    await deleteAllDbtForUser(SEED_USERS.bob.id);
  });
  afterAll(async () => {
    await Promise.all([alice.auth.signOut(), bob.auth.signOut()]);
  });

  /**
   * One record kind: the view name, a plaintext row for alice, the columns that
   * must be ciphertext at rest (with the marker each carries), and one legal
   * update to prove re-encryption plus pass-through survival.
   */
  const RECORD_TABLES = [
    {
      view: "dbt_wise_mind_checkins",
      row: {
        question: `Should I text him back tonight ${MARK("WMQ")}`,
        emotion_mind: `Yes, now, before he forgets me ${MARK("WME")}`,
        reason: `It is late and I said I would sleep ${MARK("WMR")}`,
        wise_mind: `Tomorrow, when I mean it ${MARK("WMW")}`,
        created_offset_minutes: 120,
      },
      encrypted: {
        question_enc: "WMQ",
        emotion_mind_enc: "WME",
        reason_enc: "WMR",
        wise_mind_enc: "WMW",
      },
      passThrough: { created_offset_minutes: 120 },
      update: { question: `A different question ${MARK("WMQ2")}` },
      updatedEnc: ["question_enc", "WMQ2"] as const,
    },
    {
      view: "dbt_judgements",
      row: {
        judgement: `That was a stupid thing to say ${MARK("JJ")}`,
        restatement: `I said something and she went quiet ${MARK("JR")}`,
        valence: "negative",
        created_offset_minutes: -480,
      },
      encrypted: { judgement_enc: "JJ", restatement_enc: "JR" },
      passThrough: { valence: "negative", created_offset_minutes: -480 },
      update: { judgement: `What went through my mind ${MARK("JJ2")}`, valence: "positive" },
      updatedEnc: ["judgement_enc", "JJ2"] as const,
    },
    {
      view: "dbt_emotion_records",
      row: {
        what_happened: `She replied to the group and not to me ${MARK("EW")}`,
        meaning: `I decided it meant I am the one they tolerate ${MARK("EM")}`,
        body_sensations: `tight chest, hot face ${MARK("EB")}`,
        urges: `to leave the group ${MARK("EU")}`,
        did_and_said: `nothing ${MARK("ED")}`,
        afterwards: `it gave me a reason to stay quiet ${MARK("EA")}`,
        primary_emotions: ["sad", "custom_1754000000000"],
        secondary_emotions: ["ashamed"],
        created_offset_minutes: 330,
      },
      encrypted: {
        what_happened_enc: "EW",
        meaning_enc: "EM",
        body_sensations_enc: "EB",
        urges_enc: "EU",
        did_and_said_enc: "ED",
        afterwards_enc: "EA",
      },
      passThrough: {
        primary_emotions: ["sad", "custom_1754000000000"],
        secondary_emotions: ["ashamed"],
        created_offset_minutes: 330,
      },
      update: { meaning: `The meaning I gave it ${MARK("EM2")}`, secondary_emotions: [] },
      updatedEnc: ["meaning_enc", "EM2"] as const,
    },
    {
      view: "dbt_opposite_action_plans",
      row: {
        emotion: "angry",
        pull: `to snap at him ${MARK("OP")}`,
        opposite_action: `soften my voice and ask one question ${MARK("OO")}`,
        hold_for: `the whole call ${MARK("OH")}`,
        created_offset_minutes: 60,
      },
      encrypted: { pull_enc: "OP", opposite_action_enc: "OO", hold_for_enc: "OH" },
      passThrough: { emotion: "angry", created_offset_minutes: 60, done_at: null },
      update: { pull: `to prove the point ${MARK("OP2")}` },
      updatedEnc: ["pull_enc", "OP2"] as const,
    },
    {
      view: "dbt_scripts",
      row: {
        situation: `He is always late and I wait ${MARK("SS")}`,
        want_changed: "start",
        i_think: `The last three times you were over an hour late ${MARK("ST")}`,
        emotion: "hurt",
        i_feel: `small, like my evening is the flexible one ${MARK("SF")}`,
        i_want: `text me if you'll be late ${MARK("SW")}`,
        self_care: `eat at seven and not wait ${MARK("SC")}`,
        difficulty: 40,
        when_where: `Saturday, on the walk ${MARK("SP")}`,
        created_offset_minutes: -300,
      },
      encrypted: {
        situation_enc: "SS",
        i_think_enc: "ST",
        i_feel_enc: "SF",
        i_want_enc: "SW",
        self_care_enc: "SC",
        when_where_enc: "SP",
      },
      passThrough: {
        want_changed: "start",
        emotion: "hurt",
        difficulty: 40,
        created_offset_minutes: -300,
        done_at: null,
      },
      update: { i_want: `text me by six ${MARK("SW2")}`, difficulty: 70 },
      updatedEnc: ["i_want_enc", "SW2"] as const,
    },
  ] as const;

  describe.each(RECORD_TABLES)("$view", (table) => {
    const base = `${table.view}_data`;
    const encColumns = Object.keys(table.encrypted);

    it("INSERT round-trips every text column while storing ciphertext at rest", async () => {
      const insert = await alice
        .from(table.view)
        .insert({ user_id: SEED_USERS.alice.id, ...table.row })
        .select("*")
        .single();
      expect(insert.error).toBeNull();
      expect(insert.data).toMatchObject({ user_id: SEED_USERS.alice.id, ...table.row });
      expect(typeof insert.data!.created_at).toBe("string");

      const atRest = await admin
        .from(base)
        .select(encColumns.join(", "))
        .eq("id", insert.data!.id as string)
        .single();
      expect(atRest.error).toBeNull();
      for (const [column, tag] of Object.entries(table.encrypted)) {
        const cipher = cipherToText((atRest.data as unknown as Record<string, unknown>)[column]);
        expect(cipher.length).toBeGreaterThan(0);
        expect(cipher).not.toContain(MARK(tag));
      }
    });

    it("UPDATE re-encrypts and preserves pass-through columns", async () => {
      const created = await alice
        .from(table.view)
        .insert({ user_id: SEED_USERS.alice.id, ...table.row })
        .select("id")
        .single();
      expect(created.error).toBeNull();
      const id = created.data!.id as string;
      const [encColumn, newTag] = table.updatedEnc;

      const before = await admin.from(base).select(encColumn).eq("id", id).single();
      const beforeCipher = cipherToText(
        (before.data as unknown as Record<string, unknown>)[encColumn],
      );

      const updated = await alice
        .from(table.view)
        .update(table.update)
        .eq("user_id", SEED_USERS.alice.id)
        .eq("id", id)
        .select("*")
        .maybeSingle();
      expect(updated.error).toBeNull();
      expect(updated.data).toMatchObject(table.update);
      for (const [column, value] of Object.entries(table.passThrough)) {
        if (column in table.update) continue;
        expect((updated.data as unknown as Record<string, unknown>)[column]).toEqual(value);
      }

      const after = await admin.from(base).select(encColumn).eq("id", id).single();
      const afterCipher = cipherToText(
        (after.data as unknown as Record<string, unknown>)[encColumn],
      );
      expect(afterCipher.length).toBeGreaterThan(0);
      expect(afterCipher).not.toEqual(beforeCipher);
      expect(afterCipher).not.toContain(MARK(newTag));
    });

    it("DELETE through the view removes the underlying base row", async () => {
      const created = await alice
        .from(table.view)
        .insert({ user_id: SEED_USERS.alice.id, ...table.row })
        .select("id")
        .single();
      expect(created.error).toBeNull();
      const id = created.data!.id as string;

      const del = await alice
        .from(table.view)
        .delete()
        .eq("user_id", SEED_USERS.alice.id)
        .eq("id", id);
      expect(del.error).toBeNull();

      const baseRead = await admin.from(base).select("id").eq("id", id);
      expect(baseRead.error).toBeNull();
      expect(baseRead.data).toEqual([]);
    });

    it("RLS: a second user cannot read or mutate another user's row", async () => {
      const created = await alice
        .from(table.view)
        .insert({ user_id: SEED_USERS.alice.id, ...table.row })
        .select("id")
        .single();
      expect(created.error).toBeNull();
      const id = created.data!.id as string;

      const bobRead = await bob.from(table.view).select("id").eq("id", id);
      expect(bobRead.error).toBeNull();
      expect(bobRead.data).toEqual([]);

      const bobUpd = await bob.from(table.view).update(table.update).eq("id", id);
      expect(bobUpd.error).toBeNull();
      const bobDel = await bob.from(table.view).delete().eq("id", id);
      expect(bobDel.error).toBeNull();

      const spoof = await bob
        .from(table.view)
        .insert({ user_id: SEED_USERS.alice.id, ...table.row });
      expect(spoof.error).not.toBeNull();

      const aliceRead = await alice.from(table.view).select("*").eq("id", id).single();
      expect(aliceRead.error).toBeNull();
      expect(aliceRead.data).toMatchObject(table.row);
    });
  });

  describe("the guards", () => {
    it("wise mind: a blank question and an over-cap note are rejected", async () => {
      const blank = await alice
        .from("dbt_wise_mind_checkins")
        .insert({ user_id: SEED_USERS.alice.id, question: "   " });
      expect(blank.error).not.toBeNull();
      const long = await alice
        .from("dbt_wise_mind_checkins")
        .insert({ user_id: SEED_USERS.alice.id, question: "q", reason: "x".repeat(501) });
      expect(long.error).not.toBeNull();
    });

    it("judgements: an unknown valence and an over-cap judgement are rejected", async () => {
      const valence = await alice
        .from("dbt_judgements")
        .insert({ user_id: SEED_USERS.alice.id, judgement: "j", valence: "neutral" });
      expect(valence.error).not.toBeNull();
      const long = await alice
        .from("dbt_judgements")
        .insert({ user_id: SEED_USERS.alice.id, judgement: "x".repeat(301) });
      expect(long.error).not.toBeNull();
    });

    it("emotion records: at least one primary emotion, and a blank event is rejected", async () => {
      const none = await alice
        .from("dbt_emotion_records")
        .insert({ user_id: SEED_USERS.alice.id, what_happened: "x", primary_emotions: [] });
      expect(none.error).not.toBeNull();
      const blank = await alice
        .from("dbt_emotion_records")
        .insert({ user_id: SEED_USERS.alice.id, what_happened: " ", primary_emotions: ["sad"] });
      expect(blank.error).not.toBeNull();
    });

    it("scripts: an unknown want_changed and a difficulty past 100 are rejected", async () => {
      const want = await alice.from("dbt_scripts").insert({
        user_id: SEED_USERS.alice.id,
        situation: "s",
        i_think: "t",
        i_want: "w",
        want_changed: "moreOfThem",
      });
      expect(want.error).not.toBeNull();
      const hard = await alice.from("dbt_scripts").insert({
        user_id: SEED_USERS.alice.id,
        situation: "s",
        i_think: "t",
        i_want: "w",
        difficulty: 110,
      });
      expect(hard.error).not.toBeNull();
    });

    it("offsets outside ±840 are rejected on every dated table", async () => {
      const wm = await alice
        .from("dbt_wise_mind_checkins")
        .insert({ user_id: SEED_USERS.alice.id, question: "q", created_offset_minutes: 900 });
      expect(wm.error).not.toBeNull();
      const session = await alice.from("dbt_sessions").insert({
        user_id: SEED_USERS.alice.id,
        session_slug: "muscle-relaxation",
        duration_seconds: 60,
        completed_offset_minutes: -900,
      });
      expect(session.error).not.toBeNull();
    });
  });

  describe("dbt_sessions", () => {
    it("records a completed session with its captured offset and no free text", async () => {
      const insert = await alice
        .from("dbt_sessions")
        .insert({
          user_id: SEED_USERS.alice.id,
          session_slug: "muscle-relaxation",
          variant: "short",
          duration_seconds: 312,
          completed_at: "2026-09-05T20:00:00.000Z",
          completed_offset_minutes: 180,
        })
        .select("*")
        .single();
      expect(insert.error).toBeNull();
      expect(insert.data).toMatchObject({
        session_slug: "muscle-relaxation",
        variant: "short",
        duration_seconds: 312,
        completed_offset_minutes: 180,
      });
      // The base table carries every column the view shows - nothing to decrypt, so
      // the twin exists only to keep the shape uniform for the post-MVP note column.
      const atRest = await admin
        .from("dbt_sessions_data")
        .select("session_slug, duration_seconds")
        .eq("id", insert.data!.id as string)
        .single();
      expect(atRest.error).toBeNull();
      expect(atRest.data).toEqual({ session_slug: "muscle-relaxation", duration_seconds: 312 });
    });

    it("rejects an unknown slug, an unknown variant and a non-positive duration", async () => {
      const slug = await alice.from("dbt_sessions").insert({
        user_id: SEED_USERS.alice.id,
        session_slug: "safe-place",
        duration_seconds: 60,
      });
      expect(slug.error).not.toBeNull();
      const variant = await alice.from("dbt_sessions").insert({
        user_id: SEED_USERS.alice.id,
        session_slug: "muscle-relaxation",
        variant: "long",
        duration_seconds: 60,
      });
      expect(variant.error).not.toBeNull();
      const zero = await alice.from("dbt_sessions").insert({
        user_id: SEED_USERS.alice.id,
        session_slug: "muscle-relaxation",
        duration_seconds: 0,
      });
      expect(zero.error).not.toBeNull();
    });

    it("RLS: bob sees none of alice's sessions", async () => {
      const created = await alice
        .from("dbt_sessions")
        .insert({
          user_id: SEED_USERS.alice.id,
          session_slug: "muscle-relaxation",
          duration_seconds: 5,
        })
        .select("id")
        .single();
      expect(created.error).toBeNull();
      const bobRead = await bob
        .from("dbt_sessions")
        .select("id")
        .eq("id", created.data!.id as string);
      expect(bobRead.error).toBeNull();
      expect(bobRead.data).toEqual([]);
    });
  });

  describe("dbt_coping_plans", () => {
    const plan = {
      items: [
        {
          id: "a",
          section: "distract",
          kind: "pick",
          pickKey: "move.walk",
          homeOnly: false,
          position: 0,
        },
        {
          id: "b",
          section: "soothe",
          kind: "own",
          text: `the blanket on the chair ${MARK("CP")}`,
          homeOnly: true,
          position: 1,
        },
        {
          id: "c",
          section: "remind",
          kind: "pick",
          pickKey: "remind.thisWillPass",
          homeOnly: false,
          position: 2,
        },
        {
          id: "d",
          section: "distract",
          kind: "pick",
          pickKey: "leave.stepOutside",
          homeOnly: false,
          position: 3,
        },
      ],
      fallback: ["d", "b", "a"],
    };

    it("stores the whole document as one ciphertext and reads it back as JSON", async () => {
      const insert = await alice
        .from("dbt_coping_plans")
        .insert({ user_id: SEED_USERS.alice.id, plan })
        .select("*")
        .single();
      expect(insert.error).toBeNull();
      expect(insert.data!.plan).toEqual(plan);

      const atRest = await admin
        .from("dbt_coping_plans_data")
        .select("plan_enc")
        .eq("id", insert.data!.id as string)
        .single();
      expect(atRest.error).toBeNull();
      const cipher = cipherToText(atRest.data?.plan_enc);
      expect(cipher.length).toBeGreaterThan(0);
      expect(cipher).not.toContain(MARK("CP"));
      expect(cipher).not.toContain("move.walk");
    });

    it("is one row per person: a second insert is refused", async () => {
      const first = await alice
        .from("dbt_coping_plans")
        .insert({ user_id: SEED_USERS.alice.id, plan });
      expect(first.error).toBeNull();
      const second = await alice
        .from("dbt_coping_plans")
        .insert({ user_id: SEED_USERS.alice.id, plan });
      expect(second.error).not.toBeNull();
    });

    it("guards the document: the fallback needs three to six items, every one on the plan", async () => {
      const short = await alice
        .from("dbt_coping_plans")
        .insert({ user_id: SEED_USERS.alice.id, plan: { ...plan, fallback: ["a", "b"] } });
      expect(short.error).not.toBeNull();
      const stranger = await alice
        .from("dbt_coping_plans")
        .insert({ user_id: SEED_USERS.alice.id, plan: { ...plan, fallback: ["a", "b", "zzz"] } });
      expect(stranger.error).not.toBeNull();
      const blankOwn = await alice.from("dbt_coping_plans").insert({
        user_id: SEED_USERS.alice.id,
        plan: {
          ...plan,
          items: plan.items.map((item) => (item.id === "b" ? { ...item, text: "  " } : item)),
        },
      });
      expect(blankOwn.error).not.toBeNull();
    });

    it("UPDATE replaces the document and bumps updated_at - the programme's touched fact", async () => {
      const created = await alice
        .from("dbt_coping_plans")
        .insert({ user_id: SEED_USERS.alice.id, plan })
        .select("id, updated_at")
        .single();
      expect(created.error).toBeNull();
      const reordered = { ...plan, fallback: ["a", "b", "d"] };
      // Postgres timestamps have microsecond precision; a same-instant write would
      // still read as "later" only by luck, so wait a tick.
      await new Promise((resolve) => setTimeout(resolve, 20));
      const updated = await alice
        .from("dbt_coping_plans")
        .update({ plan: reordered })
        .eq("id", created.data!.id as string)
        .select("plan, updated_at")
        .single();
      expect(updated.error).toBeNull();
      expect(updated.data!.plan).toEqual(reordered);
      expect(new Date(updated.data!.updated_at as string).getTime()).toBeGreaterThan(
        new Date(created.data!.updated_at as string).getTime(),
      );
    });

    it("RLS: bob cannot read alice's plan", async () => {
      const created = await alice
        .from("dbt_coping_plans")
        .insert({ user_id: SEED_USERS.alice.id, plan })
        .select("id")
        .single();
      expect(created.error).toBeNull();
      const bobRead = await bob
        .from("dbt_coping_plans")
        .select("id")
        .eq("user_id", SEED_USERS.alice.id);
      expect(bobRead.error).toBeNull();
      expect(bobRead.data).toEqual([]);
    });
  });

  describe("the two done-day updates", () => {
    it("an opposite-action plan closes from its detail with a done day and an optional note", async () => {
      const created = await alice
        .from("dbt_opposite_action_plans")
        .insert({
          user_id: SEED_USERS.alice.id,
          emotion: "sad",
          pull: "stay in",
          opposite_action: "go out",
        })
        .select("id")
        .single();
      expect(created.error).toBeNull();
      const done = await alice
        .from("dbt_opposite_action_plans")
        .update({
          done_at: "2026-09-06T09:00:00.000Z",
          done_offset_minutes: 180,
          what_shifted: `less heavy by lunch ${MARK("OW")}`,
        })
        .eq("id", created.data!.id as string)
        .select("done_at, done_offset_minutes, what_shifted, pull")
        .single();
      expect(done.error).toBeNull();
      expect(done.data).toMatchObject({
        done_offset_minutes: 180,
        what_shifted: `less heavy by lunch ${MARK("OW")}`,
        pull: "stay in",
      });
      const atRest = await admin
        .from("dbt_opposite_action_plans_data")
        .select("what_shifted_enc")
        .eq("id", created.data!.id as string)
        .single();
      expect(cipherToText(atRest.data?.what_shifted_enc)).not.toContain(MARK("OW"));
    });

    it("a script closes from its card with a done day and an optional how-it-went", async () => {
      const created = await alice
        .from("dbt_scripts")
        .insert({ user_id: SEED_USERS.alice.id, situation: "s", i_think: "t", i_want: "w" })
        .select("id")
        .single();
      expect(created.error).toBeNull();
      const done = await alice
        .from("dbt_scripts")
        .update({
          done_at: "2026-09-06T09:00:00.000Z",
          done_offset_minutes: -420,
          how_it_went: `he said yes ${MARK("SH")}`,
        })
        .eq("id", created.data!.id as string)
        .select("done_offset_minutes, how_it_went, i_want")
        .single();
      expect(done.error).toBeNull();
      expect(done.data).toEqual({
        done_offset_minutes: -420,
        how_it_went: `he said yes ${MARK("SH")}`,
        i_want: "w",
      });
    });
  });
});
