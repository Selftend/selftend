import { countThoughtRecordsSince } from "@/src/features/cbt/repository";
import { requireSupabase } from "@/src/lib/supabase";

jest.mock("@/src/lib/supabase", () => ({
  requireSupabase: jest.fn(),
}));

const mockRequireSupabase = jest.mocked(requireSupabase);

describe("cbt repository - countThoughtRecordsSince", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("counts non-archived thought records created since a cutoff (head request + is + gte filters)", async () => {
    const gte = jest.fn().mockResolvedValue({ count: 5, error: null });
    const isArchived = jest.fn(() => ({ gte }));
    const eqUser = jest.fn(() => ({ is: isArchived }));
    const select = jest.fn(() => ({ eq: eqUser }));
    const from = jest.fn(() => ({ select }));
    mockRequireSupabase.mockReturnValue({ from } as unknown as ReturnType<typeof requireSupabase>);

    await expect(countThoughtRecordsSince("user-1", "2026-05-13T00:00:00.000Z")).resolves.toBe(5);

    expect(from).toHaveBeenCalledWith("thought_records");
    expect(select).toHaveBeenCalledWith("id", { count: "exact", head: true });
    expect(eqUser).toHaveBeenCalledWith("user_id", "user-1");
    expect(isArchived).toHaveBeenCalledWith("archived_at", null);
    expect(gte).toHaveBeenCalledWith("created_at", "2026-05-13T00:00:00.000Z");
  });

  it("treats a null count as zero", async () => {
    const gte = jest.fn().mockResolvedValue({ count: null, error: null });
    const isArchived = jest.fn(() => ({ gte }));
    const eqUser = jest.fn(() => ({ is: isArchived }));
    const select = jest.fn(() => ({ eq: eqUser }));
    const from = jest.fn(() => ({ select }));
    mockRequireSupabase.mockReturnValue({ from } as unknown as ReturnType<typeof requireSupabase>);

    await expect(countThoughtRecordsSince("user-1", "2026-05-13T00:00:00.000Z")).resolves.toBe(0);
  });

  it("throws when the count query errors", async () => {
    const gte = jest.fn().mockResolvedValue({ count: null, error: new Error("boom") });
    const isArchived = jest.fn(() => ({ gte }));
    const eqUser = jest.fn(() => ({ is: isArchived }));
    const select = jest.fn(() => ({ eq: eqUser }));
    const from = jest.fn(() => ({ select }));
    mockRequireSupabase.mockReturnValue({ from } as unknown as ReturnType<typeof requireSupabase>);

    await expect(countThoughtRecordsSince("user-1", "2026-05-13T00:00:00.000Z")).rejects.toThrow(
      "boom",
    );
  });
});
