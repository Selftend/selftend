import {
  currentLocalDayRange,
  getProgramWidgetTaskStatus,
} from "@/src/features/home/program-widget-status";
import { requireSupabase } from "@/src/lib/supabase";

jest.mock("@/src/lib/supabase", () => ({ requireSupabase: jest.fn() }));

const mockRequireSupabase = jest.mocked(requireSupabase);

describe("program widget status", () => {
  beforeEach(() => jest.clearAllMocks());

  it("builds the current local-day boundaries", () => {
    const result = currentLocalDayRange(new Date(2026, 6, 13, 15, 30));
    expect(new Date(result.start).getHours()).toBe(0);
    expect(new Date(result.end).getHours()).toBe(0);
    expect(
      new Date(result.end).getTime() - new Date(result.start).getTime(),
    ).toBeGreaterThanOrEqual(23 * 60 * 60 * 1000);
  });

  it("maps the small RPC response without fetching histories", async () => {
    const rpc = jest.fn().mockResolvedValue({
      data: [{ task_key: "setGoals", done: true }],
      error: null,
    });
    mockRequireSupabase.mockReturnValue({ rpc } as unknown as ReturnType<typeof requireSupabase>);

    await expect(
      getProgramWidgetTaskStatus("cbt", "2026-07-12T21:00:00.000Z", "2026-07-13T21:00:00.000Z"),
    ).resolves.toEqual([{ taskKey: "setGoals", done: true }]);
    expect(rpc).toHaveBeenCalledWith("program_widget_task_status", {
      p_module: "cbt",
      p_day_start: "2026-07-12T21:00:00.000Z",
      p_day_end: "2026-07-13T21:00:00.000Z",
    });
  });

  it("surfaces RPC failures", async () => {
    const rpc = jest.fn().mockResolvedValue({ data: null, error: { code: "42501" } });
    mockRequireSupabase.mockReturnValue({ rpc } as unknown as ReturnType<typeof requireSupabase>);

    await expect(getProgramWidgetTaskStatus("act", "start", "end")).rejects.toMatchObject({
      code: "42501",
    });
  });
});
