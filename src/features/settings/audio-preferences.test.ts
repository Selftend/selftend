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
      // A live voice, not a retired texture: "ocean-swell" stood here until #1745,
      // when the mapper began resolving retired ids, so it stopped passing through.
      breath_sound_id: "guided-male",
      ambient_sound_id: "rain",
      breath_volume: 0.4,
      ambient_volume: 0.9,
      haptic_cues: true,
    };
    const maybeSingle = jest.fn().mockResolvedValue({ data: row, error: null });
    const eq = jest.fn(() => ({ maybeSingle }));
    const select = jest.fn(() => ({ eq }));
    const from = jest.fn(() => ({ select }));
    mockRequireSupabase.mockReturnValue({ from } as unknown as ReturnType<typeof requireSupabase>);

    const prefs = await getUserPreferences("user-1");
    expect(prefs.breathSoundId).toBe("guided-male");
    expect(prefs.ambientSoundId).toBe("rain");
    expect(prefs.breathVolume).toBe(0.4);
    expect(prefs.ambientVolume).toBe(0.9);
    expect(prefs.hapticCues).toBe(true);
  });

  it("resolves a stored id the catalog no longer has to `none`, on read, for both lanes", async () => {
    // ☠️ Both columns are plain text with no CHECK, and shipped clients may still
    // write a retired id, so the database is allowed to hold `wind` forever. The
    // mapper is the ONE place that turns it into something every consumer can look
    // up (#1745) - the sheet, the runner and the session all read this shape.
    const row = {
      user_id: "user-1",
      breath_sound_id: "wind",
      ambient_sound_id: "not-a-bed",
    };
    const maybeSingle = jest.fn().mockResolvedValue({ data: row, error: null });
    const eq = jest.fn(() => ({ maybeSingle }));
    const select = jest.fn(() => ({ eq }));
    const from = jest.fn(() => ({ select }));
    mockRequireSupabase.mockReturnValue({ from } as unknown as ReturnType<typeof requireSupabase>);

    const prefs = await getUserPreferences("user-1");
    expect(prefs.breathSoundId).toBe("none");
    expect(prefs.ambientSoundId).toBe("none");
  });

  it("maps and resolves the sit's own bed pair, apart from the breathing pair (#1742)", async () => {
    // Two columns of their own: rain for breathing must not become rain under a sit.
    const row = {
      user_id: "user-1",
      ambient_sound_id: "rain",
      ambient_volume: 0.9,
      meditation_ambient_sound_id: "ocean",
      meditation_ambient_volume: 0.2,
    };
    const maybeSingle = jest.fn().mockResolvedValue({ data: row, error: null });
    const eq = jest.fn(() => ({ maybeSingle }));
    const select = jest.fn(() => ({ eq }));
    const from = jest.fn(() => ({ select }));
    mockRequireSupabase.mockReturnValue({ from } as unknown as ReturnType<typeof requireSupabase>);

    const prefs = await getUserPreferences("user-1");
    expect(prefs.ambientSoundId).toBe("rain");
    expect(prefs.meditationAmbientSoundId).toBe("ocean");
    expect(prefs.meditationAmbientVolume).toBe(0.2);

    // Same catalog, same resolver: a bed the catalog lacks reads as `none`.
    maybeSingle.mockResolvedValue({
      data: { user_id: "user-1", meditation_ambient_sound_id: "not-a-bed" },
      error: null,
    });
    const resolved = await getUserPreferences("user-1");
    expect(resolved.meditationAmbientSoundId).toBe("none");
    expect(resolved.meditationAmbientVolume).toBe(defaultUserPreferences.meditationAmbientVolume);
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
    // The sit's default is silence - the same `none` a fresh row would hold.
    expect(prefs.meditationAmbientSoundId).toBe("none");
    // And the tap is off (#1741): a null column, like a fresh row's false, is off.
    expect(prefs.hapticCues).toBe(false);
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
      meditationAmbientSoundId: "forest",
      meditationAmbientVolume: 0.35,
      hapticCues: true,
    });

    expect(upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        breath_sound_id: "soft-breath",
        ambient_volume: 0.25,
        meditation_ambient_sound_id: "forest",
        meditation_ambient_volume: 0.35,
        haptic_cues: true,
      }),
      { onConflict: "user_id" },
    );
  });
});
