import { getUserPreferences, updateUserPreferences } from "@/src/features/settings/repository";
import { defaultUserPreferences } from "@/src/features/modules/types";
import { requireSupabase } from "@/src/lib/supabase";

jest.mock("@/src/lib/supabase", () => ({ requireSupabase: jest.fn() }));
const mockRequireSupabase = jest.mocked(requireSupabase);

describe("audio preferences plumbing", () => {
  beforeEach(() => jest.clearAllMocks());

  it("maps the audio columns from a row", async () => {
    const row = {
      user_id: "user-1",
      breath_sound_id: "ocean-swell",
      ambient_sound_id: "rain",
      breath_volume: 0.4,
      ambient_volume: 0.9,
    };
    const maybeSingle = jest.fn().mockResolvedValue({ data: row, error: null });
    const eq = jest.fn(() => ({ maybeSingle }));
    const select = jest.fn(() => ({ eq }));
    const from = jest.fn(() => ({ select }));
    mockRequireSupabase.mockReturnValue({ from } as unknown as ReturnType<typeof requireSupabase>);

    const prefs = await getUserPreferences("user-1");
    expect(prefs.breathSoundId).toBe("ocean-swell");
    expect(prefs.ambientSoundId).toBe("rain");
    expect(prefs.breathVolume).toBe(0.4);
    expect(prefs.ambientVolume).toBe(0.9);
  });

  it("falls back to defaults when the columns are null", async () => {
    const maybeSingle = jest.fn().mockResolvedValue({ data: { user_id: "u" }, error: null });
    const eq = jest.fn(() => ({ maybeSingle }));
    const select = jest.fn(() => ({ eq }));
    const from = jest.fn(() => ({ select }));
    mockRequireSupabase.mockReturnValue({ from } as unknown as ReturnType<typeof requireSupabase>);

    const prefs = await getUserPreferences("u");
    expect(prefs.breathSoundId).toBe(defaultUserPreferences.breathSoundId);
    expect(prefs.breathVolume).toBe(defaultUserPreferences.breathVolume);
  });

  it("includes the audio columns in the update payload", async () => {
    const single = jest.fn().mockResolvedValue({ data: { user_id: "u" }, error: null });
    const selectAfter = jest.fn(() => ({ single }));
    const upsert = jest.fn(() => ({ select: selectAfter }));
    const from = jest.fn(() => ({ upsert }));
    mockRequireSupabase.mockReturnValue({ from } as unknown as ReturnType<typeof requireSupabase>);

    await updateUserPreferences("u", {
      ...defaultUserPreferences,
      breathSoundId: "soft-breath",
      ambientVolume: 0.25,
    });

    expect(upsert).toHaveBeenCalledWith(
      expect.objectContaining({ breath_sound_id: "soft-breath", ambient_volume: 0.25 }),
      { onConflict: "user_id" },
    );
  });
});
