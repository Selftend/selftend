import {
  listValueEntries,
  getValueEntryByDomain,
  upsertValueEntry,
} from "@/src/features/act/repository";
import { requireSupabase } from "@/src/lib/supabase";

jest.mock("@/src/lib/supabase", () => ({ requireSupabase: jest.fn() }));
const mockRequireSupabase = jest.mocked(requireSupabase);

function buildClient(builders: Record<string, unknown>) {
  return { from: jest.fn((t: string) => builders[t]) } as unknown as ReturnType<
    typeof requireSupabase
  >;
}

const ROW = {
  id: "11111111-1111-4111-8111-111111111111",
  user_id: "u1",
  life_domain: "work",
  value_statement: "Be a supportive colleague",
  importance_rating: 8,
  current_alignment_rating: 5,
  current_actions_note: "mentoring juniors",
  desired_actions_note: "give more feedback",
  barriers: "time pressure",
  created_at: "2026-05-10T07:00:00.000Z",
  updated_at: "2026-05-10T07:00:00.000Z",
};

describe("values repository", () => {
  it("listValueEntries maps rows ordered by life_domain with no limit", async () => {
    const order = jest.fn().mockResolvedValue({ data: [ROW], error: null });
    const eq = jest.fn(() => ({ order }));
    const select = jest.fn(() => ({ eq }));
    mockRequireSupabase.mockReturnValue(buildClient({ act_value_entries: { select } }));

    const result = await listValueEntries("u1");
    expect(result[0]).toMatchObject({ id: ROW.id, lifeDomain: "work" });
    expect(eq).toHaveBeenCalledWith("user_id", "u1");
    expect(order).toHaveBeenCalledWith("life_domain");
  });

  it("listValueEntries degrades to [] on a missing-schema error", async () => {
    const order = jest.fn().mockResolvedValue({ data: null, error: { code: "PGRST205" } });
    const eq = jest.fn(() => ({ order }));
    const select = jest.fn(() => ({ eq }));
    mockRequireSupabase.mockReturnValue(buildClient({ act_value_entries: { select } }));

    expect(await listValueEntries("u1")).toEqual([]);
  });

  it("getValueEntryByDomain maps a found row", async () => {
    const maybeSingle = jest.fn().mockResolvedValue({ data: ROW, error: null });
    const eqDomain = jest.fn(() => ({ maybeSingle }));
    const eqUser = jest.fn(() => ({ eq: eqDomain }));
    const select = jest.fn(() => ({ eq: eqUser }));
    mockRequireSupabase.mockReturnValue(buildClient({ act_value_entries: { select } }));

    const result = await getValueEntryByDomain("u1", "work");
    expect(result).toMatchObject({ id: ROW.id, lifeDomain: "work" });
    expect(eqUser).toHaveBeenCalledWith("user_id", "u1");
    expect(eqDomain).toHaveBeenCalledWith("life_domain", "work");
  });

  it("getValueEntryByDomain degrades to null on a missing-schema error", async () => {
    const maybeSingle = jest.fn().mockResolvedValue({ data: null, error: { code: "PGRST205" } });
    const eqDomain = jest.fn(() => ({ maybeSingle }));
    const eqUser = jest.fn(() => ({ eq: eqDomain }));
    const select = jest.fn(() => ({ eq: eqUser }));
    mockRequireSupabase.mockReturnValue(buildClient({ act_value_entries: { select } }));

    expect(await getValueEntryByDomain("u1", "work")).toBeNull();
  });

  it("upsertValueEntry writes only present fields (sanitized/trimmed) and maps the row", async () => {
    const single = jest.fn().mockResolvedValue({ data: ROW, error: null });
    const select = jest.fn(() => ({ single }));
    const insert = jest.fn(() => ({ select }));
    mockRequireSupabase.mockReturnValue(buildClient({ act_value_entries: { insert } }));

    const result = await upsertValueEntry("u1", {
      lifeDomain: "work",
      valueStatement: "  Be a supportive colleague  ",
      barriers: "  time pressure  ",
    });

    const payload = (insert.mock.calls[0] as unknown as [Record<string, unknown>])[0];
    expect(payload).toMatchObject({
      user_id: "u1",
      life_domain: "work",
      value_statement: "Be a supportive colleague",
      barriers: "time pressure",
    });
    expect(payload).not.toHaveProperty("importance_rating");
    expect(payload).not.toHaveProperty("current_alignment_rating");
    expect(payload).not.toHaveProperty("current_actions_note");
    expect(payload).not.toHaveProperty("desired_actions_note");
    expect(result).toMatchObject({ id: ROW.id, lifeDomain: "work" });
  });

  it("upsertValueEntry writes all patch fields when present", async () => {
    const single = jest.fn().mockResolvedValue({ data: ROW, error: null });
    const select = jest.fn(() => ({ single }));
    const insert = jest.fn(() => ({ select }));
    mockRequireSupabase.mockReturnValue(buildClient({ act_value_entries: { insert } }));

    await upsertValueEntry("u1", {
      lifeDomain: "work",
      valueStatement: "  Be a supportive colleague  ",
      importanceRating: 8,
      currentAlignmentRating: 5,
      currentActionsNote: "  mentoring juniors  ",
      desiredActionsNote: "  give more feedback  ",
      barriers: "  time pressure  ",
    });

    const payload = (insert.mock.calls[0] as unknown as [Record<string, unknown>])[0];
    expect(payload).toMatchObject({
      user_id: "u1",
      life_domain: "work",
      value_statement: "Be a supportive colleague",
      importance_rating: 8,
      current_alignment_rating: 5,
      current_actions_note: "mentoring juniors",
      desired_actions_note: "give more feedback",
      barriers: "time pressure",
    });
  });

  it("upsertValueEntry throws a real error (no degradation)", async () => {
    const single = jest.fn().mockResolvedValue({ data: null, error: { code: "23505" } });
    const select = jest.fn(() => ({ single }));
    const insert = jest.fn(() => ({ select }));
    mockRequireSupabase.mockReturnValue(buildClient({ act_value_entries: { insert } }));

    await expect(upsertValueEntry("u1", { lifeDomain: "work" })).rejects.toMatchObject({
      code: "23505",
    });
  });

  it("upsertValueEntry throws even on a missing-schema error (the contrast with program-state)", async () => {
    const single = jest.fn().mockResolvedValue({ data: null, error: { code: "PGRST205" } });
    const select = jest.fn(() => ({ single }));
    const insert = jest.fn(() => ({ select }));
    mockRequireSupabase.mockReturnValue(buildClient({ act_value_entries: { insert } }));

    await expect(upsertValueEntry("u1", { lifeDomain: "work" })).rejects.toMatchObject({
      code: "PGRST205",
    });
  });
});
