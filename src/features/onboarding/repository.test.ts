import { applyWidgetRecommendations } from "@/src/features/onboarding/repository";
import { requireSupabase } from "@/src/lib/supabase";

jest.mock("@/src/lib/supabase", () => ({ requireSupabase: jest.fn() }));

const mockRequireSupabase = jest.mocked(requireSupabase);

describe("applyWidgetRecommendations", () => {
  beforeEach(() => jest.clearAllMocks());

  it("sends one transactional RPC request", async () => {
    const rpc = jest.fn().mockResolvedValue({ error: null });
    mockRequireSupabase.mockReturnValue({ rpc } as unknown as ReturnType<typeof requireSupabase>);

    await applyWidgetRecommendations({
      widgetIds: ["mood-checkin", "act-programme"],
      selectedConcerns: ["stress-overwhelm"],
      completionMode: "finish",
    });

    expect(rpc).toHaveBeenCalledWith("apply_widget_recommendations", {
      p_widget_ids: ["mood-checkin", "act-programme"],
      p_selected_concerns: ["stress-overwhelm"],
      p_completion_mode: "finish",
    });
  });

  it("surfaces RPC failures", async () => {
    const rpc = jest.fn().mockResolvedValue({ error: { code: "42501" } });
    mockRequireSupabase.mockReturnValue({ rpc } as unknown as ReturnType<typeof requireSupabase>);

    await expect(
      applyWidgetRecommendations({
        widgetIds: [],
        selectedConcerns: null,
        completionMode: "skip",
      }),
    ).rejects.toMatchObject({ code: "42501" });
  });
});
