import {
  getUrgeSurfLog,
  listBullsEyeSnapshotsPage,
  listChoicePointsPage,
  listCommittedActionArchivePage,
  listConnectionLogsPage,
  listDefusionLogsPage,
  listExpansionLogsPage,
  listObservingSelfSessionsPage,
  listUrgeSurfLogsPage,
} from "@/src/features/act/repository";
import { requireSupabase } from "@/src/lib/supabase";

jest.mock("@/src/lib/supabase", () => ({ requireSupabase: jest.fn() }));
const mockRequireSupabase = jest.mocked(requireSupabase);

/**
 * The eight ACT archive reads #1517 added, exercised through one builder.
 *
 * ☠️ The branch that matters is `if (cursor)`. Only the FIRST page of an archive is read
 * without a cursor, so a defect in the cursor arm hides behind a screen that looks
 * perfectly healthy until a user scrolls — and `history-pagination-contract.test.ts` is a
 * source-text gate, so it can prove `descendingCursorFilter` is *mentioned* but never
 * that it is reached. Both arms are asserted here for all eight.
 */

interface Recorder {
  table?: string;
  orders: unknown[][];
  or?: string;
  limit?: number;
  filters: [string, unknown][];
  ins: [string, unknown][];
}

function buildClient(rows: unknown[], error: unknown = null) {
  const rec: Recorder = { orders: [], filters: [], ins: [] };

  // `.order()` is called twice and `.or()` is optional, so every step returns the same
  // chainable object; `.limit()` is what settles.
  const chain: Record<string, unknown> = {};
  Object.assign(chain, {
    eq: jest.fn((col: string, value: unknown) => {
      rec.filters.push([col, value]);
      return chain;
    }),
    in: jest.fn((col: string, value: unknown) => {
      rec.ins.push([col, value]);
      return chain;
    }),
    order: jest.fn((...args: unknown[]) => {
      rec.orders.push(args);
      return chain;
    }),
    or: jest.fn((clause: string) => {
      rec.or = clause;
      return chain;
    }),
    limit: jest.fn(async (n: number) => {
      rec.limit = n;
      return { data: error ? null : rows, error };
    }),
  });

  const client = {
    from: jest.fn((table: string) => {
      rec.table = table;
      return { select: jest.fn(() => chain) };
    }),
  } as unknown as ReturnType<typeof requireSupabase>;

  return { client, rec };
}

const CURSOR = {
  timestamp: "2026-05-10T07:00:00.000Z",
  id: "11111111-1111-4111-8111-111111111111",
};

const PAGE_READS = [
  ["listDefusionLogsPage", listDefusionLogsPage, "act_defusion_logs", "created_at"],
  ["listExpansionLogsPage", listExpansionLogsPage, "act_expansion_logs", "created_at"],
  ["listConnectionLogsPage", listConnectionLogsPage, "act_connection_logs", "created_at"],
  [
    "listObservingSelfSessionsPage",
    listObservingSelfSessionsPage,
    "act_observing_self_sessions",
    "created_at",
  ],
  ["listChoicePointsPage", listChoicePointsPage, "act_choice_points", "created_at"],
  ["listUrgeSurfLogsPage", listUrgeSurfLogsPage, "act_urge_surf_logs", "created_at"],
  [
    "listBullsEyeSnapshotsPage",
    listBullsEyeSnapshotsPage,
    "act_bulls_eye_snapshots",
    "reviewed_at",
  ],
  [
    "listCommittedActionArchivePage",
    listCommittedActionArchivePage,
    "act_committed_actions",
    "created_at",
  ],
] as const;

