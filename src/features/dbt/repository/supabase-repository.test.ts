import {
  countDbtSessions,
  countEmotionRecords,
  countJudgements,
  countOppositeActionPlans,
  countScripts,
  countWiseMindCheckins,
  deleteCopingPlan,
  deleteEmotionRecord,
  deleteJudgement,
  deleteOppositeActionPlan,
  deleteScript,
  deleteWiseMindCheckin,
  getCopingPlan,
  getEmotionRecord,
  getJudgement,
  getOppositeActionPlan,
  getScript,
  getWiseMindCheckin,
  isMissingDbtSchemaError,
  listDbtSessions,
  listEmotionRecords,
  listEmotionRecordsPage,
  listJudgements,
  listJudgementsPage,
  listOppositeActionPlans,
  listOppositeActionPlansPage,
  listScripts,
  listScriptsPage,
  listWiseMindCheckins,
  listWiseMindCheckinsPage,
  markOppositeActionPlanDone,
  markScriptDone,
  saveCopingPlan,
  saveDbtSession,
  saveEmotionRecord,
  saveJudgement,
  saveOppositeActionPlan,
  saveScript,
  saveWiseMindCheckin,
} from "@/src/features/dbt/repository";
import { descendingCursorFilter } from "@/src/lib/descending-cursor";
import { entryDayKey } from "@/src/lib/occurrence-time";
import { requireSupabase } from "@/src/lib/supabase";

jest.mock("@/src/lib/supabase", () => ({
  requireSupabase: jest.fn(),
}));

const mockRequireSupabase = jest.mocked(requireSupabase);

type Call = { method: string; args: unknown[] };

/**
 * A recording query builder: every method returns the builder, and awaiting it
 * yields `result`. The repository's shapes all end either in a terminal call
 * (`single`, `maybeSingle`, `limit`) or in a bare `await` on the chain, and a
 * thenable builder covers both without a per-shape stub.
 */
function chain(result: Record<string, unknown>) {
  const calls: Call[] = [];
  const builder: Record<string, unknown> = {
    calls,
    then: (resolve: (value: unknown) => unknown) => Promise.resolve(result).then(resolve),
  };
  for (const method of [
    "select",
    "insert",
    "update",
    "delete",
    "eq",
    "or",
    "order",
    "limit",
    "single",
    "maybeSingle",
  ]) {
    builder[method] = jest.fn((...args: unknown[]) => {
      calls.push({ method, args });
      return builder;
    });
  }
  return builder as typeof builder & { calls: Call[] };
}

function useTable(table: string, result: Record<string, unknown>) {
  const builder = chain(result);
  const from = jest.fn((name: string) => {
    expect(name).toBe(table);
    return builder;
  });
  mockRequireSupabase.mockReturnValue({ from } as unknown as ReturnType<typeof requireSupabase>);
  return { builder, from };
}

const called = (builder: { calls: Call[] }, method: string) =>
  builder.calls.filter((call) => call.method === method);

const SCHEMA_MISS = { code: "PGRST205", message: "relation not in schema cache" };
const REAL_ERROR = { code: "42501", message: "permission denied" };
const UUID = "6f1c2a9e-4b3d-4c2e-9f1a-2b3c4d5e6f70";

const BASE = {
  created_at: "2026-06-03T21:30:00.000Z",
  created_offset_minutes: 180,
  updated_at: "2026-06-03T21:30:00.000Z",
};

beforeEach(() => {
  jest.clearAllMocks();
});

