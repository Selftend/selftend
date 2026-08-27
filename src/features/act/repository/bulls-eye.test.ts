import {
  getLatestBullsEyeByDomain,
  listBullsEyeSnapshots,
  saveBullsEyeSnapshot,
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
  domain: "work",
  alignment_rating: 7,
  reviewed_at: "2026-05-10T07:00:00.000Z",
  created_at: "2026-05-10T07:00:00.000Z",
};

describe("bulls-eye repository", () => {
  it("listBullsEyeSnapshots maps rows ordered by reviewed_at desc, limit 50", async () => {
    const limit = jest.fn().mockResolvedValue({ data: [ROW], error: null });
    const order = jest.fn(() => ({ limit }));
    const eq = jest.fn(() => ({ order }));
    const select = jest.fn(() => ({ eq }));
    mockRequireSupabase.mockReturnValue(buildClient({ act_bulls_eye_snapshots: { select } }));

    const result = await listBullsEyeSnapshots("u1");
    expect(result[0]).toMatchObject({ id: ROW.id, domain: "work", alignmentRating: 7 });
    expect(eq).toHaveBeenCalledWith("user_id", "u1");
    expect(order).toHaveBeenCalledWith("reviewed_at", { ascending: false });
    expect(limit).toHaveBeenCalledWith(50);
  });

  it("listBullsEyeSnapshots degrades to [] on a missing-schema error", async () => {
    const limit = jest.fn().mockResolvedValue({ data: null, error: { code: "PGRST205" } });
    const order = jest.fn(() => ({ limit }));
    const eq = jest.fn(() => ({ order }));
    const select = jest.fn(() => ({ eq }));
    mockRequireSupabase.mockReturnValue(buildClient({ act_bulls_eye_snapshots: { select } }));

    expect(await listBullsEyeSnapshots("u1")).toEqual([]);
  });

  it("listBullsEyeSnapshots rethrows a real error", async () => {
    const limit = jest.fn().mockResolvedValue({ data: null, error: { code: "23503" } });
    const order = jest.fn(() => ({ limit }));
    const eq = jest.fn(() => ({ order }));
    const select = jest.fn(() => ({ eq }));
    mockRequireSupabase.mockReturnValue(buildClient({ act_bulls_eye_snapshots: { select } }));

    await expect(listBullsEyeSnapshots("u1")).rejects.toMatchObject({ code: "23503" });
  });

  // The read behind the values row. It exists BECAUSE the list above caps at 50, so
  // these assert the shape that makes it cap-proof: one seek per domain, newest first,
  // limit 1 - never a slice of the history list.
  describe("getLatestBullsEyeByDomain", () => {
    function buildLatestClient(byDomain: Record<string, number | null>) {
      const calls: { domain?: string; limit?: number; order?: unknown[] }[] = [];
      const select = jest.fn(() => {
        const call: { domain?: string; limit?: number; order?: unknown[] } = {};
        calls.push(call);
        const maybeSingle = jest.fn(async () => {
          const rating = byDomain[call.domain!];
          return { data: rating === null ? null : { alignment_rating: rating }, error: null };
        });
        const limit = jest.fn((n: number) => {
          call.limit = n;
          return { maybeSingle };
        });
        const order = jest.fn((...args: unknown[]) => {
          call.order = args;
          return { limit };
        });
        const eqDomain = jest.fn((_col: string, value: string) => {
          call.domain = value;
          return { order };
        });
        const eqUser = jest.fn(() => ({ eq: eqDomain }));
        return { eq: eqUser };
      });
      return {
        client: buildClient({ act_bulls_eye_snapshots: { select } }),
        calls,
      };
    }

    it("reads the newest row per domain and keys the ratings by domain", async () => {
      const { client, calls } = buildLatestClient({
        work: 7,
        leisure: 5,
        relationships: 8,
        personalGrowth: 6,
      });
      mockRequireSupabase.mockReturnValue(client);

      expect(await getLatestBullsEyeByDomain("u1")).toEqual({
        work: 7,
        leisure: 5,
        relationships: 8,
        personalGrowth: 6,
      });
      // One seek per domain, each newest-first and capped at a single row.
      expect(calls).toHaveLength(4);
      expect(calls.map((c) => c.domain).sort()).toEqual(
        ["leisure", "personalGrowth", "relationships", "work"].sort(),
      );
      expect(calls.every((c) => c.limit === 1)).toBe(true);
      expect(
        calls.every(
          (c) => JSON.stringify(c.order) === JSON.stringify(["reviewed_at", { ascending: false }]),
        ),
      ).toBe(true);
    });

    it("reports null for a domain that has never been rated", async () => {
      const { client } = buildLatestClient({
        work: 7,
        leisure: null,
        relationships: null,
        personalGrowth: 6,
      });
      mockRequireSupabase.mockReturnValue(client);

      expect(await getLatestBullsEyeByDomain("u1")).toEqual({
        work: 7,
        leisure: null,
        relationships: null,
        personalGrowth: 6,
      });
    });

    it("degrades every domain to null on a missing-schema error", async () => {
      const maybeSingle = jest.fn().mockResolvedValue({ data: null, error: { code: "PGRST205" } });
      const limit = jest.fn(() => ({ maybeSingle }));
      const order = jest.fn(() => ({ limit }));
      const eqDomain = jest.fn(() => ({ order }));
      const eqUser = jest.fn(() => ({ eq: eqDomain }));
      const select = jest.fn(() => ({ eq: eqUser }));
      mockRequireSupabase.mockReturnValue(buildClient({ act_bulls_eye_snapshots: { select } }));

      expect(await getLatestBullsEyeByDomain("u1")).toEqual({
        work: null,
        leisure: null,
        relationships: null,
        personalGrowth: null,
      });
    });

    it("rethrows a real error", async () => {
      const maybeSingle = jest.fn().mockResolvedValue({ data: null, error: { code: "23503" } });
      const limit = jest.fn(() => ({ maybeSingle }));
      const order = jest.fn(() => ({ limit }));
      const eqDomain = jest.fn(() => ({ order }));
      const eqUser = jest.fn(() => ({ eq: eqDomain }));
      const select = jest.fn(() => ({ eq: eqUser }));
      mockRequireSupabase.mockReturnValue(buildClient({ act_bulls_eye_snapshots: { select } }));

      await expect(getLatestBullsEyeByDomain("u1")).rejects.toMatchObject({ code: "23503" });
    });
  });

  it("saveBullsEyeSnapshot defaults reviewed_at to now and writes numeric/enum fields unsanitized", async () => {
    const single = jest.fn().mockResolvedValue({ data: ROW, error: null });
    const select = jest.fn(() => ({ single }));
    const insert = jest.fn(() => ({ select }));
    mockRequireSupabase.mockReturnValue(buildClient({ act_bulls_eye_snapshots: { insert } }));

    const before = Date.now();
    const result = await saveBullsEyeSnapshot("u1", { domain: "work", alignmentRating: 7 });
    const after = Date.now();

    const payload = (insert.mock.calls[0] as unknown as [Record<string, unknown>])[0];
    expect(payload).toMatchObject({ user_id: "u1", domain: "work", alignment_rating: 7 });
    expect(typeof payload.reviewed_at).toBe("string");
    const reviewedAtMs = new Date(payload.reviewed_at as string).getTime();
    expect(reviewedAtMs).toBeGreaterThanOrEqual(before);
    expect(reviewedAtMs).toBeLessThanOrEqual(after);
    expect(result).toMatchObject({ id: ROW.id, domain: "work", alignmentRating: 7 });
  });

  it("saveBullsEyeSnapshot uses the provided reviewedAt when present", async () => {
    const single = jest.fn().mockResolvedValue({ data: ROW, error: null });
    const select = jest.fn(() => ({ single }));
    const insert = jest.fn(() => ({ select }));
    mockRequireSupabase.mockReturnValue(buildClient({ act_bulls_eye_snapshots: { insert } }));

    await saveBullsEyeSnapshot("u1", {
      domain: "work",
      alignmentRating: 7,
      reviewedAt: "2026-01-01T00:00:00.000Z",
    });

    const payload = (insert.mock.calls[0] as unknown as [Record<string, unknown>])[0];
    expect(payload.reviewed_at).toBe("2026-01-01T00:00:00.000Z");
  });

  it("saveBullsEyeSnapshot throws a real error", async () => {
    const single = jest.fn().mockResolvedValue({ data: null, error: { code: "23505" } });
    const select = jest.fn(() => ({ single }));
    const insert = jest.fn(() => ({ select }));
    mockRequireSupabase.mockReturnValue(buildClient({ act_bulls_eye_snapshots: { insert } }));

    await expect(
      saveBullsEyeSnapshot("u1", { domain: "work", alignmentRating: 7 }),
    ).rejects.toMatchObject({ code: "23505" });
  });
});