describe.each(PAGE_READS)("%s", (_name, read, table, timestampColumn) => {
  it("orders newest-first on its timestamp and breaks the tie on id", async () => {
    const { client, rec } = buildClient([]);
    mockRequireSupabase.mockReturnValue(client);

    await read("u1", 20, null);

    expect(rec.table).toBe(table);
    expect(rec.filters).toContainEqual(["user_id", "u1"]);
    expect(rec.orders).toEqual([
      [timestampColumn, { ascending: false }],
      ["id", { ascending: false }],
    ]);
    expect(rec.limit).toBe(20);
  });

  it("applies no keyset filter for the first page", async () => {
    const { client, rec } = buildClient([]);
    mockRequireSupabase.mockReturnValue(client);

    await read("u1", 20, null);

    expect(rec.or).toBeUndefined();
  });

  it("applies the descending keyset once a cursor is handed in", async () => {
    const { client, rec } = buildClient([]);
    mockRequireSupabase.mockReturnValue(client);

    await read("u1", 20, CURSOR);

    // The exact grammar is `descending-cursor.test.ts`'s to pin; what matters here is
    // that the cursor reaches the query at all, on the right column.
    expect(rec.or).toContain(`${timestampColumn}.lt.`);
    expect(rec.or).toContain(CURSOR.timestamp);
    expect(rec.or).toContain(CURSOR.id);
  });

  // ACT reads degrade to empty while the module is un-migrated; a page read must not be
  // the one that throws a raw PostgREST error at a screen instead.
  it("degrades to [] on a missing-schema error and rethrows a real one", async () => {
    const missing = buildClient([], { code: "PGRST205" });
    mockRequireSupabase.mockReturnValue(missing.client);
    expect(await read("u1", 20, null)).toEqual([]);

    const real = buildClient([], { code: "23503" });
    mockRequireSupabase.mockReturnValue(real.client);
    await expect(read("u1", 20, null)).rejects.toMatchObject({ code: "23503" });
  });
});

describe("listCommittedActionArchivePage", () => {
  /**
   * ☠️ The status filter is the whole point of tier 3: active rows are a working set the
   * widget, the routines engine and the programme each treat a missing row as
   * non-existent, so they must never be paged away. If this filter ever widened, an
   * active commitment could fall off the end of a page and vanish from the screen.
   */
  it("reads only the finished statuses, never the active working set", async () => {
    const { client, rec } = buildClient([]);
    mockRequireSupabase.mockReturnValue(client);

    await listCommittedActionArchivePage("u1", 20, null);

    expect(rec.ins).toEqual([["status", ["completed", "abandoned"]]]);
  });
});

describe("getUrgeSurfLog", () => {
  const ROW = {
    id: "11111111-1111-4111-8111-111111111111",
    user_id: "u1",
    urge_description: "to check my phone",
    trigger: "boredom",
    peak_intensity: 70,
    surfing_notes: "it passed",
    urge_acted_on: false,
    completed_at: "2026-05-10T07:04:00.000Z",
    created_at: "2026-05-10T07:00:00.000Z",
    updated_at: "2026-05-10T07:00:00.000Z",
  };

  function buildSingleClient(data: unknown, error: unknown = null) {
    const maybeSingle = jest.fn().mockResolvedValue({ data, error });
    const eqId = jest.fn(() => ({ maybeSingle }));
    const eqUser = jest.fn(() => ({ eq: eqId }));
    const select = jest.fn(() => ({ eq: eqUser }));
    const from = jest.fn(() => ({ select }));
    return {
      client: { from } as unknown as ReturnType<typeof requireSupabase>,
      from,
    };
  }

  it("maps every captured field, including the four no surface used to render", async () => {
    const { client } = buildSingleClient(ROW);
    mockRequireSupabase.mockReturnValue(client);

    expect(await getUrgeSurfLog("u1", ROW.id)).toMatchObject({
      id: ROW.id,
      urgeDescription: "to check my phone",
      trigger: "boredom",
      peakIntensity: 70,
      surfingNotes: "it passed",
      urgeActedOn: false,
    });
  });

  /**
   * ☠️ A malformed route id must not reach PostgREST: the uuid cast 400s and logs a
   * console error, when the honest answer is simply not-found. Same guard the five older
   * ACT detail reads carry.
   */
  it("answers not-found for a malformed id without querying at all", async () => {
    const { client, from } = buildSingleClient(ROW);
    mockRequireSupabase.mockReturnValue(client);

    expect(await getUrgeSurfLog("u1", "not-a-uuid")).toBeNull();
    expect(from).not.toHaveBeenCalled();
  });

  it("degrades to null on a missing-schema error", async () => {
    const { client } = buildSingleClient(null, { code: "PGRST205" });
    mockRequireSupabase.mockReturnValue(client);

    expect(await getUrgeSurfLog("u1", ROW.id)).toBeNull();
  });
});
