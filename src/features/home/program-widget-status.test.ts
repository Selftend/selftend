import {
  currentLocalDayRange,
  getProgramWidgetTaskStatus,
  programWidgetStatusKey,
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

  // The captured-day legs of the RPC need the viewer's day as a key, not only as
  // a pair of instants - a range scan cannot consume a day key (#414).
  it("names the viewer's current day alongside its boundaries", () => {
    expect(currentLocalDayRange(new Date(2026, 6, 13, 15, 30)).key).toBe("2026-07-13");
  });

  // The cache key has to carry every input the RPC reads, not just the day key.
  // Codex caught this on #419: the bounds move independently of the key, so a
  // key of `key` alone lets TanStack serve one timezone's answer for another's.
  it("separates two timezones that share a calendar date", () => {
    const tokyo = {
      key: "2026-07-13",
      start: "2026-07-12T15:00:00.000Z",
      end: "2026-07-13T15:00:00.000Z",
    };
    const london = {
      key: "2026-07-13",
      start: "2026-07-13T00:00:00.000Z",
      end: "2026-07-14T00:00:00.000Z",
    };

    expect(tokyo.key).toBe(london.key);
    expect(programWidgetStatusKey("u1", "act", tokyo)).not.toEqual(
      programWidgetStatusKey("u1", "act", london),
    );
  });

  it("reuses the key when nothing about the day moved", () => {
    const range = {
      key: "2026-07-13",
      start: "2026-07-13T00:00:00.000Z",
      end: "2026-07-14T00:00:00.000Z",
    };

    expect(programWidgetStatusKey("u1", "act", range)).toEqual(
      programWidgetStatusKey("u1", "act", range),
    );
    // Module and user still separate entries.
    expect(programWidgetStatusKey("u1", "act", range)).not.toEqual(
      programWidgetStatusKey("u1", "cbt", range),
    );
  });

  it("maps the small RPC response without fetching histories", async () => {
    const rpc = jest.fn().mockResolvedValue({
      data: [{ task_key: "setGoals", done: true }],
      error: null,
    });
    mockRequireSupabase.mockReturnValue({ rpc } as unknown as ReturnType<typeof requireSupabase>);

    await expect(
      getProgramWidgetTaskStatus(
        "cbt",
        "2026-07-12T21:00:00.000Z",
        "2026-07-13T21:00:00.000Z",
        "2026-07-13",
      ),
    ).resolves.toEqual([{ taskKey: "setGoals", done: true }]);
    expect(rpc).toHaveBeenCalledWith("program_widget_task_status", {
      p_module: "cbt",
      p_day_start: "2026-07-12T21:00:00.000Z",
      p_day_end: "2026-07-13T21:00:00.000Z",
      p_day_key: "2026-07-13",
    });
  });

  it("surfaces RPC failures", async () => {
    const rpc = jest.fn().mockResolvedValue({ data: null, error: { code: "42501" } });
    mockRequireSupabase.mockReturnValue({ rpc } as unknown as ReturnType<typeof requireSupabase>);

    await expect(
      getProgramWidgetTaskStatus("act", "start", "end", "2026-07-13"),
    ).rejects.toMatchObject({
      code: "42501",
    });
  });
});
