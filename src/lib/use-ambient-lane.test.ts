/**
 * What the hook hands the lane, and - the load-bearing half - what it does NOT.
 *
 * ☠️ The swap effect deliberately has NO cleanup (#2484, `docs/sound.md` §4). A
 * cleanup would make every bed change a `stop()` immediately followed by a `play()`,
 * which is the cut the lane's crossfade exists to remove - and nothing downstream
 * would notice, because the lane crossfades correctly either way and the screens mock
 * the lane out. So the absence is pinned here, where re-adding the line fails a test
 * rather than quietly putting the cut back.
 *
 * The lane itself is mocked: its ramps are `lane-player.test.ts`'s business.
 */
import { renderHook } from "@testing-library/react-native";

import { ambientSoundLookup } from "@/src/constants/breathing-sounds";
import { useAmbientLane } from "@/src/lib/use-ambient-lane";

const mockLane = {
  play: jest.fn().mockResolvedValue(undefined),
  setVolume: jest.fn().mockResolvedValue(undefined),
  stop: jest.fn().mockResolvedValue(undefined),
};
jest.mock("@/src/lib/lane-player", () => ({
  createLanePlayer: () => mockLane,
}));

const rain = ambientSoundLookup.rain;
const ocean = ambientSoundLookup.ocean;

beforeEach(() => {
  mockLane.play.mockClear();
  mockLane.setVolume.mockClear();
  mockLane.stop.mockClear();
});

describe("useAmbientLane", () => {
  it("plays the chosen bed with the length its loop window is cut from", () => {
    renderHook(() => useAmbientLane({ active: true, soundId: "rain", volume: 0.4 }));
    expect(mockLane.play).toHaveBeenCalledTimes(1);
    expect(mockLane.play).toHaveBeenCalledWith(rain.asset, 0.4, true, rain.nominalSeconds);
  });

  it("hands a bed change straight to the lane as a second play(), with no stop() between", () => {
    // ☠️ THE CROSSFADE DEPENDS ON THIS. A `return () => void lane.stop()` on the swap
    // effect would put a stop() here, the lane would have nothing left to hold at
    // level, and the swap would go back to being a cut with a hole in it.
    const { rerender } = renderHook(
      ({ soundId }: { soundId: string }) => useAmbientLane({ active: true, soundId, volume: 0.4 }),
      { initialProps: { soundId: "rain" } },
    );
    mockLane.play.mockClear();

    rerender({ soundId: "ocean" });
    expect(mockLane.play).toHaveBeenCalledTimes(1);
    expect(mockLane.play).toHaveBeenCalledWith(ocean.asset, 0.4, true, ocean.nominalSeconds);
    expect(mockLane.stop).not.toHaveBeenCalled();
  });

  it("stops when the session goes inactive, and plays again when it comes back", () => {
    const { rerender } = renderHook(
      ({ active }: { active: boolean }) => useAmbientLane({ active, soundId: "rain", volume: 0.4 }),
      { initialProps: { active: true } },
    );
    mockLane.play.mockClear();

    // Pause: the one place a bed change is NOT what is happening, and the branch that
    // covers what the removed cleanup used to.
    rerender({ active: false });
    expect(mockLane.stop).toHaveBeenCalledTimes(1);
    expect(mockLane.play).not.toHaveBeenCalled();

    rerender({ active: true });
    expect(mockLane.play).toHaveBeenCalledTimes(1);
  });

  it("stops on unmount, so leaving the screen mid-session fades rather than cuts", () => {
    const { unmount } = renderHook(() =>
      useAmbientLane({ active: true, soundId: "rain", volume: 0.4 }),
    );
    expect(mockLane.stop).not.toHaveBeenCalled();
    unmount();
    expect(mockLane.stop).toHaveBeenCalledTimes(1);
  });

  it("plays nothing for `none`, or for a stored id the catalogue does not have", () => {
    renderHook(() => useAmbientLane({ active: true, soundId: "none", volume: 0.4 }));
    renderHook(() => useAmbientLane({ active: true, soundId: "constructor", volume: 0.4 }));
    expect(mockLane.play).not.toHaveBeenCalled();
    expect(mockLane.stop).toHaveBeenCalledTimes(2);
  });

  it("plays a bed whose asset is a URL string, which is what `require()` gives on web", () => {
    // ☠️ Metro's web export turns `require("…/rain.m4a")` into the served path, not a
    // registry number (checked in the production bundle, 2026-09-25). A guard on
    // `typeof asset === "number"` therefore skipped every bed on web, silently, and
    // the rest of this file never saw it because jest-expo hands back numbers.
    const row = ambientSoundLookup.rain as { asset: unknown };
    const original = row.asset;
    row.asset = "/assets/assets/sounds/breathing/rain.0123456789abcdef.m4a";
    try {
      renderHook(() => useAmbientLane({ active: true, soundId: "rain", volume: 0.4 }));
      expect(mockLane.play).toHaveBeenCalledWith(row.asset, 0.4, true, rain.nominalSeconds);
    } finally {
      row.asset = original;
    }
  });

  it("takes a volume change live, without restarting playback", () => {
    const { rerender } = renderHook(
      ({ volume }: { volume: number }) => useAmbientLane({ active: true, soundId: "rain", volume }),
      { initialProps: { volume: 0.4 } },
    );
    mockLane.play.mockClear();

    rerender({ volume: 0.9 });
    expect(mockLane.setVolume).toHaveBeenLastCalledWith(0.9);
    expect(mockLane.play).not.toHaveBeenCalled();
    expect(mockLane.stop).not.toHaveBeenCalled();
  });
});
