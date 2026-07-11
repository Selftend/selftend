import { listBullsEyeSnapshots, saveBullsEyeSnapshot } from "@/src/features/act/repository";
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