describe("isMissingDbtSchemaError", () => {
  it("recognises the PostgREST schema-cache codes and text, and nothing else", () => {
    expect(isMissingDbtSchemaError({ code: "PGRST205" })).toBe(true);
    expect(isMissingDbtSchemaError({ code: "PGRST204" })).toBe(true);
    expect(isMissingDbtSchemaError({ hint: "reload the schema cache" })).toBe(true);
    expect(isMissingDbtSchemaError({ message: "dbt_scripts: permission denied" })).toBe(false);
    expect(isMissingDbtSchemaError(REAL_ERROR)).toBe(false);
    expect(isMissingDbtSchemaError(null)).toBe(false);
    expect(isMissingDbtSchemaError("PGRST205")).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// The five record tables share one shape: count / list / page / get / save /
// delete over a view. One table drives every case, so a row that leaves the
// shape has to leave it here too.
// ---------------------------------------------------------------------------
const RECORD_TABLES = [
  {
    name: "wise mind",
    table: "dbt_wise_mind_checkins",
    count: countWiseMindCheckins,
    list: listWiseMindCheckins,
    page: listWiseMindCheckinsPage,
    get: getWiseMindCheckin,
    remove: deleteWiseMindCheckin,
    row: {
      ...BASE,
      id: UUID,
      user_id: "u1",
      question: "Should I go?",
      emotion_mind: null,
      reason: "It is late",
      wise_mind: null,
    },
    mapped: { question: "Should I go?", emotionMind: "", reason: "It is late", wiseMind: "" },
  },
  {
    name: "judgements",
    table: "dbt_judgements",
    count: countJudgements,
    list: listJudgements,
    page: listJudgementsPage,
    get: getJudgement,
    remove: deleteJudgement,
    row: {
      ...BASE,
      id: UUID,
      user_id: "u1",
      judgement: "She is ignoring me",
      restatement: null,
      valence: "negative",
    },
    mapped: { judgement: "She is ignoring me", restatement: "", valence: "negative" },
  },
  {
    name: "emotion records",
    table: "dbt_emotion_records",
    count: countEmotionRecords,
    list: listEmotionRecords,
    page: listEmotionRecordsPage,
    get: getEmotionRecord,
    remove: deleteEmotionRecord,
    row: {
      ...BASE,
      id: UUID,
      user_id: "u1",
      what_happened: "Missed the bus",
      meaning: null,
      body_sensations: "tight chest",
      urges: null,
      did_and_said: null,
      afterwards: null,
      primary_emotions: ["anxious"],
      secondary_emotions: null,
    },
    mapped: {
      whatHappened: "Missed the bus",
      meaning: "",
      bodySensations: "tight chest",
      primaryEmotions: ["anxious"],
      secondaryEmotions: [],
    },
  },
  {
    name: "opposite action",
    table: "dbt_opposite_action_plans",
    count: countOppositeActionPlans,
    list: listOppositeActionPlans,
    page: listOppositeActionPlansPage,
    get: getOppositeActionPlan,
    remove: deleteOppositeActionPlan,
    row: {
      ...BASE,
      id: UUID,
      user_id: "u1",
      emotion: "angry",
      pull: "snap",
      opposite_action: "soften my voice",
      hold_for: null,
      what_shifted: null,
      done_at: null,
      done_offset_minutes: null,
    },
    mapped: { emotion: "angry", holdFor: "", whatShifted: "", doneAt: null, doneDayKey: null },
  },
  {
    name: "scripts",
    table: "dbt_scripts",
    count: countScripts,
    list: listScripts,
    page: listScriptsPage,
    get: getScript,
    remove: deleteScript,
    row: {
      ...BASE,
      id: UUID,
      user_id: "u1",
      situation: "Late again",
      want_changed: "stop",
      i_think: "You were late twice",
      emotion: null,
      i_feel: null,
      i_want: "text me if you'll be late",
      self_care: null,
      difficulty: 30,
      when_where: null,
      how_it_went: null,
      done_at: "2026-06-04T10:00:00.000Z",
      done_offset_minutes: -300,
    },
    mapped: {
      situation: "Late again",
      wantChanged: "stop",
      iFeel: "",
      selfCare: "",
      difficulty: 30,
      doneDayKey: entryDayKey("2026-06-04T10:00:00.000Z", -300),
    },
  },
] as const;

describe.each(RECORD_TABLES)(
  "$name repository",
  ({ table, count, list, page, get, remove, row, mapped }) => {
    it("counts with an exact head count and degrades to zero when DBT is not migrated", async () => {
      const { builder } = useTable(table, { count: 7, error: null });
      expect(await count("u1")).toBe(7);
      expect(called(builder, "select")[0].args).toEqual(["id", { count: "exact", head: true }]);
      expect(called(builder, "eq")[0].args).toEqual(["user_id", "u1"]);

      useTable(table, { count: null, error: SCHEMA_MISS });
      expect(await count("u1")).toBe(0);

      useTable(table, { count: null, error: REAL_ERROR });
      await expect(count("u1")).rejects.toEqual(REAL_ERROR);
    });

    it("lists newest first, maps the row and resolves the day once from the captured offset", async () => {
      const { builder } = useTable(table, { data: [row], error: null });
      const [record] = await list("u1", 5);

      expect(record).toMatchObject({
        id: UUID,
        userId: "u1",
        createdAt: BASE.created_at,
        createdOffsetMinutes: 180,
        dayKey: entryDayKey(BASE.created_at, 180),
        ...mapped,
      });
      expect(called(builder, "order")[0].args).toEqual(["created_at", { ascending: false }]);
      expect(called(builder, "limit")[0].args).toEqual([5]);
    });

    it("degrades a list to empty on a schema miss and surfaces every other error", async () => {
      useTable(table, { data: null, error: SCHEMA_MISS });
      expect(await list("u1")).toEqual([]);

      useTable(table, { data: null, error: REAL_ERROR });
      await expect(list("u1")).rejects.toEqual(REAL_ERROR);
    });

    it("pages by keyset on created_at and id, with the cursor filter only after the first page", async () => {
      const first = useTable(table, { data: [row], error: null });
      await page("u1", 20, null);
      expect(called(first.builder, "or")).toHaveLength(0);
      expect(called(first.builder, "order").map((call) => call.args[0])).toEqual([
        "created_at",
        "id",
      ]);
      expect(called(first.builder, "limit")[0].args).toEqual([20]);

      const cursor = { timestamp: BASE.created_at, id: UUID };
      const next = useTable(table, { data: [], error: null });
      await page("u1", 20, cursor);
      expect(called(next.builder, "or")[0].args).toEqual([
        descendingCursorFilter("created_at", cursor),
      ]);
    });

    it("reads one record by id, refusing a non-uuid before touching the client", async () => {
      expect(await get("u1", "not-a-uuid")).toBeNull();
      expect(mockRequireSupabase).not.toHaveBeenCalled();

      const { builder } = useTable(table, { data: row, error: null });
      expect(await get("u1", UUID)).toMatchObject({ id: UUID, ...mapped });
      expect(called(builder, "eq").map((call) => call.args)).toEqual([
        ["user_id", "u1"],
        ["id", UUID],
      ]);
      expect(called(builder, "maybeSingle")).toHaveLength(1);

      useTable(table, { data: null, error: null });
      expect(await get("u1", UUID)).toBeNull();

      useTable(table, { data: null, error: SCHEMA_MISS });
      expect(await get("u1", UUID)).toBeNull();
    });

    it("deletes by user and id, and a failed delete throws", async () => {
      const { builder } = useTable(table, { error: null });
      await remove("u1", UUID);
      expect(called(builder, "delete")).toHaveLength(1);
      expect(called(builder, "eq").map((call) => call.args)).toEqual([
        ["user_id", "u1"],
        ["id", UUID],
      ]);

      useTable(table, { error: REAL_ERROR });
      await expect(remove("u1", UUID)).rejects.toEqual(REAL_ERROR);
    });
  },
);

// ---------------------------------------------------------------------------
// Writes: the payload each save sends. Free text is sanitised once and
// trimmed, absent optionals become empty strings, and the captured offset
// rides every dated column.
// ---------------------------------------------------------------------------
const WHEN = { createdAt: "2026-06-03T21:30:00.000Z", createdOffsetMinutes: 180 };

function insertPayload(builder: { calls: Call[] }) {
  return called(builder, "insert")[0].args[0] as Record<string, unknown>;
}

function updatePayload(builder: { calls: Call[] }) {
  return called(builder, "update")[0].args[0] as Record<string, unknown>;
}

describe("saves", () => {
  it("saveWiseMindCheckin trims the question, empties absent halves and returns the mapped row", async () => {
    const { builder } = useTable("dbt_wise_mind_checkins", {
      data: {
        ...BASE,
        id: UUID,
        user_id: "u1",
        question: "Go?",
        emotion_mind: "",
        reason: "",
        wise_mind: "",
      },
      error: null,
    });
    const saved = await saveWiseMindCheckin("u1", { question: "  Go?  ", ...WHEN });
    expect(insertPayload(builder)).toEqual({
      user_id: "u1",
      question: "Go?",
      emotion_mind: "",
      reason: "",
      wise_mind: "",
      created_at: WHEN.createdAt,
      created_offset_minutes: 180,
    });
    expect(saved.dayKey).toBe(entryDayKey(WHEN.createdAt, 180));
  });

  it("saveJudgement carries the valence through untouched", async () => {
    const { builder } = useTable("dbt_judgements", {
      data: {
        ...BASE,
        id: UUID,
        user_id: "u1",
        judgement: "x",
        restatement: "y",
        valence: "positive",
      },
      error: null,
    });
    const saved = await saveJudgement("u1", {
      judgement: " x ",
      restatement: " y ",
      valence: "positive",
      ...WHEN,
    });
    expect(insertPayload(builder)).toMatchObject({
      judgement: "x",
      restatement: "y",
      valence: "positive",
    });
    expect(saved.valence).toBe("positive");
  });

  it("saveEmotionRecord stores emotion ids deduplicated and blank-free, never labels", async () => {
    const { builder } = useTable("dbt_emotion_records", {
      data: {
        ...BASE,
        id: UUID,
        user_id: "u1",
        what_happened: "x",
        meaning: null,
        body_sensations: null,
        urges: null,
        did_and_said: null,
        afterwards: null,
        primary_emotions: ["sad"],
        secondary_emotions: [],
      },
      error: null,
    });
    await saveEmotionRecord("u1", {
      whatHappened: "x",
      primaryEmotions: [" sad ", "sad", ""],
      ...WHEN,
    });
    expect(insertPayload(builder)).toMatchObject({
      what_happened: "x",
      primary_emotions: ["sad"],
      secondary_emotions: [],
      meaning: "",
      afterwards: "",
    });
  });

  it("saveOppositeActionPlan writes no done columns - an open plan has no day to mark", async () => {
    const { builder } = useTable("dbt_opposite_action_plans", {
      data: {
        ...BASE,
        id: UUID,
        user_id: "u1",
        emotion: "angry",
        pull: "snap",
        opposite_action: "soften",
        hold_for: "",
        what_shifted: null,
        done_at: null,
        done_offset_minutes: null,
      },
      error: null,
    });
    const saved = await saveOppositeActionPlan("u1", {
      emotion: " angry ",
      pull: "snap",
      oppositeAction: "soften",
      ...WHEN,
    });
    const payload = insertPayload(builder);
    expect(payload).toMatchObject({
      emotion: "angry",
      pull: "snap",
      opposite_action: "soften",
      hold_for: "",
    });
    expect(payload).not.toHaveProperty("done_at");
    expect(saved.doneDayKey).toBeNull();
  });

  it("markOppositeActionPlanDone is the one update a plan takes: the done day and the note", async () => {
    const { builder } = useTable("dbt_opposite_action_plans", {
      data: {
        ...BASE,
        id: UUID,
        user_id: "u1",
        emotion: "angry",
        pull: "snap",
        opposite_action: "soften",
        hold_for: null,
        what_shifted: "it passed",
        done_at: "2026-06-05T08:00:00.000Z",
        done_offset_minutes: 60,
      },
      error: null,
    });
    const done = await markOppositeActionPlanDone("u1", UUID, {
      doneAt: "2026-06-05T08:00:00.000Z",
      doneOffsetMinutes: 60,
      whatShifted: " it passed ",
    });
    expect(updatePayload(builder)).toEqual({
      done_at: "2026-06-05T08:00:00.000Z",
      done_offset_minutes: 60,
      what_shifted: "it passed",
    });
    expect(called(builder, "eq").map((call) => call.args)).toEqual([
      ["user_id", "u1"],
      ["id", UUID],
    ]);
    expect(done.doneDayKey).toBe(entryDayKey("2026-06-05T08:00:00.000Z", 60));
  });

  it("saveScript nulls an absent emotion and difficulty, and keeps the four lines trimmed", async () => {
    const { builder } = useTable("dbt_scripts", {
      data: {
        ...BASE,
        id: UUID,
        user_id: "u1",
        situation: "s",
        want_changed: null,
        i_think: "t",
        emotion: null,
        i_feel: "",
        i_want: "w",
        self_care: "",
        difficulty: null,
        when_where: "",
        how_it_went: null,
        done_at: null,
        done_offset_minutes: null,
      },
      error: null,
    });
    const saved = await saveScript("u1", {
      situation: " s ",
      iThink: " t ",
      iWant: " w ",
      emotion: "  ",
      ...WHEN,
    });
    expect(insertPayload(builder)).toEqual({
      user_id: "u1",
      situation: "s",
      want_changed: null,
      i_think: "t",
      emotion: null,
      i_feel: "",
      i_want: "w",
      self_care: "",
      difficulty: null,
      when_where: "",
      created_at: WHEN.createdAt,
      created_offset_minutes: 180,
    });
    expect(saved).toMatchObject({
      wantChanged: null,
      emotion: null,
      difficulty: null,
      doneAt: null,
    });
  });

  it("markScriptDone closes the script with the done day and how it went", async () => {
    const { builder } = useTable("dbt_scripts", {
      data: {
        ...BASE,
        id: UUID,
        user_id: "u1",
        situation: "s",
        want_changed: "moreOf",
        i_think: "t",
        emotion: "calm",
        i_feel: "",
        i_want: "w",
        self_care: "",
        difficulty: 10,
        when_where: "",
        how_it_went: "fine",
        done_at: "2026-06-05T08:00:00.000Z",
        done_offset_minutes: 0,
      },
      error: null,
    });
    const done = await markScriptDone("u1", UUID, {
      doneAt: "2026-06-05T08:00:00.000Z",
      doneOffsetMinutes: 0,
      howItWent: "fine",
    });
    expect(updatePayload(builder)).toEqual({
      done_at: "2026-06-05T08:00:00.000Z",
      done_offset_minutes: 0,
      how_it_went: "fine",
    });
    expect(done.doneDayKey).toBe("2026-06-05");
  });

  it("a failed write surfaces rather than degrading", async () => {
    useTable("dbt_judgements", { data: null, error: SCHEMA_MISS });
    await expect(
      saveJudgement("u1", { judgement: "x", valence: "negative", ...WHEN }),
    ).rejects.toEqual(SCHEMA_MISS);
  });
});

// ---------------------------------------------------------------------------
// Sessions: written on completion only, counted for the home's second stat.
// ---------------------------------------------------------------------------
describe("sessions repository", () => {
  const row = {
    id: UUID,
    user_id: "u1",
    session_slug: "muscle-relaxation",
    variant: "short",
    duration_seconds: 420,
    completed_at: "2026-06-03T21:30:00.000Z",
    completed_offset_minutes: 180,
    created_at: "2026-06-03T21:30:05.000Z",
    updated_at: "2026-06-03T21:30:05.000Z",
  };

  it("counts every completed session and degrades to zero", async () => {
    useTable("dbt_sessions", { count: 3, error: null });
    expect(await countDbtSessions("u1")).toBe(3);
    useTable("dbt_sessions", { count: null, error: SCHEMA_MISS });
    expect(await countDbtSessions("u1")).toBe(0);
  });

  it("lists by completed_at and resolves the day from the completion offset", async () => {
    const { builder } = useTable("dbt_sessions", { data: [row], error: null });
    const [session] = await listDbtSessions("u1");
    expect(session).toMatchObject({
      sessionSlug: "muscle-relaxation",
      variant: "short",
      durationSeconds: 420,
      dayKey: entryDayKey(row.completed_at, 180),
    });
    expect(called(builder, "order")[0].args).toEqual(["completed_at", { ascending: false }]);
    expect(called(builder, "limit")[0].args).toEqual([100]);
  });

  it("saves the completion with its offset and a null variant when none was chosen", async () => {
    const { builder } = useTable("dbt_sessions", { data: { ...row, variant: null }, error: null });
    const saved = await saveDbtSession("u1", {
      sessionSlug: "muscle-relaxation",
      durationSeconds: 420,
      completedAt: row.completed_at,
      completedOffsetMinutes: 180,
    });
    expect(insertPayload(builder)).toEqual({
      user_id: "u1",
      session_slug: "muscle-relaxation",
      variant: null,
      duration_seconds: 420,
      completed_at: row.completed_at,
      completed_offset_minutes: 180,
    });
    expect(saved.variant).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// The coping plan: one row, one document, insert or replace.
// ---------------------------------------------------------------------------
describe("coping plan repository", () => {
  const document = {
    items: [
      {
        id: "a",
        section: "distract" as const,
        kind: "pick" as const,
        pickKey: "walk",
        homeOnly: false,
        position: 0,
      },
      {
        id: "b",
        section: "remind" as const,
        kind: "own" as const,
        text: "  it passes  ",
        homeOnly: true,
        position: 1,
      },
    ],
    fallback: ["a", "b", "gone"],
  };
  const row = {
    id: UUID,
    user_id: "u1",
    plan: document,
    created_at: BASE.created_at,
    updated_at: BASE.updated_at,
  };

  it("reads the one row, an empty document standing in for a null column", async () => {
    useTable("dbt_coping_plans", { data: { ...row, plan: null }, error: null });
    expect((await getCopingPlan("u1"))?.plan).toEqual({ items: [], fallback: [] });

    useTable("dbt_coping_plans", { data: null, error: null });
    expect(await getCopingPlan("u1")).toBeNull();
  });

  it("inserts a first plan and updates an existing one in place, normalised either way", async () => {
    const created = useTable("dbt_coping_plans", { data: row, error: null });
    await saveCopingPlan("u1", document, null);
    const inserted = insertPayload(created.builder) as { user_id: string; plan: typeof document };
    expect(inserted.user_id).toBe("u1");
    expect(inserted.plan.items[1]).toMatchObject({ text: "it passes", position: 1 });
    expect(inserted.plan.fallback).toEqual(["a", "b"]);
    expect(called(created.builder, "update")).toHaveLength(0);

    const replaced = useTable("dbt_coping_plans", { data: row, error: null });
    await saveCopingPlan("u1", document, UUID);
    expect(called(replaced.builder, "insert")).toHaveLength(0);
    expect((updatePayload(replaced.builder) as { plan: typeof document }).plan.fallback).toEqual([
      "a",
      "b",
    ]);
    expect(called(replaced.builder, "eq").map((call) => call.args)).toEqual([
      ["user_id", "u1"],
      ["id", UUID],
    ]);
  });

  it("deletes the row by user and id", async () => {
    const { builder } = useTable("dbt_coping_plans", { error: null });
    await deleteCopingPlan("u1", UUID);
    expect(called(builder, "delete")).toHaveLength(1);
    expect(called(builder, "eq").map((call) => call.args)).toEqual([
      ["user_id", "u1"],
      ["id", UUID],
    ]);
  });
});
