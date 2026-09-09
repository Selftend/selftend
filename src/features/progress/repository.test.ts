import { listRecordDays, viewerOffsetMinutes } from "@/src/features/progress/repository";
import { requireSupabase } from "@/src/lib/supabase";

jest.mock("@/src/lib/supabase", () => ({
  requireSupabase: jest.fn(),
}));

const mockRequireSupabase = jest.mocked(requireSupabase);

function withRpc(result: { data: unknown; error: unknown }) {
  const rpc = jest.fn().mockResolvedValue(result);
  mockRequireSupabase.mockReturnValue({ rpc } as unknown as ReturnType<typeof requireSupabase>);
  return rpc;
}

describe("viewerOffsetMinutes", () => {
  it("reports minutes EAST of UTC, the sign the occurrence columns store", () => {
    // The runner pins TZ to Asia/Kolkata (+05:30), where getTimezoneOffset()
    // returns -330. A sign slip here would file the whole legacy tail eleven
    // hours away, so pin the direction rather than the magnitude alone.
    expect(viewerOffsetMinutes()).toBe(330);
    expect(viewerOffsetMinutes(new Date("2026-03-15T20:00:00.000Z"))).toBe(330);
  });
});

describe("listRecordDays", () => {
  beforeEach(() => jest.clearAllMocks());

  it("passes the frame through to the RPC and returns its day keys", async () => {
    const rpc = withRpc({ data: ["2026-03-02", "2026-03-03"], error: null });

    await expect(listRecordDays(330)).resolves.toEqual(["2026-03-02", "2026-03-03"]);
    expect(rpc).toHaveBeenCalledWith("record_days", { p_fallback_offset_minutes: 330 });
  });

  it("treats a null payload as no days rather than throwing", async () => {
    withRpc({ data: null, error: null });

    await expect(listRecordDays(0)).resolves.toEqual([]);
  });

  it("throws the RPC's error instead of rendering an empty record", async () => {
    withRpc({ data: null, error: { message: "boom" } });

    // Silently returning [] here would draw a person's whole history as absence.
    await expect(listRecordDays(0)).rejects.toEqual({ message: "boom" });
  });
});
